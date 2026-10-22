require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const LESSON_CHECKLISTS = require('./lesson-checklists');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway injects DATABASE_URL automatically once a Postgres plugin is
// attached to this service. Railway's internal connections don't need SSL,
// but connecting from outside Railway (e.g. your own machine) usually does,
// so we turn it on unless we're clearly on localhost.
const isLocalDb = (process.env.DATABASE_URL || '').includes('localhost');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

// Railway's edge terminates HTTPS and forwards plain HTTP to the app, so we
// need "trust proxy" for express-session to correctly mark cookies secure.
app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET) {
  console.warn(
    'Warning: SESSION_SECRET is not set. Using a random in-memory secret, ' +
    'which means everyone gets logged out whenever the server restarts. ' +
    'Set SESSION_SECRET as a Railway variable to avoid that.'
  );
}

if (!process.env.GROQ_API_KEY) {
  console.warn(
    'Warning: GROQ_API_KEY is not set. /api/chat will return an error ' +
    'until it is added to your environment variables.'
  );
}

// The persona for every reply the tutor gives, no matter which lesson the
// question came from. Keep this in one place so the tone stays consistent
// across the whole app instead of drifting lesson by lesson.
const TUTOR_SYSTEM_INSTRUCTION = `
You are the ThreatTalk tutor — a friendly, patient cybersecurity guide built
into the ThreatTalk app. Your job is to help the learner understand security
topics, not to test or compete with them.

- Keep answers short and conversational — a few sentences, not an essay.
  You're replying inside a chat bubble, not writing documentation.
- Be encouraging. If the learner seems confused, reassure them it's a
  common question before explaining.
- Only answer questions about cybersecurity and online safety (passwords,
  phishing, MFA, data protection, safe browsing, scams, etc.). If asked
  about something unrelated, gently redirect back to security topics.
- Avoid jargon where a plain explanation works just as well; define a term
  briefly the first time you use it.
- Never ask the learner for real passwords, account details, or other
  sensitive personal information.
`.trim();

app.use(express.json());

app.use(
  session({
    name: 'threattalk.sid',
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: 'auto', // honors the proxy, so this becomes Secure in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login.html');
}

// Gate the signed-in pages behind a session check. These routes are
// declared before express.static below, so they take priority over the
// static files of the same name for GET requests.
['home.html', 'learn.html', 'profile.html'].forEach((page) => {
  app.get('/' + page, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, page));
  });
});

app.use(express.static(__dirname));

app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body || {};

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [firstName.trim(), lastName.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];

    // Same generic message whether the email doesn't exist or the password
    // is wrong, so we don't reveal which emails have accounts.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    };

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/logout', (req, res) => {
  if (!req.session) {
    return res.status(200).json({ success: true });
  }
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
    res.clearCookie('threattalk.sid');
    return res.status(200).json({ success: true });
  });
});

// Lets the dashboard (or anything else) ask who's currently logged in.
app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  return res.status(200).json({ user: req.session.user });
});

// Lets the lesson-chat page fetch a topic's concept checklist — the same
// data the tutor uses below — so the on-page progress panel and the AI's
// instructions can never drift out of sync with each other.
app.get('/api/checklist/:slug', (req, res) => {
  const topic = LESSON_CHECKLISTS[req.params.slug];
  if (!topic) {
    return res.status(404).json({ error: 'Unknown topic.' });
  }
  return res.status(200).json({
    title: topic.title,
    concepts: topic.concepts.map((c) => ({ id: c.id, label: c.label })),
  });
});

// Builds the extra system message that turns the tutor into a guide for a
// specific lesson's checklist, and tells it how to self-report progress.
// Returns null when the topic isn't recognized (free-form question, no
// checklist to track).
function buildGuideInstruction(topicSlug, topicTitle) {
  const topic = LESSON_CHECKLISTS[topicSlug];
  if (!topic) return null;

  const checklistBlock = topic.concepts.map((c) => `- ${c.id}: ${c.label}`).join('\n');

  return `
You are guiding the learner through the "${topic.title}" lesson. Over the
course of this conversation, make sure the learner ends up understanding
each of the concepts below — weave them in naturally as the conversation
goes, don't just read them off as a list. The learner already saw a short
written overview of this topic before the conversation started, so you
don't need to re-explain everything up front; build on what they ask, and
once things settle, gently steer back toward whichever concepts below
haven't come up yet.

Concepts for this lesson:
${checklistBlock}

At the very end of your reply — after everything the learner should see —
add one hidden tracking line in exactly this format:
<<COVERAGE: id1, id2>>
List every concept id above that has been adequately covered by the
conversation so far, counting earlier turns too, not just this message.
Only include an id once the learner has actually been walked through it,
not just had it mentioned in passing. If nothing qualifies yet, write
<<COVERAGE:>>. This line is stripped out before the learner sees your
reply, so never mention it or refer to it in the visible part of your
answer.
`.trim();
}

// Pulls the <<COVERAGE: ...>> marker (see buildGuideInstruction above) off
// the end of a raw model reply, returning the cleaned, learner-facing text
// plus the list of concept ids it reported. If the model forgot the
// marker, the full reply is kept as-is and coverage comes back empty.
function extractCoverage(rawReply) {
  const match = rawReply.match(/<<COVERAGE:\s*([^>]*)>>\s*$/i);
  if (!match) {
    return { reply: rawReply.trim(), coverage: [] };
  }
  const coverage = match[1]
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const reply = rawReply.slice(0, match.index).trim();
  return { reply, coverage };
}

// The tutor chatbot. Takes the learner's message, optionally which lesson
// topic it was asked from, and the conversation so far (so the AI can
// guide a multi-turn lesson instead of answering each question cold).
// When the topic matches a checklist in lesson-checklists.js, the tutor
// also self-reports which concepts it believes have been covered.
app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'The tutor is not configured yet.' });
    }

    const { message, topicTitle, topicSlug, history } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Ask me something first!' });
    }

    const guideInstruction = topicSlug ? buildGuideInstruction(topicSlug, topicTitle) : null;

    const userMessage = !guideInstruction && topicTitle
      ? `[Learner is on the "${topicTitle}" lesson]\n${message.trim()}`
      : message.trim();

    // The client keeps the running conversation and resends it each turn —
    // nothing is stored server-side. Trim it defensively in case something
    // sends more than expected.
    const historyMessages = Array.isArray(history)
      ? history
          .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
          .slice(-20)
          .map((turn) => ({ role: turn.role, content: turn.content }))
      : [];

    const messages = [{ role: 'system', content: TUTOR_SYSTEM_INSTRUCTION }];
    if (guideInstruction) {
      messages.push({ role: 'system', content: guideInstruction });
    }
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API error:', response.status, errorBody);
      return res.status(502).json({ error: "Couldn't reach the tutor right now. Try again in a bit." });
    }

    const data = await response.json();
    const rawReply = data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!rawReply) {
      return res.status(502).json({ error: "Didn't get a response back — try asking again." });
    }

    const { reply, coverage } = guideInstruction
      ? extractCoverage(rawReply)
      : { reply: rawReply.trim(), coverage: [] };

    return res.status(200).json({ reply, coverage });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`ThreatTalk server listening on port ${PORT}`);
});

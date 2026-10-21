require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

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
['home.html', 'learn.html'].forEach((page) => {
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

// The tutor chatbot. Takes a single question (optionally with which topic
// it was asked from) and returns one reply from Groq, using the shared
// persona above. No conversation history is sent yet — each question is
// answered on its own — which is enough for the current chat UI, but is
// the first thing to revisit once multi-turn follow-ups matter.
app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'The tutor is not configured yet.' });
    }

    const { message, topicTitle } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Ask me something first!' });
    }

    const userMessage = topicTitle
      ? `[Learner is on the "${topicTitle}" lesson]\n${message.trim()}`
      : message.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: TUTOR_SYSTEM_INSTRUCTION },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API error:', response.status, errorBody);
      return res.status(502).json({ error: "Couldn't reach the tutor right now. Try again in a bit." });
    }

    const data = await response.json();
    const reply = data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!reply) {
      return res.status(502).json({ error: "Didn't get a response back — try asking again." });
    }

    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`ThreatTalk server listening on port ${PORT}`);
});

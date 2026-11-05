// Password Security — topic chat page.
//
// After the static intro card below, the AI takes over as a guide: it's
// told (server-side, see /api/chat in index.js) which concepts this topic's
// checklist covers, and asked to self-report which ones it's covered after
// every reply. This file tracks that running conversation and renders the
// checklist panel.
//
// NOTE: the in-lesson concept checklist below (coveredIds) still persists to
// localStorage, not the backend — it's a smaller, separate feature from
// lesson *completion*, which now lives in Postgres (see GET /api/progress
// and the "Take Quiz" button state at the bottom of this file). Worth
// moving the checklist server-side too at some point, just not done yet.
(function () {
  var COVERAGE_STORAGE_PREFIX = 'threattalk:coverage:';

  var TOPICS = {
    'strong-passwords': {
      title: 'Creating Strong Passwords',
      userQuestion: 'What makes a strong password?',
      bot: {
        icon: '🔒',
        heading: 'Password Security Best Practices',
        sections: [
          {
            heading: 'Creating a Strong Password',
            items: [
              'At least 12–16 characters long',
              'Mix of uppercase, lowercase, numbers, and symbols',
              'Avoid personal information (birthdays, names, etc.)',
              "Don't use dictionary words",
              'Use unique passwords for each account',
            ],
          },
          {
            heading: 'Password Management Tips',
            items: [
              'Use a password manager to store passwords securely',
              'Enable multi-factor authentication (MFA) whenever possible',
              'Change passwords immediately if you suspect a breach',
              'Never share passwords via email or messaging apps',
              "Don't write passwords on sticky notes or documents",
            ],
          },
        ],
        example: {
          label: 'Example of a strong password pattern:',
          text: 'Instead of "Password123!", try a passphrase like "Coffee!Morning@2026$Blue"',
        },
        closing: 'Remember: Length + Complexity + Uniqueness = Strong Password!',
      },
    },

    'managers-mfa': {
      title: 'Password Managers & MFA',
      userQuestion: 'Why do I need a password manager if I can just remember my passwords?',
      bot: {
        icon: '🔑',
        heading: 'Password Managers & Multi-Factor Authentication',
        sections: [
          {
            heading: 'Why Reusing Passwords Is Risky',
            items: [
              'One leaked password can unlock every account that reuses it',
              'Breached credentials get tested against other sites automatically',
              "Memorable passwords are usually guessable passwords",
            ],
          },
          {
            heading: 'What a Password Manager Gives You',
            items: [
              'A unique, random password for every account',
              'Nothing to remember except one master password',
              'Autofill that only works on the real site — a defense against lookalike phishing pages',
            ],
          },
          {
            heading: 'Why Add MFA on Top',
            items: [
              'A second factor (app code, security key) stops a stolen password from being enough',
              'Prefer an authenticator app or security key over SMS codes when it is offered',
            ],
          },
        ],
        closing: 'Think of it as two layers: a manager for unique passwords, MFA as the backup if one ever leaks.',
      },
    },

    'after-a-breach': {
      title: 'Responding to a Breach',
      userQuestion: 'What should I do if I think one of my accounts was hacked?',
      bot: {
        icon: '🚨',
        heading: 'Responding to a Suspected Breach',
        sections: [
          {
            heading: 'Do This First',
            items: [
              'Change the password on the affected account immediately',
              'Change it anywhere else you reused it, too',
              'Turn on MFA if it was not already enabled',
              'Check account activity/login history for anything unfamiliar',
            ],
          },
          {
            heading: 'Then Follow Up',
            items: [
              'Sign out of all active sessions/devices if the account allows it',
              'Watch linked accounts (email, financial) for anything unusual',
              'Report it to IT or Security if this is a work account',
            ],
          },
        ],
        closing: "Speed matters more than anything else here — don't wait to see if it's actually a problem.",
      },
    },
  };

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('topic') || 'strong-passwords';
  var topic = TOPICS[slug] || TOPICS['strong-passwords'];

  var titleEl = document.getElementById('chat-topic-title');
  var threadEl = document.getElementById('chat-thread');
  var composerEl = document.getElementById('chat-composer');
  var inputEl = document.getElementById('chat-input');
  var completeBtn = document.getElementById('complete-button');
  var checklistEl = document.getElementById('chat-checklist');

  if (titleEl) {
    titleEl.textContent = topic.title;
  }

  // ---- Checklist panel + coverage tracking ----
  var coverageStorageKey = COVERAGE_STORAGE_PREFIX + slug;
  var checklistConcepts = []; // [{id, label}], loaded from /api/checklist/<slug>
  var coveredIds = loadCoveredIds();
  var conversationHistory = []; // [{role: 'user'|'assistant', content}]

  function loadCoveredIds() {
    if (!window.localStorage) return [];
    try {
      var raw = localStorage.getItem(coverageStorageKey);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCoveredIds() {
    if (!window.localStorage) return;
    localStorage.setItem(coverageStorageKey, JSON.stringify(coveredIds));
  }

  function mergeCoverage(newIds) {
    if (!Array.isArray(newIds) || !newIds.length) return;
    var changed = false;
    newIds.forEach(function (id) {
      if (coveredIds.indexOf(id) === -1) {
        coveredIds.push(id);
        changed = true;
      }
    });
    if (changed) {
      saveCoveredIds();
      renderChecklist();
    }
  }

  function renderChecklist() {
    if (!checklistEl || !checklistConcepts.length) return;
    checklistEl.innerHTML = '';

    checklistConcepts.forEach(function (concept) {
      var done = coveredIds.indexOf(concept.id) !== -1;

      var item = document.createElement('span');
      item.className = 'chat-checklist-item' + (done ? ' chat-checklist-item--done' : '');

      var dot = document.createElement('span');
      dot.className = 'chat-checklist-dot';
      dot.setAttribute('aria-hidden', 'true');
      if (done) {
        dot.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24"><path d="M4 12.5l5 5 11-11" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      item.appendChild(dot);

      var label = document.createElement('span');
      label.textContent = concept.label;
      item.appendChild(label);

      checklistEl.appendChild(item);
    });

    var allDone = checklistConcepts.every(function (concept) {
      return coveredIds.indexOf(concept.id) !== -1;
    });

    var note = checklistEl.querySelector('.chat-checklist-complete');
    if (allDone && !note) {
      note = document.createElement('p');
      note.className = 'chat-checklist-complete';
      note.textContent = "You've covered everything in this lesson.";
      checklistEl.appendChild(note);
    } else if (allDone && note) {
      checklistEl.appendChild(note);
    }
  }

  function loadChecklist() {
    if (!checklistEl) return;
    fetch('/api/checklist/' + encodeURIComponent(slug))
      .then(function (response) {
        if (!response.ok) throw new Error('No checklist for this topic');
        return response.json();
      })
      .then(function (data) {
        checklistConcepts = (data && data.concepts) || [];
        renderChecklist();
      })
      .catch(function () {
        // No checklist defined for this topic yet — hide the panel instead
        // of showing an empty strip.
        checklistEl.hidden = true;
      });
  }

  loadChecklist();

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function appendUserMessage(text) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--user';

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--user';
    bubble.textContent = text;

    var time = document.createElement('span');
    time.className = 'chat-timestamp';
    time.textContent = timestamp();
    bubble.appendChild(time);

    row.appendChild(bubble);
    threadEl.appendChild(row);
  }

  function buildBotCard(bot) {
    var card = document.createElement('div');
    card.className = 'chat-bubble chat-bubble--bot';

    var heading = document.createElement('p');
    heading.className = 'chat-bot-heading';
    heading.textContent = (bot.icon ? bot.icon + ' ' : '') + bot.heading;
    card.appendChild(heading);

    (bot.sections || []).forEach(function (section) {
      var sectionHeading = document.createElement('p');
      sectionHeading.className = 'chat-bot-section-heading';
      sectionHeading.textContent = section.heading;
      card.appendChild(sectionHeading);

      var list = document.createElement('ul');
      list.className = 'chat-bot-list';
      section.items.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      card.appendChild(list);
    });

    if (bot.example) {
      var exampleLabel = document.createElement('p');
      exampleLabel.className = 'chat-bot-section-heading';
      exampleLabel.textContent = bot.example.label;
      card.appendChild(exampleLabel);

      var exampleText = document.createElement('p');
      exampleText.className = 'chat-bot-example';
      exampleText.textContent = bot.example.text;
      card.appendChild(exampleText);
    }

    if (bot.closing) {
      var closing = document.createElement('p');
      closing.className = 'chat-bot-closing';
      closing.textContent = bot.closing;
      card.appendChild(closing);
    }

    var time = document.createElement('span');
    time.className = 'chat-timestamp';
    time.textContent = timestamp();
    card.appendChild(time);

    return card;
  }

  function appendBotCard(bot) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--bot';

    var avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    row.appendChild(avatar);
    row.appendChild(buildBotCard(bot));
    threadEl.appendChild(row);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // The AI's replies come back as plain text with markdown-ish formatting
  // (the system prompt asks for blank-line paragraphs, "-" lists, and
  // occasional **bold**). Rendered with plain textContent, none of that
  // survives — line breaks collapse under normal CSS white-space and the
  // markdown punctuation shows up literally, so the whole reply reads as
  // one run-on sentence. This turns that text into real <p>/<ul>/<strong>
  // markup instead, HTML-escaping first so nothing in the reply can inject
  // markup of its own.
  function renderReplyHtml(text) {
    var escaped = escapeHtml(text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    var blocks = escaped.split(/\n\s*\n/);

    return blocks
      .map(function (block) {
        var lines = block.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
        if (!lines.length) return '';

        var isBulleted = lines.every(function (line) { return /^[-*]\s+/.test(line); });
        var isNumbered = lines.every(function (line) { return /^\d+[.)]\s+/.test(line); });

        if (isBulleted) {
          return '<ul>' + lines.map(function (line) {
            return '<li>' + line.replace(/^[-*]\s+/, '') + '</li>';
          }).join('') + '</ul>';
        }
        if (isNumbered) {
          return '<ol>' + lines.map(function (line) {
            return '<li>' + line.replace(/^\d+[.)]\s+/, '') + '</li>';
          }).join('') + '</ol>';
        }
        return '<p>' + lines.join('<br>') + '</p>';
      })
      .join('');
  }

  function appendBotPlainReply(text) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--bot';

    var avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    var card = document.createElement('div');
    card.className = 'chat-bubble chat-bubble--bot';

    var reply = document.createElement('div');
    reply.className = 'chat-bot-reply';
    reply.innerHTML = renderReplyHtml(text);
    card.appendChild(reply);

    var time = document.createElement('span');
    time.className = 'chat-timestamp';
    time.textContent = timestamp();
    card.appendChild(time);

    row.appendChild(avatar);
    row.appendChild(card);
    threadEl.appendChild(row);
  }

  function scrollToBottom() {
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  // Seed the conversation with the bot's opening message for this topic —
  // no fake user question shown anymore, the lesson just starts talking.
  appendBotCard(topic.bot);
  scrollToBottom();

  // Shows a lightweight "thinking…" bubble while we wait on the API, so the
  // chat doesn't look frozen. Returns a function that removes it again.
  function showTypingIndicator() {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--bot';

    var avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--bot chat-bubble--typing';
    bubble.textContent = 'Thinking…';

    row.appendChild(avatar);
    row.appendChild(bubble);
    threadEl.appendChild(row);
    scrollToBottom();

    return function removeTypingIndicator() {
      row.remove();
    };
  }

  // ---- Quick scenarios ----
  // Every SCENARIO_EVERY messages the learner sends, the tutor throws in a
  // short "what would you do?" card with a countdown, built server-side from
  // this lesson + the recent chat (POST /api/scenario/generate in index.js).
  // Answers are checked on the server, which also awards the points.
  var SCENARIO_EVERY = 3;
  var userTurns = 0; // real messages the learner has sent (not the auto kickoff)
  var scenarioActive = false;

  function maybeOfferScenario() {
    userTurns += 1;
    if (userTurns % SCENARIO_EVERY !== 0 || scenarioActive) return;
    scenarioActive = true;

    fetch('/api/scenario/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicSlug: slug, history: conversationHistory }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('no scenario');
        return response.json();
      })
      .then(renderScenarioCard)
      .catch(function () {
        // Scenarios are a bonus — if one can't be built, the chat just carries on.
        scenarioActive = false;
      });
  }

  function renderScenarioCard(data) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--bot';

    var avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    var card = document.createElement('div');
    card.className = 'chat-bubble chat-bubble--bot scenario-card';

    var topRow = document.createElement('div');
    topRow.className = 'scenario-top';
    var eyebrow = document.createElement('p');
    eyebrow.className = 'scenario-eyebrow';
    eyebrow.textContent = '⚡ Quick scenario';
    var clock = document.createElement('span');
    clock.className = 'scenario-clock';
    topRow.appendChild(eyebrow);
    topRow.appendChild(clock);

    var timer = document.createElement('div');
    timer.className = 'scenario-timer';
    var timerFill = document.createElement('div');
    timerFill.className = 'scenario-timer-fill';
    timer.appendChild(timerFill);

    var text = document.createElement('p');
    text.className = 'scenario-text';
    text.textContent = data.scenario;

    var optionsEl = document.createElement('div');
    optionsEl.className = 'scenario-options';

    var resultEl = document.createElement('div');
    resultEl.className = 'scenario-result';
    resultEl.hidden = true;

    var buttons = data.options.map(function (label, index) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scenario-option';
      btn.textContent = label;
      btn.addEventListener('click', function () { submit(index); });
      optionsEl.appendChild(btn);
      return btn;
    });

    card.appendChild(topRow);
    card.appendChild(timer);
    card.appendChild(text);
    card.appendChild(optionsEl);
    card.appendChild(resultEl);
    row.appendChild(avatar);
    row.appendChild(card);
    threadEl.appendChild(row);
    scrollToBottom();

    var totalMs = (data.timeLimitSeconds || 45) * 1000;
    var startedAt = Date.now();
    var finished = false;

    function tick() {
      var left = Math.max(0, totalMs - (Date.now() - startedAt));
      var secs = Math.ceil(left / 1000);
      clock.textContent = '0:' + (secs < 10 ? '0' : '') + secs;
      timerFill.style.width = (left / totalMs * 100) + '%';
      card.classList.toggle('scenario-card--urgent', left <= 10000);
      if (left <= 0) submit(null);
    }
    var interval = setInterval(tick, 250);
    tick();

    function submit(choiceIndex) {
      if (finished) return;
      finished = true;
      clearInterval(interval);
      buttons.forEach(function (b) { b.disabled = true; });
      timerFill.style.width = '0%';

      fetch('/api/scenario/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id, choiceIndex: choiceIndex }),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('answer failed');
          return response.json();
        })
        .then(function (result) {
          showResult(choiceIndex, result);
        })
        .catch(function () {
          resultEl.hidden = false;
          resultEl.textContent = "Couldn't check that one — the scenario may have expired. Carry on with the lesson!";
          scenarioActive = false;
        });
    }

    function showResult(choiceIndex, result) {
      buttons[result.correctIndex].classList.add('scenario-option--correct');
      if (!result.correct && choiceIndex !== null && buttons[choiceIndex]) {
        buttons[choiceIndex].classList.add('scenario-option--wrong');
      }

      var verdict = result.timedOut ? "⏱ Time's up!" : (result.correct ? '✅ Correct!' : '❌ Not quite.');
      resultEl.hidden = false;
      resultEl.className = 'scenario-result ' + (result.correct ? 'scenario-result--good' : 'scenario-result--bad');
      resultEl.innerHTML = '';
      var v = document.createElement('p');
      v.className = 'scenario-verdict';
      v.textContent = verdict + (result.pointsAwarded ? '  +' + result.pointsAwarded + ' points' : '');
      var why = document.createElement('p');
      why.className = 'scenario-why';
      why.textContent = result.explanation;
      resultEl.appendChild(v);
      resultEl.appendChild(why);
      scrollToBottom();

      // Let the tutor know how it went, so the rest of the conversation can build on it.
      var chosenText = choiceIndex !== null && data.options[choiceIndex] ? '"' + data.options[choiceIndex] + '"' : 'nothing (ran out of time)';
      conversationHistory.push({
        role: 'assistant',
        content: '[Quick scenario] ' + data.scenario + ' The learner chose ' + chosenText + ' — ' +
          (result.timedOut ? 'timed out' : (result.correct ? 'correct' : 'incorrect')) + '. ' + result.explanation,
      });

      scenarioActive = false;
    }
  }

  // Calls the real tutor endpoint (see /api/chat in index.js). The whole
  // system-instruction/persona setup lives server-side; this just sends the
  // running conversation + which topic/checklist we're on, and applies
  // whatever coverage the tutor reports back.
  function sendToAssistant(userText) {
    var hideTyping = showTypingIndicator();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        topicTitle: topic.title,
        topicSlug: slug,
        history: conversationHistory,
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error((data && data.error) || 'Request failed');
          }
          return data;
        });
      })
      .then(function (data) {
        hideTyping();
        appendBotPlainReply(data.reply);
        scrollToBottom();

        conversationHistory.push({ role: 'user', content: userText });
        conversationHistory.push({ role: 'assistant', content: data.reply });

        mergeCoverage(data.coverage);
        maybeOfferScenario();
      })
      .catch(function () {
        hideTyping();
        appendBotPlainReply(
          "Sorry, I couldn't get an answer just now — mind trying again in a moment?"
        );
        scrollToBottom();
      });
  }

  if (composerEl) {
    composerEl.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = inputEl.value.trim();
      if (!text) return;

      appendUserMessage(text);
      inputEl.value = '';
      scrollToBottom();
      sendToAssistant(text);
    });
  }

  // Kick the guided conversation off automatically once the checklist is
  // known, so the AI leads instead of waiting on the learner to type first.
  // The kickoff message itself is never shown — only the AI's reply is.
  function startGuidedConversation() {
    var hideTyping = showTypingIndicator();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "I'm ready — let's go through this lesson.",
        topicTitle: topic.title,
        topicSlug: slug,
        history: conversationHistory,
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error((data && data.error) || 'Request failed');
          }
          return data;
        });
      })
      .then(function (data) {
        hideTyping();
        appendBotPlainReply(data.reply);
        scrollToBottom();

        conversationHistory.push({ role: 'user', content: "I'm ready — let's go through this lesson." });
        conversationHistory.push({ role: 'assistant', content: data.reply });

        mergeCoverage(data.coverage);
      })
      .catch(function () {
        hideTyping();
        appendBotPlainReply(
          "Sorry, I couldn't get started just now — try sending a message to kick things off."
        );
        scrollToBottom();
      });
  }

  startGuidedConversation();

  // Completion state now comes from the backend (GET /api/progress). The
  // lesson itself is no longer marked complete from in here: that happens
  // on first finishing this lesson's quiz (see quiz.js / POST
  // /api/quiz/submit). This button just reflects that state and sends the
  // learner to take the quiz.
  if (completeBtn) {
    function renderCompleteState(isComplete) {
      completeBtn.textContent = isComplete ? 'Completed ✓' : 'Take Quiz';
      completeBtn.classList.toggle('chat-complete-btn--done', isComplete);
    }
    renderCompleteState(false);

    fetch('/api/progress')
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (data) {
        var topic = data && data.topics && data.topics[slug];
        if (topic && topic.completed) renderCompleteState(true);
      })
      .catch(function () {
        // Not logged in, or the request failed — button stays "Take Quiz".
      });

    completeBtn.addEventListener('click', function () {
      window.location.href = 'quiz.html?topic=' + encodeURIComponent(slug);
    });
  }
})();

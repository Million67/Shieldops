// Password Security — topic chat page.
//
// There's no AI wired up yet, so each topic starts with one scripted
// exchange (a stand-in for what the real tutor will eventually generate).
// Typing in the composer still works — it just gets a canned "not live yet"
// reply instead of a real answer. Swap `sendToAssistant` for a real
// `/api/chat` call once that endpoint exists; nothing else here should need
// to change.
(function () {
  var STORAGE_PREFIX = 'threattalk:topic:';

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

    'strong-passwords': {
      title: 'Creating Stronger Passwords',
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

  if (titleEl) {
    titleEl.textContent = topic.title;
  }

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

  function appendBotPlainReply(text) {
    appendBotCard({ heading: '', sections: [], closing: text });
    // A plain reply has no heading — hide the empty heading line.
    var lastBubble = threadEl.querySelector('.chat-row--bot:last-child .chat-bubble--bot');
    if (lastBubble) {
      var heading = lastBubble.querySelector('.chat-bot-heading');
      if (heading) heading.remove();
    }
  }

  function scrollToBottom() {
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  // Seed the conversation with the scripted exchange for this topic.
  appendUserMessage(topic.userQuestion);
  appendBotCard(topic.bot);
  scrollToBottom();

  // Placeholder for the real AI call — see note at top of file.
  function sendToAssistant(userText) {
    appendBotPlainReply(
      "I can't answer live questions yet — the AI tutor isn't connected in this beta. " +
      'For now, take a look at the topic above, and check back soon!'
    );
    scrollToBottom();
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

  // Completion state — stored locally for now (no progress table yet).
  if (completeBtn) {
    var storageKey = STORAGE_PREFIX + slug;
    var isComplete = window.localStorage && localStorage.getItem(storageKey) === 'completed';

    function renderCompleteState() {
      completeBtn.textContent = isComplete ? 'Completed ✓' : 'Mark complete';
      completeBtn.classList.toggle('chat-complete-btn--done', isComplete);
    }
    renderCompleteState();

    completeBtn.addEventListener('click', function () {
      isComplete = !isComplete;
      if (window.localStorage) {
        if (isComplete) {
          localStorage.setItem(storageKey, 'completed');
        } else {
          localStorage.removeItem(storageKey);
        }
      }
      renderCompleteState();
    });
  }
})();

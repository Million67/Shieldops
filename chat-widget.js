// Floating chat bubble for learn.html — a pop-up version of the tutor that
// answers any cybersecurity question without leaving the page. It builds its
// own DOM, talks to the same POST /api/chat the lesson chats use (no topic,
// so it's a free-form conversation), and keeps the running conversation in
// memory only — closing the pop-up keeps it, reloading the page clears it.
(function () {
  var history = []; // { role: 'user' | 'assistant', content }
  var sending = false;

  var root = document.createElement('div');
  root.className = 'fchat';
  root.innerHTML =
    '<section class="fchat-panel" id="fchat-panel" role="dialog" aria-label="Security tutor chat" hidden>' +
      '<header class="fchat-head">' +
        '<span class="fchat-head-avatar" aria-hidden="true"></span>' +
        '<div class="fchat-head-text">' +
          '<p class="fchat-title">ThreatTalk Tutor</p>' +
          '<p class="fchat-sub">Ask me anything about staying safe online</p>' +
        '</div>' +
        '<button class="fchat-close" type="button" id="fchat-close" aria-label="Close chat">&times;</button>' +
      '</header>' +
      '<div class="fchat-messages" id="fchat-messages" aria-live="polite"></div>' +
      '<form class="fchat-form" id="fchat-form" autocomplete="off">' +
        '<input class="fchat-input" id="fchat-input" type="text" placeholder="Ask a security question…" aria-label="Your question" maxlength="1000">' +
        '<button class="fchat-send" id="fchat-send" type="submit">Send</button>' +
      '</form>' +
    '</section>' +
    '<button class="fchat-bubble" type="button" id="fchat-bubble" aria-label="Open chat with the security tutor" aria-expanded="false" aria-controls="fchat-panel"></button>';
  document.body.appendChild(root);

  var panel = document.getElementById('fchat-panel');
  var bubble = document.getElementById('fchat-bubble');
  var closeBtn = document.getElementById('fchat-close');
  var messagesEl = document.getElementById('fchat-messages');
  var form = document.getElementById('fchat-form');
  var input = document.getElementById('fchat-input');
  var sendBtn = document.getElementById('fchat-send');

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Same lightweight formatting as lesson-chat.js: paragraphs, "-" / "1." lists, **bold**.
  function renderReplyHtml(text) {
    var escaped = escapeHtml(text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // A list that starts right after a sentence (no blank line) still becomes a list.
    escaped = escaped.replace(/([^\n])\n(?=[-*]\s|\d+[.)]\s)/g, '$1\n\n');
    return escaped.split(/\n\s*\n/).map(function (block) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return '';
      if (lines.every(function (l) { return /^[-*]\s+/.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + l.replace(/^[-*]\s+/, '') + '</li>'; }).join('') + '</ul>';
      }
      if (lines.every(function (l) { return /^\d+[.)]\s+/.test(l); })) {
        return '<ol>' + lines.map(function (l) { return '<li>' + l.replace(/^\d+[.)]\s+/, '') + '</li>'; }).join('') + '</ol>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'fchat-msg fchat-msg--' + (role === 'user' ? 'user' : 'bot');
    if (role === 'user') {
      el.textContent = text;
    } else {
      el.innerHTML = renderReplyHtml(text);
    }
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function open() {
    panel.hidden = false;
    bubble.setAttribute('aria-expanded', 'true');
    bubble.classList.add('fchat-bubble--open');
    input.focus();
  }

  function close() {
    panel.hidden = true;
    bubble.setAttribute('aria-expanded', 'false');
    bubble.classList.remove('fchat-bubble--open');
    bubble.focus();
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || sending) return;

    sending = true;
    sendBtn.disabled = true;
    addMessage('user', text);
    var typing = addMessage('bot', '…');
    typing.classList.add('fchat-msg--typing');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history })
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        typing.remove();
        if (result.ok && result.data.reply) {
          history.push({ role: 'user', content: text });
          history.push({ role: 'assistant', content: result.data.reply });
          addMessage('bot', result.data.reply);
        } else {
          var err = addMessage('bot', result.data.error || 'Something went wrong. Please try again.');
          err.classList.add('fchat-msg--error');
        }
      })
      .catch(function () {
        typing.remove();
        var err = addMessage('bot', 'Could not reach the tutor. Check your connection and try again.');
        err.classList.add('fchat-msg--error');
      })
      .then(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // Greeting shown once, the first time the pop-up exists.
  addMessage('bot', "Hi! I'm your security tutor. Ask me about passwords, phishing, scams, MFA — anything about staying safe online.");

  bubble.addEventListener('click', function () {
    if (panel.hidden) open(); else close();
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) close();
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value;
    input.value = '';
    send(text);
  });

  // The "Ask about phishing, passwords…" box at the bottom of learn.html used
  // to just reload the page — now it hands the question to this pop-up.
  var pageComposer = document.querySelector('.dashboard-composer');
  if (pageComposer) {
    pageComposer.addEventListener('submit', function (event) {
      event.preventDefault();
      var field = pageComposer.querySelector('input[name="prompt"]');
      var text = field ? field.value.trim() : '';
      if (!text) { open(); return; }
      field.value = '';
      open();
      send(text);
    });
  }
})();

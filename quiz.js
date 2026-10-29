(function () {
  // Beta: a short, fixed 3-question quiz, hardcoded here rather than pulled
  // from an API — there's a real backend now (see index.js), but it stores
  // attempts/scores, not question content itself yet. Each question carries
  // an "explanation" used for the end-of-quiz debrief on any question the
  // learner missed. Once an answer is submitted the learner moves forward
  // only — there is no "back" affordance anywhere in this file, by design.
  // Point values aren't surfaced to the learner during the quiz itself,
  // only in the exit-early warning below.
  //
  // NOTE: the question bank below is the same for every lesson right now —
  // there's only one quiz written so far, covering password strength, MFA,
  // and breach response. The title and subtitle are already wired to the
  // lesson the learner came from; once there's a question bank per lesson,
  // key QUESTIONS off `slug` the same way TOPIC_TITLES is keyed below.

  // Mirrors the titles in lesson-chat.js's TOPICS map — kept small and
  // separate here since quiz.html doesn't load that file's bot-script content.
  var TOPIC_TITLES = {
    "strong-passwords": "Creating Strong Passwords",
    "managers-mfa": "Password Managers & MFA",
    "after-a-breach": "Responding to a Breach"
  };

  var params = new URLSearchParams(window.location.search);
  var slug = params.get("topic");
  var lessonTitle = TOPIC_TITLES[slug] || "Security Awareness";
  // Only send "Back to Learn" into the module grid when we actually know
  // which module this quiz came from; otherwise fall back to Learn itself.
  var backUrl = TOPIC_TITLES[slug] ? "password-security.html" : "learn.html";

  var QUESTIONS = [
    {
      prompt: "Which of the following is the strongest password?",
      options: [
        "Password123",
        "123456789",
        "Blue!Tiger#Moon82",
        "YourName2024"
      ],
      correctIndex: 2,
      explanation: "Blue!Tiger#Moon82 mixes uppercase, lowercase, numbers, and symbols without relying on a dictionary word or personal info — that unpredictability is what makes it hard to crack. The others are either common patterns attackers try first or built from guessable personal details."
    },
    {
      prompt: "What is the main purpose of Multi-Factor Authentication (MFA)?",
      options: [
        "To replace the need for a password entirely",
        "To add an extra layer of security by requiring more than one type of verification",
        "To speed up the login process",
        "To let you share your account safely with others"
      ],
      correctIndex: 1,
      explanation: "MFA doesn't replace your password — it adds a second proof of identity, like a code from your phone or a security key, so a stolen password alone isn't enough for someone to get in."
    },
    {
      prompt: "What should you do if you receive a notification that your personal information was exposed in a data breach?",
      options: [
        "Ignore it — breaches happen all the time",
        "Wait a few months to see if anything bad happens before acting",
        "Delete the affected account and never use that service again",
        "Change affected passwords, enable MFA, and monitor your accounts for suspicious activity"
      ],
      correctIndex: 3,
      explanation: "Speed matters most here: change the password (and anywhere else you reused it), turn on MFA if it wasn't already on, and keep an eye on your accounts for anything unusual. Waiting or ignoring it just gives an attacker more time to use your exposed info."
    }
  ];

  var card = document.getElementById("quiz-card");
  if (!card) return; // this script is only wired up on quiz.html

  var bannerTitleEl = document.getElementById("quiz-banner-title");
  var subtitleEl = document.getElementById("quiz-subtitle");
  if (bannerTitleEl) bannerTitleEl.textContent = lessonTitle + " Quiz";
  if (subtitleEl) subtitleEl.textContent = lessonTitle;

  var progressLabelEl = document.getElementById("quiz-progress-label");
  var progressFillEl = document.getElementById("quiz-progress-fill");
  var questionEl = document.getElementById("quiz-question");
  var optionsEl = document.getElementById("quiz-options");
  var submitBtn = document.getElementById("quiz-submit-btn");
  var exitLink = document.getElementById("quiz-exit-link");

  var exitModal = document.getElementById("quiz-exit-modal");
  var exitCancelBtn = document.getElementById("quiz-exit-cancel-btn");
  var exitConfirmBtn = document.getElementById("quiz-exit-confirm-btn");

  var current = 0; // index of the question currently on screen
  var selected = null; // index of the option the learner has picked
  var answered = false; // true once this question's answer has been locked in
  var quizComplete = false; // true once the debrief screen is showing
  var results = []; // { prompt, options, correctIndex, selectedIndex, correct, explanation }

  function renderQuestion() {
    var q = QUESTIONS[current];
    selected = null;
    answered = false;

    progressLabelEl.textContent = "Question " + (current + 1) + "/" + QUESTIONS.length;
    progressFillEl.style.width = ((current + 1) / QUESTIONS.length * 100) + "%";

    questionEl.textContent = q.prompt;

    optionsEl.innerHTML = "";
    q.options.forEach(function (optionText, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = optionText;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.addEventListener("click", function () {
        if (answered) return; // locked in — no changing your answer after submit
        selected = index;
        Array.prototype.forEach.call(optionsEl.children, function (el, i) {
          el.classList.toggle("quiz-option--selected", i === index);
          el.setAttribute("aria-checked", i === index ? "true" : "false");
        });
        submitBtn.disabled = false;
      });
      optionsEl.appendChild(btn);
    });

    submitBtn.disabled = true;
    submitBtn.textContent = "Submit Answer";
  }

  function lockInAnswer() {
    var q = QUESTIONS[current];
    answered = true;

    var isCorrect = selected === q.correctIndex;
    results.push({
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: selected,
      correct: isCorrect,
      explanation: q.explanation
    });

    Array.prototype.forEach.call(optionsEl.children, function (el, i) {
      el.disabled = true;
      if (i === q.correctIndex) {
        el.classList.add("quiz-option--correct");
      } else if (i === selected) {
        el.classList.add("quiz-option--incorrect");
      }
    });

    submitBtn.textContent = current === QUESTIONS.length - 1 ? "Finish Quiz" : "Next Question";
  }

  function advance() {
    if (current < QUESTIONS.length - 1) {
      current += 1;
      renderQuestion();
    } else {
      renderComplete();
    }
  }

  function renderComplete() {
    quizComplete = true;

    var missed = results.filter(function (r) { return !r.correct; });
    var correctCount = results.length - missed.length;

    // Persist this attempt to the backend (see POST /api/quiz/submit in
    // index.js). Beta only has this one quiz — every lesson's "Take Quiz"
    // button leads here, so finishing it marks every lesson complete at
    // once server-side, not just the one the learner came from. Points,
    // the quizzes hub's "Last score," and the profile page's Risk Awareness
    // Score all come from this on their next read, so there's nothing to
    // wait on here — if it fails (not logged in, network hiccup), the
    // debrief below still shows; the attempt just won't be reflected
    // elsewhere this time.
    fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctCount: correctCount, questionCount: results.length })
    }).catch(function () {});

    var html =
      '<div class="quiz-complete">' +
        '<p class="quiz-complete-icon" aria-hidden="true">' + (missed.length === 0 ? "✅" : "📋") + '</p>' +
        '<h1 class="quiz-complete-title">' + (missed.length === 0 ? "Nice work!" : "Quiz complete") + '</h1>' +
        '<p class="quiz-complete-text">You got ' + correctCount + ' of ' + results.length + ' right.</p>' +
      '</div>';

    if (missed.length > 0) {
      html += '<div class="quiz-debrief">' +
        '<p class="quiz-debrief-heading">Let’s go over what you missed</p>';
      missed.forEach(function (r) {
        html +=
          '<div class="quiz-debrief-item">' +
            '<p class="quiz-debrief-question">' + escapeHtml(r.prompt) + '</p>' +
            '<p class="quiz-debrief-answer quiz-debrief-answer--wrong">Your answer: ' + escapeHtml(r.options[r.selectedIndex]) + '</p>' +
            '<p class="quiz-debrief-answer quiz-debrief-answer--right">Correct answer: ' + escapeHtml(r.options[r.correctIndex]) + '</p>' +
            '<p class="quiz-debrief-explanation">' + escapeHtml(r.explanation) + '</p>' +
          '</div>';
      });
      html += '</div>';
    }

    html += '<div class="quiz-complete-actions">' +
      '<a class="btn-pill quiz-complete-btn" href="' + backUrl + '">Back to Learn</a>' +
    '</div>';

    card.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  submitBtn.addEventListener("click", function () {
    if (selected === null) return;
    if (!answered) {
      lockInAnswer();
    } else {
      advance();
    }
  });

  // Exiting mid-quiz loses progress and docks the learner's risk awareness
  // score (see POST /api/quiz/exit) — warn before leaving.
  exitLink.addEventListener("click", function (event) {
    if (quizComplete) return; // quiz is done, nothing to lose — let it navigate normally
    event.preventDefault();
    exitModal.hidden = false;
  });

  exitCancelBtn.addEventListener("click", function () {
    exitModal.hidden = true;
  });

  exitConfirmBtn.addEventListener("click", function () {
    var destination = exitLink.href;
    // Record the exit before leaving, but don't make them wait on it —
    // navigate either way (not logged in / a network hiccup shouldn't trap
    // them on the quiz page).
    fetch("/api/quiz/exit", { method: "POST" })
      .catch(function () {})
      .then(function () {
        window.location.href = destination;
      });
  });

  exitModal.addEventListener("click", function (event) {
    if (event.target === exitModal) exitModal.hidden = true; // click on the backdrop
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !exitModal.hidden) exitModal.hidden = true;
  });

  renderQuestion();
})();

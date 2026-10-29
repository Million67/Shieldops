(function () {
  // Each lesson has its own 5-question quiz, hardcoded here rather than
  // pulled from an API — there's a real backend (see index.js), but it
  // stores attempts/scores per lesson, not question content itself. Each
  // question carries an "explanation" used for the end-of-quiz debrief on
  // any question the learner missed. Once an answer is submitted the
  // learner moves forward only — there is no "back" affordance anywhere in
  // this file, by design. Point values aren't surfaced to the learner
  // during the quiz itself, only in the exit-early warning below.

  // Mirrors the titles in lesson-chat.js's TOPICS map — kept small and
  // separate here since quiz.html doesn't load that file's bot-script content.
  var TOPIC_TITLES = {
    "strong-passwords": "Creating Strong Passwords",
    "managers-mfa": "Password Managers & MFA",
    "after-a-breach": "Responding to a Breach"
  };

  // One question bank per lesson slug — this is what makes each lesson's
  // "Take Quiz" button lead to that lesson's own quiz instead of a shared
  // one.
  var QUESTION_BANKS = {
    "strong-passwords": [
      {
        prompt: "Which of the following is the strongest password?",
        options: [
          "password2024",
          "T7#mQ9!vL2@p",
          "JohnSmith88",
          "qwerty123456"
        ],
        correctIndex: 1,
        explanation: "T7#mQ9!vL2@p mixes uppercase, lowercase, numbers, and symbols without relying on a dictionary word or personal info — that unpredictability is what makes it hard to crack. The others are either common patterns attackers try first or built from guessable personal details."
      },
      {
        prompt: "Why is it important to create a strong password?",
        options: [
          "To protect your accounts from unauthorized access",
          "To make it easier to remember",
          "To comply with a website's character limit",
          "To speed up the login process"
        ],
        correctIndex: 0,
        explanation: "A strong password is the main thing standing between an attacker and your account — a weak one can be guessed or cracked quickly, giving someone unauthorized access to whatever that account protects."
      },
      {
        prompt: "Which of the following should you avoid when creating a password?",
        options: [
          "Using a mix of symbols and numbers",
          "Using your name or birthday",
          "Making it longer than 12 characters",
          "Using a password manager to store it"
        ],
        correctIndex: 1,
        explanation: "Personal details like your name or birthday are often publicly known or easy to guess, so attackers try them first. A strong password should avoid anything tied to your identity."
      },
      {
        prompt: "What is the recommended minimum length for a strong password when creating one yourself?",
        options: [
          "6 characters",
          "8 characters",
          "15 characters",
          "20 characters"
        ],
        correctIndex: 2,
        explanation: "Shorter passwords are far faster for modern cracking tools to guess through. Aiming for at least 15 characters gives you a much larger margin of safety."
      },
      {
        prompt: "True or False: Using the same strong password for multiple accounts is a safe practice.",
        options: [
          "True",
          "False"
        ],
        correctIndex: 1,
        explanation: "Even a strong password becomes a liability once it's reused — if any one of those accounts is breached, every other account using that same password is exposed too."
      }
    ],
    "managers-mfa": [
      {
        prompt: "What is the main purpose of a password manager?",
        options: [
          "To securely store and manage passwords",
          "To generate usernames automatically",
          "To block phishing emails",
          "To speed up your internet connection"
        ],
        correctIndex: 0,
        explanation: "A password manager securely stores every password you use so you don't have to remember or reuse them — it can also generate strong, unique ones for each account."
      },
      {
        prompt: "What does Multi-Factor Authentication (MFA) do?",
        options: [
          "Replaces the need for a password entirely",
          "Adds an extra layer of security by requiring multiple forms of verification",
          "Automatically changes your password every month",
          "Lets multiple people share one login safely"
        ],
        correctIndex: 1,
        explanation: "MFA doesn't replace your password — it adds a second proof of identity, like a code from your phone or a security key, so a stolen password alone isn't enough for someone to get in."
      },
      {
        prompt: "Which of the following is an example of MFA?",
        options: [
          "Using the same password on two different sites",
          "Entering your password and a code from an authenticator app",
          "Writing your password on a sticky note",
          "Using a longer password"
        ],
        correctIndex: 1,
        explanation: "MFA means combining something you know (your password) with something you have (like a code from an authenticator app) — a second, independent factor that a stolen password alone can't satisfy."
      },
      {
        prompt: "What is one major benefit of using a password manager?",
        options: [
          "It allows you to use strong, unique passwords without memorizing each one",
          "It lets you skip creating passwords altogether",
          "It automatically logs you into any website",
          "It shares your passwords with trusted friends for backup"
        ],
        correctIndex: 0,
        explanation: "Password managers remove the tradeoff between strong and memorable — it generates and stores a unique, complex password for every account so you never have to recall them yourself."
      },
      {
        prompt: "True or False: Multi-Factor Authentication can help protect your account even if someone steals your password.",
        options: [
          "True",
          "False"
        ],
        correctIndex: 0,
        explanation: "That's exactly the point of MFA — even with your password in hand, an attacker still needs the second factor (like your phone or security key) to actually get in."
      }
    ],
    "after-a-breach": [
      {
        prompt: "What should you do first if you suspect your account has been hacked?",
        options: [
          "Wait and see if anything else happens",
          "Secure your account by changing your password using a trusted device",
          "Delete the account immediately",
          "Post about it on social media to warn others"
        ],
        correctIndex: 1,
        explanation: "Changing your password right away, from a device you trust, cuts off the attacker's access as quickly as possible — every minute spent waiting is time they can keep using the account."
      },
      {
        prompt: "Why is it important to report a security breach immediately?",
        options: [
          "To prevent further damage and protect sensitive information",
          "Because it's required by most websites' terms of service",
          "To get a refund from the company",
          "Because breaches rarely cause real harm"
        ],
        correctIndex: 0,
        explanation: "Reporting quickly lets the affected service lock down accounts and investigate before more damage is done — delaying gives an attacker more time to cause harm."
      },
      {
        prompt: "What should you do if you receive a notification that your password was exposed in a data breach?",
        options: [
          "Ignore it since the company will handle it",
          "Change the exposed password and any other accounts using it",
          "Wait a few weeks before taking action",
          "Only change the password if you notice something wrong"
        ],
        correctIndex: 1,
        explanation: "Speed matters most here: change the exposed password and anywhere else you reused it. Waiting or assuming it'll be handled for you just gives an attacker more time to use it."
      },
      {
        prompt: "What should you do if you notice suspicious activity on your online account?",
        options: [
          "Review recent account activity, secure your account, and report the suspicious activity",
          "Clear your browser history and hope it resolves itself",
          "Immediately delete all your accounts",
          "Share your login with a friend to double-check"
        ],
        correctIndex: 0,
        explanation: "Checking recent activity tells you what actually happened, securing the account (new password, MFA) stops further access, and reporting it gets the service's help containing the issue."
      },
      {
        prompt: "True or False: After a security breach, enabling Multi-Factor Authentication (MFA) can help prevent future unauthorized access.",
        options: [
          "True",
          "False"
        ],
        correctIndex: 0,
        explanation: "MFA adds a second factor beyond just the password, so even if a password leaks again in the future, that alone won't be enough to get into the account."
      }
    ]
  };

  var params = new URLSearchParams(window.location.search);
  var slug = params.get("topic");
  var lessonTitle = TOPIC_TITLES[slug] || "Security Awareness";
  // Only send "Back to Learn" into the module grid when we actually know
  // which module this quiz came from; otherwise fall back to Learn itself.
  var backUrl = TOPIC_TITLES[slug] ? "password-security.html" : "learn.html";

  var QUESTIONS = QUESTION_BANKS[slug] || QUESTION_BANKS["strong-passwords"];

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
    // index.js) — marks only this one lesson (`slug`) complete server-side,
    // not the others. Points, this lesson's "Last score" on the quiz hub,
    // and the profile page's Risk Awareness Score all come from this on
    // their next read, so there's nothing to wait on here — if it fails
    // (not logged in, network hiccup), the debrief below still shows; the
    // attempt just won't be reflected elsewhere this time.
    fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicSlug: slug, correctCount: correctCount, questionCount: results.length })
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

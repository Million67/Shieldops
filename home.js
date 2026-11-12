// Home page — status badges, the "Get started" banner, and the "Recent
// activity" card. All of it comes from the real backend (GET /api/progress
// in index.js). If the request fails — not logged in, or a network hiccup —
// everything just stays at its day-one placeholder state instead of erroring.
(function () {
  // Mirrors TOPIC_TITLES in quiz.js / lesson-chat.js — kept small and
  // separate here since home.html doesn't load those files.
  var TOPIC_TITLES = {
    'strong-passwords': 'Creating Strong Passwords',
    'managers-mfa': 'Password Managers & MFA',
    'after-a-breach': 'Responding to a Breach'
  };

  // The three lessons, in the order they're recommended.
  var LESSONS = [
    { slug: 'strong-passwords', icon: '🧱', title: 'Creating Strong Passwords',
      text: 'What actually makes a password hard to crack — length, complexity, and avoiding the obvious.' },
    { slug: 'managers-mfa', icon: '🔑', title: 'Password Managers & MFA',
      text: 'Why reusing passwords is risky, and how a password manager plus MFA closes the gap.' },
    { slug: 'after-a-breach', icon: '🚨', title: 'Responding to a Breach',
      text: 'What to do first if you think an account or password has been compromised.' }
  ];

  // One tip per day, rotating through this list by calendar date.
  var TIPS = [
    { title: 'Never reuse a password', text: 'If one site is breached, attackers try the same password everywhere else. A unique password for each account keeps one leak from becoming many.' },
    { title: 'Longer beats trickier', text: 'A long passphrase of 15 or more characters is much harder to crack than a short password full of symbols.' },
    { title: 'Turn on MFA', text: 'A second step at sign-in means a stolen password alone is not enough to get into your account.' },
    { title: 'Let a manager remember for you', text: 'A password manager creates and stores a different strong password for every site, so you only remember one.' },
    { title: 'Keep personal details out', text: 'Names, birthdays and pet names are easy to find online. Attackers try them first.' },
    { title: 'Change it right after a breach', text: 'If a service tells you it was breached, change that password now, and change it anywhere else you used it.' },
    { title: 'Check the sender before you click', text: 'A message that makes you panic or rush is a warning sign. Go to the site yourself instead of using the link.' },
    { title: 'Never share a verification code', text: 'No real company will ask you to read out a one-time code. Anyone who does is trying to get into your account.' }
  ];

  var recEyebrowEl = document.getElementById('recommended-eyebrow');
  var recTitleEl = document.getElementById('recommended-title');
  var recTextEl = document.getElementById('recommended-text');
  var recCtaEl = document.getElementById('recommended-cta');
  var recCardEl = document.getElementById('recommended-card');
  var tipTitleEl = document.getElementById('tip-title');
  var tipTextEl = document.getElementById('tip-text');

  // Picks the first lesson that isn't completed yet. If every lesson is done,
  // suggests retaking a quiz instead.
  function renderRecommended(topics) {
    if (!recCardEl) return;
    topics = topics || {};

    var next = null;
    for (var i = 0; i < LESSONS.length; i++) {
      if (!(topics[LESSONS[i].slug] && topics[LESSONS[i].slug].completed)) { next = LESSONS[i]; break; }
    }

    if (next) {
      var started = LESSONS.some(function (l) { return topics[l.slug] && topics[l.slug].completed; });
      recEyebrowEl.textContent = started ? 'Recommended next' : 'Start here';
      recTitleEl.textContent = next.icon + ' ' + next.title;
      recTextEl.textContent = next.text;
      recCtaEl.textContent = 'Start lesson →';
      recCardEl.href = 'password-security-topic.html?topic=' + next.slug;
    } else {
      recEyebrowEl.textContent = 'Keep it fresh';
      recTitleEl.textContent = '🎉 Retake a quiz';
      recTextEl.textContent = "You've finished every lesson. Retaking a quiz keeps your Risk Awareness Score sharp.";
      recCtaEl.textContent = 'Go to quizzes →';
      recCardEl.href = 'quizzes.html';
    }
  }

  // Same tip all day, a new one tomorrow (based on the visitor's local date).
  function renderTip() {
    if (!tipTitleEl || !tipTextEl) return;
    var now = new Date();
    var dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    var tip = TIPS[dayNumber % TIPS.length];
    tipTitleEl.textContent = '💡 ' + tip.title;
    tipTextEl.textContent = tip.text;
  }

  renderTip();

  var bannerIconEl = document.getElementById('home-banner-icon');
  var bannerEyebrowEl = document.getElementById('home-banner-eyebrow');
  var bannerTitleEl = document.getElementById('home-banner-title');
  var bannerCtaEl = document.getElementById('home-banner-cta');
  var activityListEl = document.getElementById('activity-list');

  function renderBanner(stats) {
    var topicsCompleted = stats.topicsCompleted || 0;
    var totalTopics = stats.totalTopics || 0;

    if (topicsCompleted === 0) return; // leave the default "Get started" state as-is

    if (totalTopics > 0 && topicsCompleted >= totalTopics) {
      bannerIconEl.textContent = '🎉';
      bannerEyebrowEl.textContent = 'Nice work';
      bannerTitleEl.textContent = "You've completed every lesson — retake a quiz anytime to keep your score fresh.";
      bannerCtaEl.textContent = 'Retake a quiz';
      bannerCtaEl.href = 'quizzes.html';
    } else {
      // Each lesson has its own quiz now, so this partial-progress state is
      // reachable — e.g. 1 of 3 lessons done, 2 still to go.
      bannerIconEl.textContent = '🔐';
      bannerEyebrowEl.textContent = 'Keep going';
      bannerTitleEl.textContent = "You've completed " + topicsCompleted + ' of ' + totalTopics + ' lessons — keep going.';
      bannerCtaEl.textContent = 'Continue learning';
      bannerCtaEl.href = 'learn.html';
    }
  }

  function renderActivity(entries) {
    if (!entries || entries.length === 0) return; // leave the default "Nothing here yet" state as-is

    activityListEl.innerHTML = '';
    entries.forEach(function (entry) {
      var allCorrect = entry.correct === entry.total;
      var lessonName = TOPIC_TITLES[entry.topicSlug] || 'Security Awareness';
      var row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML =
        '<span class="activity-row-icon" aria-hidden="true">' + (allCorrect ? '✅' : '📝') + '</span>' +
        '<div>' +
          '<p class="activity-row-title">' + escapeHtml(lessonName) + ' quiz — ' + entry.correct + '/' + entry.total + ' correct</p>' +
          '<p class="activity-row-date">' + formatDate(entry.createdAt) + '</p>' +
        '</div>';
      activityListEl.appendChild(row);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  fetch('/api/progress')
    .then(function (response) {
      if (!response.ok) throw new Error('progress request failed');
      return response.json();
    })
    .then(function (data) {
      document.querySelectorAll('[data-status-for]').forEach(function (badge) {
        var slug = badge.getAttribute('data-status-for');
        var topic = data.topics && data.topics[slug];
        if (topic && topic.completed) {
          badge.textContent = 'Completed';
          badge.classList.add('status-badge--complete');
        }
      });

      renderBanner(data.stats || {});
      renderActivity(data.recentActivity || []);
      renderRecommended(data.topics);
    })
    .catch(function () {
      // Not logged in, or the request failed — everything stays as-is.
    });
})();

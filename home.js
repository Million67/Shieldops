// Home page — status badges, the "Get started" banner, and the "Recent
// activity" card. All of it comes from the real backend (GET /api/progress
// in index.js). If the request fails — not logged in, or a network hiccup —
// everything just stays at its day-one placeholder state instead of erroring.
(function () {
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
      // Beta note: the one shared quiz marks every lesson complete at once,
      // so this "all done" state is the one a learner actually reaches today.
      bannerIconEl.textContent = '🎉';
      bannerEyebrowEl.textContent = 'Nice work';
      bannerTitleEl.textContent = "You've completed every lesson — retake a quiz anytime to keep your score fresh.";
      bannerCtaEl.textContent = 'Retake a quiz';
      bannerCtaEl.href = 'quizzes.html';
    } else {
      // Not reachable yet in the beta (completion is all-or-nothing), but
      // kept correct for whenever lessons unlock their own quizzes.
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
      var row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML =
        '<span class="activity-row-icon" aria-hidden="true">' + (allCorrect ? '✅' : '📝') + '</span>' +
        '<div>' +
          '<p class="activity-row-title">Quiz completed — ' + entry.correct + '/' + entry.total + ' correct</p>' +
          '<p class="activity-row-date">' + formatDate(entry.createdAt) + '</p>' +
        '</div>';
      activityListEl.appendChild(row);
    });
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
    })
    .catch(function () {
      // Not logged in, or the request failed — everything stays as-is.
    });
})();

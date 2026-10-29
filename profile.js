// Profile page — stats, Risk Awareness Score, and the "Topics Covered" list.
//
// All of it now comes from the real backend (GET /api/progress in
// index.js) — points, quizzes/topics completed, and the Risk Awareness
// Score (see the formula comment on that route). If the request fails —
// not logged in, or a network hiccup — everything just stays at its
// "no data yet" placeholder state instead of erroring.
(function () {
  var pointsEl = document.querySelector('[data-stat="points"]');
  var quizzesEl = document.querySelector('[data-stat="quizzes"]');
  var topicsEl = document.querySelector('[data-stat="topics"]');
  var scoreLabelEl = document.querySelector('[data-stat="risk-score-label"]');
  var scoreFillEl = document.querySelector('[data-stat="risk-score-fill"]');

  fetch('/api/progress')
    .then(function (response) {
      if (!response.ok) throw new Error('progress request failed');
      return response.json();
    })
    .then(function (data) {
      var stats = data.stats || {};

      if (pointsEl) pointsEl.textContent = stats.points != null ? stats.points : '—';
      if (quizzesEl) quizzesEl.textContent = stats.quizzesCompleted != null ? stats.quizzesCompleted : '—';
      if (topicsEl) {
        topicsEl.textContent =
          stats.topicsCompleted != null && stats.totalTopics != null
            ? stats.topicsCompleted + '/' + stats.totalTopics
            : '—';
      }

      var hasRiskScore = stats.riskScore != null;
      if (scoreLabelEl) scoreLabelEl.textContent = hasRiskScore ? stats.riskScore + '/100' : '—/100';
      if (scoreFillEl) scoreFillEl.style.width = (hasRiskScore ? stats.riskScore : 0) + '%';

      document.querySelectorAll('[data-status-for]').forEach(function (badge) {
        var slug = badge.getAttribute('data-status-for');
        var topic = data.topics && data.topics[slug];

        if (topic && topic.completed) {
          badge.textContent = 'Completed';
          badge.classList.add('status-badge--complete');
        }
      });
    })
    .catch(function () {
      // Not logged in, or the request failed — everything stays at its
      // placeholder state.
    });
})();

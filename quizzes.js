// Quizzes hub — lists one card per lesson's quiz.
//
// Each lesson now has its own quiz, so completion and the "Last score" line
// shown on each card come from that lesson's own entry in GET /api/progress
// (topics[slug].lastScore), not a single shared score.
(function () {
  fetch('/api/progress')
    .then(function (response) {
      if (!response.ok) throw new Error('progress request failed');
      return response.json();
    })
    .then(function (data) {
      document.querySelectorAll('[data-topic]').forEach(function (card) {
        var slug = card.getAttribute('data-topic');
        var topic = data.topics && data.topics[slug];
        if (!topic || !topic.completed) return; // defaults already rendered in the HTML

        var badge = card.querySelector('[data-status-for="' + slug + '"]');
        var scoreEl = card.querySelector('[data-score-for="' + slug + '"]');
        var actionBtn = card.querySelector('[data-action-for="' + slug + '"]');

        var lastScoreText = topic.lastScore ? (topic.lastScore.correct + '/' + topic.lastScore.total) : null;

        if (badge) {
          badge.textContent = 'Completed';
          badge.classList.add('status-badge--complete');
        }
        if (scoreEl) {
          scoreEl.textContent = lastScoreText ? 'Last score: ' + lastScoreText : 'Quiz complete';
        }
        if (actionBtn) {
          actionBtn.textContent = 'Retake Quiz';
          actionBtn.classList.add('chat-complete-btn--done');
        }
      });
    })
    .catch(function () {
      // Not logged in, or the request failed — cards stay at their default
      // "Not started" markup.
    });
})();

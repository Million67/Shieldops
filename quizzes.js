// Quizzes hub — lists one card per lesson's quiz.
//
// Completion, and the last score shown on each card, now come from the real
// backend (GET /api/progress in index.js), not localStorage. Beta only has
// the one quiz, shared by every lesson (see quiz.js / POST /api/quiz/submit),
// so finishing it marks every card here complete at once and all three show
// the same last score — that's expected for now, not a bug.
(function () {
  fetch('/api/progress')
    .then(function (response) {
      if (!response.ok) throw new Error('progress request failed');
      return response.json();
    })
    .then(function (data) {
      var lastScoreText = data.lastScore ? (data.lastScore.correct + '/' + data.lastScore.total) : null;

      document.querySelectorAll('[data-topic]').forEach(function (card) {
        var slug = card.getAttribute('data-topic');
        var topic = data.topics && data.topics[slug];
        if (!topic || !topic.completed) return; // defaults already rendered in the HTML

        var badge = card.querySelector('[data-status-for="' + slug + '"]');
        var scoreEl = card.querySelector('[data-score-for="' + slug + '"]');
        var actionBtn = card.querySelector('[data-action-for="' + slug + '"]');

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

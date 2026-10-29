// Password Security — topic overview page.
//
// Completion now comes from the real backend (GET /api/progress in
// index.js), not localStorage. Each topic chat page's quiz marks it complete
// server-side; this page just reads that back and updates the badges. If
// the request fails — not logged in, or a network hiccup — the badges just
// stay at their default "Not started" markup instead of erroring.
(function () {
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
    })
    .catch(function () {
      // Not logged in, or the request failed — badges stay as-is.
    });
})();

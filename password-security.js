// Password Security — topic overview page.
//
// Completion state is stored in localStorage for now (no backend progress
// table yet). Each topic chat page sets `threattalk:topic:<slug>` to
// "completed" when the learner finishes it; this page just reads that back
// and updates the badges. Swap this for a real /api/progress call once the
// server tracks it.
(function () {
  var STORAGE_PREFIX = 'threattalk:topic:';

  document.querySelectorAll('[data-status-for]').forEach(function (badge) {
    var slug = badge.getAttribute('data-status-for');
    var isComplete = window.localStorage
      ? localStorage.getItem(STORAGE_PREFIX + slug) === 'completed'
      : false;

    if (isComplete) {
      badge.textContent = 'Completed';
      badge.classList.add('status-badge--complete');
    }
  });
})();

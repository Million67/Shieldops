// Profile page — "Topics Covered" list.
//
// Same deal as home.js and password-security.js: completion is stored in
// localStorage for now (no backend progress table yet), so this just reads
// those flags back to update the status badges. Swap for a real
// /api/progress call once the server tracks it.
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

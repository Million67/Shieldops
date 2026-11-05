(function () {
  var logoutButton = document.getElementById('logout-button');
  var titleEl = document.getElementById('dashboard-title');

  // Show the signed-in user's name once we know it (only on pages that have
  // a #dashboard-title element).
  if (titleEl) {
    fetch('/api/me')
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data && data.user && data.user.firstName) {
          titleEl.textContent = 'Welcome, ' + data.user.firstName + '!';
        }
      })
      .catch(function () {
        // If this fails, the generic "Security Learner" greeting just stays put.
      });
  }

  // Daily streak chip in the header (the 🔥). Hitting this endpoint also
  // counts today as an active day, so it runs on every signed-in page.
  var streakChipEl = document.querySelector('.streak .chip');
  if (streakChipEl) {
    fetch('/api/streak/touch', { method: 'POST' })
      .then(function (response) {
        if (!response.ok) throw new Error('streak request failed');
        return response.json();
      })
      .then(function (data) {
        var n = data && data.streak;
        if (typeof n !== 'number' || n < 1) return;
        streakChipEl.textContent = n + ' day streak';
        streakChipEl.classList.add('chip--streak');
      })
      .catch(function () {
        // Not logged in / network hiccup — the default "keep streak?" text stays.
      });
  }

  // Profile is now a standalone page link in the nav, with Logout sitting
  // next to it as its own button — no more dropdown to open/close.
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      logoutButton.disabled = true;
      logoutButton.textContent = 'Logging out…';

      fetch('/api/logout', { method: 'POST' })
        .then(function () {
          window.location.href = 'login.html';
        })
        .catch(function () {
          // Even if the request fails, there's nothing useful to do client-side
          // but try sending them to login anyway.
          window.location.href = 'login.html';
        });
    });
  }
})();

// Privacy / cookie banner — opened only via the ⓘ icon, not shown on load.
// Guarded with a null check since under-construction.html loads this same
// file but doesn't have a #privacyBanner element.
function dismissPrivacyBanner() {
  var banner = document.getElementById('privacyBanner');
  if (banner) {
    banner.classList.add('hidden');
  }
}

function togglePrivacyBanner() {
  var banner = document.getElementById('privacyBanner');
  if (banner) {
    banner.classList.remove('hidden');
  }
}

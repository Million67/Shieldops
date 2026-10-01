(function () {
  var profileButton = document.getElementById('profile-button');
  var dropdown = document.getElementById('profile-dropdown');
  var logoutButton = document.getElementById('logout-button');
  var titleEl = document.getElementById('dashboard-title');

  // Show the signed-in user's name once we know it
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

  function openDropdown() {
    dropdown.hidden = false;
    profileButton.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    dropdown.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
  }

  profileButton.addEventListener('click', function (event) {
    event.stopPropagation();
    if (dropdown.hidden) {
      openDropdown();
    } else {
      closeDropdown();
    }
  });

  // Close when clicking anywhere else on the page
  document.addEventListener('click', function (event) {
    if (!dropdown.hidden && !dropdown.contains(event.target) && event.target !== profileButton) {
      closeDropdown();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !dropdown.hidden) {
      closeDropdown();
      profileButton.focus();
    }
  });

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
})();

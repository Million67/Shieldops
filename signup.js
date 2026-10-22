(function () {
  var password = document.getElementById('password');
  var confirmPassword = document.getElementById('confirm-password');

  // Make sure the two password fields match before the form submits
  function checkPasswords() {
    var mismatch = confirmPassword.value && confirmPassword.value !== password.value;
    confirmPassword.setCustomValidity(mismatch ? 'Passwords do not match.' : '');
  }

  password.addEventListener('input', checkPasswords);
  confirmPassword.addEventListener('input', checkPasswords);

  // Submit to the signup API and hand off to the login page on success
  var form = document.getElementById('signup-form');
  var errorBox = document.getElementById('form-error');
  var submitBtn = form.querySelector('.btn-pill');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideError();
    checkPasswords();

    if (!form.reportValidity()) {
      return;
    }

    var payload = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      confirmPassword: form.confirmPassword.value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing up…';

    fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          window.location.href = 'login.html';
          return;
        }
        showError(result.data.error || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      })
      .catch(function () {
        showError('Could not reach the server. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      });
  });
})();

// Password show/hide toggles (Password + Confirm Password)
(function () {
  function wireToggle(inputId, btnId) {
    var input = document.getElementById(inputId);
    var btn = document.getElementById(btnId);
    if (!input || !btn) return;

    var showIcon = btn.querySelector('.login-eye-icon--show');
    var hideIcon = btn.querySelector('.login-eye-icon--hide');

    btn.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      if (showIcon) showIcon.style.display = isHidden ? 'none' : 'inline';
      if (hideIcon) hideIcon.style.display = isHidden ? 'inline' : 'none';
    });
  }

  wireToggle('password', 'signup-password-eye-btn');
  wireToggle('confirm-password', 'signup-confirm-eye-btn');
})();

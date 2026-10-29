(function () {
  var password = document.getElementById('password');
  var confirmPassword = document.getElementById('confirm-password');
  var requirementsList = document.getElementById('password-requirements');

  // Mirrors isPasswordStrongEnough() in index.js. This copy is just for a
  // responsive UI (the live checklist below + blocking submit early) — the
  // server runs its own check regardless, since a request could skip this
  // page entirely.
  var PASSWORD_RULES = [
    { rule: 'length', test: function (v) { return v.length >= 10; } },
    { rule: 'upper', test: function (v) { return /[A-Z]/.test(v); } },
    { rule: 'lower', test: function (v) { return /[a-z]/.test(v); } },
    { rule: 'number', test: function (v) { return /[0-9]/.test(v); } },
    { rule: 'special', test: function (v) { return /[^A-Za-z0-9]/.test(v); } }
  ];

  function isPasswordStrongEnough(value) {
    return PASSWORD_RULES.every(function (r) { return r.test(value); });
  }

  // Updates the live checklist under the password field and keeps the
  // field's own validity message in sync so form.reportValidity() catches it.
  function checkPasswordStrength() {
    var value = password.value;
    PASSWORD_RULES.forEach(function (r) {
      var item = requirementsList.querySelector('[data-rule="' + r.rule + '"]');
      if (item) item.classList.toggle('is-met', r.test(value));
    });
    password.setCustomValidity(
      value && !isPasswordStrongEnough(value)
        ? 'Password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'
        : ''
    );
  }

  // Make sure the two password fields match before the form submits
  function checkPasswords() {
    var mismatch = confirmPassword.value && confirmPassword.value !== password.value;
    confirmPassword.setCustomValidity(mismatch ? 'Passwords do not match.' : '');
  }

  password.addEventListener('input', function () {
    checkPasswordStrength();
    checkPasswords(); // confirm-password's mismatch state can flip as password changes
  });
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
    checkPasswordStrength();
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

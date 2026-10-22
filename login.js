(function () {
  var form = document.getElementById('login-form');
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

    if (!form.reportValidity()) {
      return;
    }

    var payload = {
      email: form.email.value.trim(),
      password: form.password.value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          window.location.href = 'home.html';
          return;
        }
        showError(result.data.error || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      })
      .catch(function () {
        showError('Could not reach the server. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      });
  });
})();

// Password show/hide toggle
(function () {
  var passwordInput = document.getElementById('login-password');
  var eyeBtn = document.getElementById('login-eye-btn');
  if (!passwordInput || !eyeBtn) return;

  var showIcon = eyeBtn.querySelector('.login-eye-icon--show');
  var hideIcon = eyeBtn.querySelector('.login-eye-icon--hide');

  eyeBtn.addEventListener('click', function () {
    var isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    eyeBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    eyeBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    if (showIcon) showIcon.style.display = isHidden ? 'none' : 'inline';
    if (hideIcon) hideIcon.style.display = isHidden ? 'inline' : 'none';
  });
})();

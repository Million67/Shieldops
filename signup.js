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
  var submitBtn = form.querySelector('.save-btn');

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
    submitBtn.textContent = 'Creating account…';

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
        submitBtn.textContent = 'Create Account';
      })
      .catch(function () {
        showError('Could not reach the server. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      });
  });
})();

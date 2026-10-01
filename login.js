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
    submitBtn.textContent = 'Logging in…';

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
          window.location.href = 'dashboard.html';
          return;
        }
        showError(result.data.error || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      })
      .catch(function () {
        showError('Could not reach the server. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      });
  });
})();

// Profile page — stats, Risk Awareness Score, and the "Topics Covered" list.
//
// All of it now comes from the real backend (GET /api/progress in
// index.js) — points, quizzes/topics completed, and the Risk Awareness
// Score (see the formula comment on that route; it starts everyone at a
// full 100 until they've taken a quiz). If the request fails — not logged
// in, or a network hiccup — everything just stays at its placeholder state
// instead of erroring.
(function () {
  var pointsEl = document.querySelector('[data-stat="points"]');
  var quizzesEl = document.querySelector('[data-stat="quizzes"]');
  var topicsEl = document.querySelector('[data-stat="topics"]');
  var scoreLabelEl = document.querySelector('[data-stat="risk-score-label"]');
  var scoreFillEl = document.querySelector('[data-stat="risk-score-fill"]');

  fetch('/api/progress')
    .then(function (response) {
      if (!response.ok) throw new Error('progress request failed');
      return response.json();
    })
    .then(function (data) {
      var stats = data.stats || {};

      if (pointsEl) pointsEl.textContent = stats.points != null ? stats.points : '—';
      if (quizzesEl) quizzesEl.textContent = stats.quizzesCompleted != null ? stats.quizzesCompleted : '—';
      if (topicsEl) {
        topicsEl.textContent =
          stats.topicsCompleted != null && stats.totalTopics != null
            ? stats.topicsCompleted + '/' + stats.totalTopics
            : '—';
      }

      // riskScore comes back as a number 0-100 from the backend — everyone
      // starts at a full 100 until they've actually taken a quiz (see the
      // comment on GET /api/progress in index.js). Falling back to 100 here
      // too just guards against an unexpected missing field.
      var riskScore = stats.riskScore != null ? stats.riskScore : 100;
      if (scoreLabelEl) scoreLabelEl.textContent = riskScore + '/100';
      if (scoreFillEl) {
        scoreFillEl.style.width = riskScore + '%';
        // Red 0-65, yellow 66-85, green 86-100.
        scoreFillEl.classList.remove('score-bar-fill--red', 'score-bar-fill--yellow', 'score-bar-fill--green');
        if (riskScore <= 65) {
          scoreFillEl.classList.add('score-bar-fill--red');
        } else if (riskScore <= 85) {
          scoreFillEl.classList.add('score-bar-fill--yellow');
        } else {
          scoreFillEl.classList.add('score-bar-fill--green');
        }
      }

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
      // Not logged in, or the request failed — everything stays at its
      // placeholder state.
    });
})();

// Profile picture — generic grey silhouette by default, uploaded photo when there is
// one. Every upload is cropped to a centered square and shrunk to a 256px
// JPEG in the browser first, so what reaches the server (POST /api/avatar in
// index.js) is only a few dozen KB no matter how big the original photo was.
(function () {
  var AVATAR_SIZE = 256;
  var MAX_ORIGINAL_BYTES = 15 * 1024 * 1024; // refuse absurdly large originals before decoding

  var avatarImgEl = document.getElementById('profile-avatar-img');
  var changeBtn = document.getElementById('avatar-change-btn');
  var removeBtn = document.getElementById('avatar-remove-btn');
  var fileInput = document.getElementById('avatar-file');
  var errorEl = document.getElementById('avatar-error');
  if (!avatarImgEl || !changeBtn || !fileInput) return;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function showPhoto() {
    // ?v= busts the browser cache so a new upload appears right away.
    avatarImgEl.src = '/api/avatar?v=' + Date.now();
  }
  avatarImgEl.addEventListener('load', function () {
    avatarImgEl.hidden = false;
    removeBtn.hidden = false;
  });
  avatarImgEl.addEventListener('error', function () {
    // 404 = no photo yet — fall back to the grey silhouette.
    avatarImgEl.hidden = true;
    removeBtn.hidden = true;
  });

  showPhoto();

  // Center-crop to a square and re-encode as a JPEG blob.
  function resizeToJpeg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - side) / 2;
        var sy = (img.naturalHeight - side) / 2;
        var canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // PNG transparency would otherwise turn black in a JPEG
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('encode failed'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('decode failed'));
      };
      img.src = url;
    });
  }

  changeBtn.addEventListener('click', function () {
    clearError();
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = ''; // so choosing the same file again still fires 'change'
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      showError('That photo is too large. Try one under 15 MB.');
      return;
    }

    clearError();
    changeBtn.disabled = true;
    changeBtn.textContent = 'Uploading…';

    resizeToJpeg(file)
      .then(function (blob) {
        return fetch('/api/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob
        });
      })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok) throw new Error(data.error || 'Upload failed.');
        });
      })
      .then(showPhoto)
      .catch(function (err) {
        showError(err && err.message && err.message !== 'decode failed' && err.message !== 'encode failed'
          ? err.message
          : "Couldn't read that image. Try a different one.");
      })
      .then(function () {
        changeBtn.disabled = false;
        changeBtn.textContent = 'Change photo';
      });
  });

  removeBtn.addEventListener('click', function () {
    clearError();
    removeBtn.disabled = true;
    fetch('/api/avatar', { method: 'DELETE' })
      .then(function (response) {
        if (!response.ok) throw new Error('delete failed');
        avatarImgEl.hidden = true;
        avatarImgEl.removeAttribute('src');
        removeBtn.hidden = true;
      })
      .catch(function () { showError("Couldn't remove the photo. Please try again."); })
      .then(function () { removeBtn.disabled = false; });
  });
})();

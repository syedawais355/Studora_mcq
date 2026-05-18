// Tiny standalone script loaded by the /results landing page (rendered by
// api/share-card.js in HTML mode). Reads per-request data from data-* attrs
// on the <body> tag, then wires copy / share-sheet / download handlers.
// Kept dependency-free so it works as a plain <script src> under the
// existing 'self'-only CSP.

(function () {
  var body = document.body;
  if (!body) return;
  var url     = body.getAttribute('data-share-url')     || '';
  var imgUrl  = body.getAttribute('data-share-image')   || '';
  var caption = body.getAttribute('data-share-caption') || '';
  var captionLong = body.getAttribute('data-share-caption-long') || caption;

  var toastEl = document.getElementById('toast');
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  var copyBtn = document.getElementById('copy-url');
  if (copyBtn) copyBtn.addEventListener('click', async function () {
    var ok = await copy(url);
    toast(ok ? 'Link copied' : "Couldn't copy — long-press the field");
  });

  var urlIn = document.getElementById('url-input');
  if (urlIn) urlIn.addEventListener('click', function () { this.select(); });

  var capBtn = document.getElementById('copy-caption');
  if (capBtn) capBtn.addEventListener('click', async function () {
    var ok = await copy(captionLong);
    toast(ok ? 'Caption copied — paste anywhere' : "Couldn't copy caption");
  });

  // Native share sheet — only shown when supported. Tries to attach the PNG
  // file so the user can pick Instagram/Snap/AirDrop directly; falls back to
  // a URL-only share on older devices.
  if (navigator.share) {
    var btn = document.getElementById('native-share');
    if (btn) {
      btn.style.display = 'flex';
      btn.addEventListener('click', async function () {
        try {
          var data = { title: 'My Studora scorecard', text: caption, url: url };
          try {
            var res = await fetch(imgUrl);
            if (res.ok) {
              var blob = await res.blob();
              var file = new File([blob], 'studora-scorecard.png', { type: 'image/png' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                data.files = [file];
              }
            }
          } catch (e) { /* fall back to URL share */ }
          await navigator.share(data);
        } catch (e) {
          if (e && e.name === 'AbortError') return;
          var ok = await copy(url);
          toast(ok ? 'Link copied instead' : 'Sharing not available');
        }
      });
    }
  }

  // Force-download the PNG as a blob — otherwise some browsers ignore the
  // download attribute and open it in a new tab when the function URL has a
  // query string.
  var dlBtns = document.querySelectorAll('#dl-direct, #dl-png');
  for (var i = 0; i < dlBtns.length; i++) {
    (function (a) {
      a.addEventListener('click', async function (ev) {
        ev.preventDefault();
        try {
          var res = await fetch(imgUrl);
          var blob = await res.blob();
          var u = URL.createObjectURL(blob);
          var tmp = document.createElement('a');
          tmp.href = u;
          tmp.download = a.getAttribute('download') || 'studora-scorecard.png';
          document.body.appendChild(tmp);
          tmp.click();
          document.body.removeChild(tmp);
          setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
          toast('Image saved');
        } catch (e) {
          window.open(imgUrl, '_blank');
        }
      });
    })(dlBtns[i]);
  }
})();

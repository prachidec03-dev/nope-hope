// Microsoft Clarity: heatmaps and session recordings.
// Paste your Clarity project ID between the quotes below (Clarity → Settings → Overview → Project ID).
var CLARITY_ID = 'z4ckp9zc39';

if (/^[a-z0-9]{6,20}$/i.test(CLARITY_ID)) {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

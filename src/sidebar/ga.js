'use strict';

let loaded = false;

module.exports = function(trackingId) {
  // small measure to make we do not accidentally
  // load the analytics scripts more than once
  if (loaded) {
    return;
  }

  loaded = true;

  /* eslint-disable */

  // Google Analytics snippet to load the analytics script
  (function(i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    (i[r] =
      i[r] ||
      function() {
        (i[r].q = i[r].q || []).push(arguments);
      }),
      (i[r].l = 1 * new Date());
    (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m);
  })(
    window,
    document,
    'script',
    'https://www.google-analytics.com/analytics.js',
    'ga'
  );

  ga('create', trackingId, 'auto');

  // overrides helper that requires http or https protocols.
  // obvious issue when it comes to extensions with protocols
  // like "chrome-extension://" but isn't a huge need for us
  // anywhere else as well.
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/tasks#disabling
  ga('set', 'checkProtocolTask', null);

  // anonymize collected IP addresses for GDPR
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/ip-anonymization
  ga('set', 'anonymizeIp', true);

  /* eslint-enable */
};

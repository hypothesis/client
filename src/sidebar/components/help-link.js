'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

/**
 * Render an HTML link for sending an email to Hypothes.is support. This link
 * pre-populates the email body with various details about the app's state.
 */
function HelpLink({
  auth,
  dateTime,
  documentFingerprint = '-',
  url,
  userAgent,
  version,
}) {
  const toAddress = 'support@hypothes.is';
  const subject = encodeURIComponent('Hypothesis Support');

  const username = auth.username ? auth.username : '-';

  // URL-encode informational key-value pairs for the email's body content
  const bodyAttrs = [
    `Version: ${version}`,
    `User Agent: ${userAgent}`,
    `URL: ${url}`,
    `PDF Fingerprint: ${documentFingerprint}`,
    `Date: ${dateTime}`,
    `Username: ${username}`,
  ].map(x => encodeURIComponent(x));

  // Create a pre-populated email body with each key-value pair on its own line
  const body = bodyAttrs.join(encodeURIComponent('\r\n'));
  const href = `mailto:${toAddress}?subject=${subject}&body=${body}`;

  return (
    <a className="help-panel-content__link" href={href}>
      Send us an email
    </a>
  );
}

HelpLink.propTypes = {
  auth: propTypes.object.isRequired,
  dateTime: propTypes.object.isRequired,
  documentFingerprint: propTypes.string,
  url: propTypes.string,
  userAgent: propTypes.string.isRequired,
  version: propTypes.string.isRequired,
};

module.exports = HelpLink;

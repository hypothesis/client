'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { withServices } = require('../util/service-context');

const SvgIcon = require('./svg-icon');

/**
 * Render a call-to-action to log in or sign up. This message is intended to be
 * displayed to non-auth'd users when viewing a single annotation in a
 * direct-linked context (i.e. URL with syntax `/#annotations:<annotation_id>`)
 */
function LoggedOutMessage({ onLogin, serviceUrl }) {
  return (
    <div className="logged-out-message">
      <span>
        This is a public annotation created with Hypothesis. <br />
        To reply or make your own annotations on this document,{' '}
        <a
          className="logged-out-message__link"
          href={serviceUrl('signup')}
          target="_blank"
          rel="noopener noreferrer"
        >
          create a free account
        </a>{' '}
        or{' '}
        <a className="logged-out-message__link" href="" onClick={onLogin}>
          log in
        </a>
        .
      </span>
      <div className="logged-out-message__logo">
        <a href="https://hypothes.is">
          <SvgIcon name="logo" className="logged-out-message__logo-icon" />
        </a>
      </div>
    </div>
  );
}

LoggedOutMessage.propTypes = {
  onLogin: propTypes.func.isRequired,
  serviceUrl: propTypes.func.isRequired,
};

LoggedOutMessage.injectedProps = ['serviceUrl'];

module.exports = withServices(LoggedOutMessage);

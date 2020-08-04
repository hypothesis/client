import { createElement } from 'preact';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';

import Button from './button';
import SvgIcon from '../../shared/components/svg-icon';

/** @typedef {import('../services/service-url').ServiceUrlGetter} ServiceUrlGetter */

/**
 * @typedef LoggedOutMessageProps
 * @prop {() => any} onLogin
 * @prop {ServiceUrlGetter} serviceUrl
 */

/**
 * Render a call-to-action to log in or sign up. This message is intended to be
 * displayed to non-auth'd users when viewing a single annotation in a
 * direct-linked context (i.e. URL with syntax `/#annotations:<annotation_id>`)
 *
 * @param {LoggedOutMessageProps} props
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
        <Button
          className="logged-out-message__link"
          onClick={onLogin}
          buttonText="log in"
        />
        .
      </span>
      <div className="logged-out-message__logo">
        <a
          href="https://hypothes.is"
          aria-label="Hypothesis homepage"
          title="Hypothesis homepage"
        >
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

export default withServices(LoggedOutMessage);

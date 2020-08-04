import { createElement } from 'preact';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * A single sharing link as a list item
 */
function ShareLink({ label, iconName, uri, onClick }) {
  return (
    <li className="share-links__link">
      <a
        aria-label={label}
        href={uri}
        title={label}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SvgIcon name={iconName} className="share-links__icon" />
      </a>
    </li>
  );
}

ShareLink.propTypes = {
  /** The name of the SVG icon to use for this link */
  iconName: propTypes.string.isRequired,
  /** Accessible label / tooltip for link. */
  label: propTypes.string.isRequired,
  /** URI for sharing this annotation on the given social service */
  uri: propTypes.string.isRequired,
  /** click callback (for analytics tracking) */
  onClick: propTypes.func.isRequired,
};

/**
 * A list of share links to social-media platforms.
 */
function ShareLinks({ analytics, analyticsEventName, shareURI }) {
  // Return a click callback that will track click events for the given
  // social platform (`shareTarget`)
  const trackShareClick = shareTarget => {
    return () => {
      analytics.track(analyticsEventName, shareTarget);
    };
  };

  // This is the double-encoded format needed for other services (the entire
  // URI needs to be encoded because it's used as the value of querystring params)
  const encodedURI = encodeURIComponent(shareURI);

  return (
    <ul className="share-links">
      <ShareLink
        iconName="twitter"
        label="Tweet share link"
        uri={`https://twitter.com/intent/tweet?url=${encodedURI}&hashtags=annotated`}
        onClick={trackShareClick('twitter')}
      />

      <ShareLink
        iconName="facebook"
        label="Share on Facebook"
        uri={`https://www.facebook.com/sharer/sharer.php?u=${encodedURI}`}
        onClick={trackShareClick('facebook')}
      />

      <ShareLink
        iconName="email"
        label="Share via email"
        uri={`mailto:?subject=${encodeURIComponent(
          "Let's Annotate"
        )}&body=${encodedURI}`}
        onClick={trackShareClick('email')}
      />
    </ul>
  );
}

ShareLinks.propTypes = {
  /** Analytics event to track when share links are clicked */
  analyticsEventName: propTypes.string.isRequired,
  /** URI to shared resource(s), e.g. an annotation or collection of annotations */
  shareURI: propTypes.string.isRequired,

  // Services/injected
  analytics: propTypes.object.isRequired,
};

ShareLinks.injectedProps = ['analytics'];

export default withServices(ShareLinks);

'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { withServices } = require('../util/service-context');

const SvgIcon = require('./svg-icon');

/**
 * A list of share links to social-media platforms.
 */
function ShareLinks({ analytics, analyticsEventName, shareURI }) {
  const trackShareClick = shareTarget => {
    analytics.track(analyticsEventName, shareTarget);
  };

  // This is the double-encoded format needed for other services (the entire
  // URI needs to be encoded because it's used as the value of querystring params)
  const encodedURI = encodeURIComponent(shareURI);

  return (
    <ul className="share-links">
      <li className="share-links__link">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedURI}&hashtags=annotated`}
          title="Tweet share link"
          onClick={trackShareClick('twitter')}
        >
          <SvgIcon name="twitter" className="share-links__icon" />
        </a>
      </li>
      <li className="share-links__link">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURI}`}
          title="Share on Facebook"
          onClick={trackShareClick('facebook')}
        >
          <SvgIcon name="facebook" className="share-links__icon" />
        </a>
      </li>
      <li className="share-links__link">
        <a
          href={`mailto:?subject=${encodeURIComponent(
            "Let's Annotate"
          )}&body=${encodedURI}`}
          title="Share via email"
          onClick={trackShareClick('email')}
        >
          <SvgIcon name="email" className="share-links__icon" />
        </a>
      </li>
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

module.exports = withServices(ShareLinks);

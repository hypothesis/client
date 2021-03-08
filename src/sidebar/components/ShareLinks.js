import { SvgIcon } from '@hypothesis/frontend-shared';

import { withServices } from '../service-context';

/**
 * @typedef ShareLinkProps
 * @prop {string} iconName - The name of the SVG icon to use for this link
 * @prop {string} label - Accessible label/tooltip for link
 * @prop {string} uri - URI for sharing this annotation
 * @prop {() => void} onClick - Callback for analytics tracking
 */

/**
 * A single sharing link as a list item
 *
 * @param {ShareLinkProps} props
 */
function ShareLink({ label, iconName, uri, onClick }) {
  return (
    <li className="ShareLinks__link">
      <a
        aria-label={label}
        href={uri}
        title={label}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SvgIcon name={iconName} className="ShareLinks__icon" />
      </a>
    </li>
  );
}

/**
 * @typedef ShareLinksProps
 * @prop {object} analytics
 * @prop {string} analyticsEventName
 * @prop {string} shareURI - The URL to share
 */

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
    <ul className="ShareLinks">
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

ShareLinks.injectedProps = ['analytics'];

export default withServices(ShareLinks);

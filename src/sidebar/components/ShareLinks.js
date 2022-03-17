import { Icon, Link } from '@hypothesis/frontend-shared';

/**
 * @typedef ShareLinkProps
 * @prop {string} iconName - The name of the SVG icon to use for this link
 * @prop {string} label - Accessible label/tooltip for link
 * @prop {string} uri - URI for sharing this annotation
 */

/**
 * A single sharing link as a list item
 *
 * @param {ShareLinkProps} props
 */
function ShareLink({ label, iconName, uri }) {
  return (
    <li>
      <Link
        aria-label={label}
        classes="text-grey-6 hover:text-color-text block"
        href={uri}
        title={label}
        target="_blank"
      >
        <Icon name={iconName} />
      </Link>
    </li>
  );
}

/**
 * @typedef ShareLinksProps
 * @prop {string} shareURI - The URL to share
 */

/**
 * A list of share links to social-media platforms.
 *
 * @param {ShareLinksProps} props
 */
export default function ShareLinks({ shareURI }) {
  // This is the double-encoded format needed for other services (the entire
  // URI needs to be encoded because it's used as the value of querystring params)
  const encodedURI = encodeURIComponent(shareURI);

  return (
    <ul className="flex flex-row gap-x-4 items-center justify-center border-t pt-2">
      <ShareLink
        iconName="twitter"
        label="Tweet share link"
        uri={`https://twitter.com/intent/tweet?url=${encodedURI}&hashtags=annotated`}
      />

      <ShareLink
        iconName="facebook"
        label="Share on Facebook"
        uri={`https://www.facebook.com/sharer/sharer.php?u=${encodedURI}`}
      />

      <ShareLink
        iconName="email"
        label="Share via email"
        uri={`mailto:?subject=${encodeURIComponent(
          "Let's Annotate"
        )}&body=${encodedURI}`}
      />
    </ul>
  );
}

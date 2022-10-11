import {
  LinkBase,
  EmailIcon,
  SocialFacebookIcon,
  SocialTwitterIcon,
} from '@hypothesis/frontend-shared/lib/next';

/**
 * @typedef {import('@hypothesis/frontend-shared/lib/types').IconComponent} IconComponent
 */

/**
 * @typedef ShareLinkProps
 * @prop {IconComponent} icon - The SVG icon component to use for this link
 * @prop {string} label - Accessible label/tooltip for link
 * @prop {string} uri - URI for sharing this annotation
 */

/**
 * A single sharing link as a list item
 *
 * @param {ShareLinkProps} props
 */
function ShareLink({ label, icon: Icon, uri }) {
  return (
    <li>
      <LinkBase
        aria-label={label}
        classes="text-grey-6 hover:text-color-text block"
        href={uri}
        title={label}
        target="_blank"
      >
        <Icon
          // Make the icons sized to the current text size to allow for
          // differently-sized sharing icon links
          className="w-em h-em"
        />
      </LinkBase>
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
    <div className="pt-2 border-t">
      <ul className="flex flex-row gap-x-4 items-center justify-center">
        <ShareLink
          icon={SocialTwitterIcon}
          label="Tweet share link"
          uri={`https://twitter.com/intent/tweet?url=${encodedURI}&hashtags=annotated`}
        />

        <ShareLink
          icon={SocialFacebookIcon}
          label="Share on Facebook"
          uri={`https://www.facebook.com/sharer/sharer.php?u=${encodedURI}`}
        />

        <ShareLink
          icon={EmailIcon}
          label="Share via email"
          uri={`mailto:?subject=${encodeURIComponent(
            "Let's Annotate"
          )}&body=${encodedURI}`}
        />
      </ul>
    </div>
  );
}

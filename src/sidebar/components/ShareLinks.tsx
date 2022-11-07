import {
  LinkBase,
  EmailIcon,
  SocialFacebookIcon,
  SocialTwitterIcon,
} from '@hypothesis/frontend-shared/lib/next';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';

type ShareLinkProps = {
  /** The SVG icon component to use for this link */
  icon: IconComponent;

  /** Accessible label/tooltip for link */
  label: string;

  /** URI for sharing this annotation */
  uri: string;
};

/**
 * A single sharing link as a list item
 */
function ShareLink({ label, icon: Icon, uri }: ShareLinkProps) {
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

export type ShareLinksProps = {
  shareURI: string;
};

/**
 * A list of share links to social-media platforms.
 */
export default function ShareLinks({ shareURI }: ShareLinksProps) {
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

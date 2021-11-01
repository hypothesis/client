import { Icon, Link } from '@hypothesis/frontend-shared';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="hyp-u-padding--top hyp-u-border--top u-font--small u-line-height">
      <Link
        classes="hyp-u-layout-row--align-center p-link--muted"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        target="_blank"
        title="View more information about the Creative Commons Public Domain dedication"
      >
        <Icon name="cc-std" classes="u-icon--xsmall" />
        <Icon name="cc-zero" classes="hyp-u-margin--left--1 u-icon--xsmall" />
        <div className="hyp-u-margin--left--2">
          Annotations can be freely reused by anyone for any purpose.
        </div>
      </Link>
    </div>
  );
}

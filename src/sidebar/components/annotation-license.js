import { createElement } from 'preact';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="annotation-license">
      <a
        className="u-layout-row u-color-text--muted"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        title="View more information about the Creative Commons Public Domain dedication"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="annotation-license__icons">
          <SvgIcon name="cc-std" inline={true} className="u-icon--xsmall" />
          <SvgIcon name="cc-zero" inline={true} className="u-icon--xsmall" />
        </div>
        Annotations can be freely reused by anyone for any purpose.
      </a>
    </div>
  );
}

AnnotationLicense.propTypes = {};

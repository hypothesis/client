import { createElement } from 'preact';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="annotation-license">
      <a
        className="annotation-license__link"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        title="View more information about the Creative Commons Public Domain dedication"
        target="_blank"
        rel="noopener noreferrer"
      >
        <SvgIcon
          name="cc-std"
          inline={true}
          className="annotation-license__icon"
        />
        <SvgIcon
          name="cc-zero"
          inline={true}
          className="annotation-license__icon"
        />
        <span className="annotation-license__details">
          Annotations can be freely reused by anyone for any purpose.
        </span>
      </a>
    </div>
  );
}

AnnotationLicense.propTypes = {};

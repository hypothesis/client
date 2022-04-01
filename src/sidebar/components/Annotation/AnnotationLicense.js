import { Icon, Link } from '@hypothesis/frontend-shared';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="pt-2 border-t text-sm leading-none">
      <Link
        classes="flex items-center text-color-text-light"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        target="_blank"
        title="View more information about the Creative Commons Public Domain dedication"
      >
        <Icon name="cc-std" classes="text-tiny" />
        <Icon name="cc-zero" classes="ml-px text-tiny" />
        <div className="ml-1">
          Annotations can be freely reused by anyone for any purpose.
        </div>
      </Link>
    </div>
  );
}

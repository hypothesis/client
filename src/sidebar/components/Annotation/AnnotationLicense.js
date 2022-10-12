import {
  Link,
  CcStdIcon,
  CcZeroIcon,
} from '@hypothesis/frontend-shared/lib/next';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="pt-2 border-t text-sm leading-none">
      <Link
        classes="flex items-center"
        color="text-light"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        target="_blank"
        title="View more information about the Creative Commons Public Domain dedication"
      >
        <CcStdIcon className="w-em h-em text-tiny" />
        <CcZeroIcon className="w-em h-em ml-px text-tiny" />
        <div className="ml-1">
          Annotations can be freely reused by anyone for any purpose.
        </div>
      </Link>
    </div>
  );
}

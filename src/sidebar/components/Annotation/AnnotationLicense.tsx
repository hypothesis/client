import { Link, CcStdIcon, CcZeroIcon } from '@hypothesis/frontend-shared';

/**
 * Render information about CC licensing
 */
export default function AnnotationLicense() {
  return (
    <div className="pt-2 border-t text-xs leading-none">
      <Link
        classes="flex items-center"
        color="text-light"
        href="http://creativecommons.org/publicdomain/zero/1.0/"
        target="_blank"
        title="View more information about the Creative Commons Public Domain dedication"
      >
        <CcStdIcon className="w-[10px] h-[10px]" />
        <CcZeroIcon className="w-[10px] h-[10px] ml-px" />
        <div className="ml-1">
          Annotations can be freely reused by anyone for any purpose.
        </div>
      </Link>
    </div>
  );
}

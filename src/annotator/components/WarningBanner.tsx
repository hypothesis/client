import { CautionIcon, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * A banner shown at the top of the PDF viewer if the PDF cannot be annotated
 * via text annotations due to lack of selectable text.
 * Other types of annotations (like image annotations) may still work.
 */
export default function WarningBanner() {
  return (
    <div className="bg-white" role="alert">
      <div
        className={classnames(
          'flex items-center gap-x-2',
          'border border-yellow-notice bg-yellow-notice/10 text-annotator-base',
        )}
      >
        <div className="bg-yellow-notice text-white p-2">
          <CautionIcon className="text-annotator-xl" />
        </div>
        <div>
          <strong>
            Text annotation tools are unavailable because this PDF does not
            contain selectable text.
          </strong>{' '}
          <Link
            target="_blank"
            href="https://web.hypothes.is/help/how-to-ocr-optimize-pdfs/"
            underline="always"
          >
            Learn more here
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

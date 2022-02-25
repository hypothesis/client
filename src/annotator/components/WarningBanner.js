import { Icon, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * A banner shown at the top of the PDF viewer if the PDF cannot be annotated
 * by Hypothesis.
 */
export default function WarningBanner() {
  return (
    <div className="bg-white">
      <div
        className={classnames(
          'flex items-center gap-x-2',
          'border border-yellow-notice bg-yellow-notice/10 text-annotator-base'
        )}
      >
        <div className="bg-yellow-notice text-white p-2">
          <Icon name="caution" classes="text-annotator-xl" />
        </div>
        <div>
          <strong>This PDF does not contain selectable text:</strong>{' '}
          <Link
            target="_blank"
            href="https://web.hypothes.is/help/how-to-ocr-optimize-pdfs/"
          >
            Learn how to fix this
          </Link>{' '}
          in order to annotate with Hypothesis.
        </div>
      </div>
    </div>
  );
}

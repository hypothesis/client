import { LabeledButton, Link } from '@hypothesis/frontend-shared';

/**
 * @typedef {import('../../types/annotator').ContentInfoConfig} ContentInfoConfig
 */

/**
 * A banner that displays information about the current document and the entity
 * that is providing access to it (eg. JSTOR).
 *
 * @param {object} props
 *   @param {ContentInfoConfig} props.info
 *   @param {() => void} props.onClose
 */
export default function ContentInfoBanner({ info, onClose }) {
  return (
    <div className="flex items-center border-b gap-x-4 px-2 py-1 bg-white text-annotator-lg">
      <Link href={info.logo.link} target="_blank" data-testid="logo-link">
        <img src={info.logo.logo} alt={info.logo.title} />
      </Link>
      <div className="grow">
        {info.links.previousItem && (
          <Link href={info.links.previousItem}>Previous article</Link>
        )}
        {info.item.title}
        {info.item.containerTitle && (
          <span>
            {' '}
            from <i>{info.item.containerTitle}</i>
          </span>
        )}
        {info.links.nextItem && (
          <Link href={info.links.nextItem}>Next article</Link>
        )}
      </div>
      <div className="text-annotator-base">
        <LabeledButton onClick={onClose} data-testid="close-button">
          Close
        </LabeledButton>
      </div>
    </div>
  );
}

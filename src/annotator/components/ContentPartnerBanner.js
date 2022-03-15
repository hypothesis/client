import { Icon, LabeledButton, Link } from '@hypothesis/frontend-shared';

/**
 * @typedef {import('../../types/annotator').ContentPartner} ContentPartner
 */

/**
 * A banner that informs the user about the provider of the document.
 *
 * @param {object} props
 *   @param {ContentPartner} props.provider
 *   @param {() => void} props.onClose
 */
export default function ContentPartnerBanner({ provider, onClose }) {
  return (
    <div className="flex items-center border-b gap-x-4 px-2 py-1 bg-white text-annotator-lg">
      {provider === 'jstor' && (
        <>
          <Link href="https://jstor.org" target="_blank">
            <Icon
              classes="w-[97px] h-[25px]"
              name="jstor"
              title="Document hosted by JSTOR"
            />
          </Link>
          <div className="grow">
            Document hosted by <b>JSTOR</b>
          </div>
        </>
      )}
      <div className="text-annotator-base">
        <LabeledButton onClick={onClose} data-testid="close-button">
          Close
        </LabeledButton>
      </div>
    </div>
  );
}

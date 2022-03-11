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
    <div className="bg-white p-2">
      {provider === 'jstor' && 'Content provided by JSTOR'}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

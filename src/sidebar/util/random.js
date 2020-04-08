function byteToHex(val) {
  const str = val.toString(16);
  return str.length === 1 ? '0' + str : str;
}

/**
 * Generate a random hex string of `len` chars.
 *
 * @param {number} - An even-numbered length string to generate.
 * @return {string}
 */
export function generateHexString(len) {
  const crypto = window.crypto || window.msCrypto; /* IE 11 */
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byteToHex).join('');
}

/**
 * Generate a random hex string of 8 characters for use as a client-side
 * local identifier.
 *
 * @return {string}
 */
export function generateLocalId() {
  return generateHexString(8);
}

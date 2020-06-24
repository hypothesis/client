function byteToHex(val) {
  const str = val.toString(16);
  return str.length === 1 ? '0' + str : str;
}

/**
 * Generate a random hex string of `len` chars.
 *
 * @param {number} len - An even-numbered length string to generate.
 * @return {string}
 */
export function generateHexString(len) {
  // @ts-ignore - TS doesn't know about `msCrypto`.
  const crypto = window.crypto || window.msCrypto; /* IE 11 */
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byteToHex).join('');
}

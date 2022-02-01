/**
 * @typedef AuthState
 * @prop {string|null} [userid]
 * @prop {string} [displayName]
 */

/**
 * An object representing document metadata.
 *
 * @typedef DocMetadata
 * @prop {string=} documentFingerprint - Optional PDF fingerprint for current document
 */

/**
 * An object representing document info.
 *
 * @typedef DocumentInfo
 * @prop {string=} [uri] - Current document URL
 * @prop {DocMetadata} [metadata] - Document metadata
 */

export class VersionData {
  /**
   * @param {AuthState} userInfo
   * @param {DocumentInfo[]} documentInfo - Metadata for connected frames.
   *   If there are multiple frames, the "main" one should be listed first.
   * @param {Window} window_ - test seam
   */
  constructor(userInfo, documentInfo, window_ = window) {
    const noValueString = 'N/A';

    let accountString = noValueString;
    if (userInfo.userid) {
      accountString = userInfo.userid;
      if (userInfo.displayName) {
        accountString = `${userInfo.displayName} (${accountString})`;
      }
    }

    this.version = '__VERSION__';
    this.userAgent = window_.navigator.userAgent;
    this.urls = documentInfo.map(di => di.uri).join(', ') || noValueString;

    // We currently assume that only the main (first) frame may have a fingerprint.
    this.fingerprint =
      documentInfo[0]?.metadata?.documentFingerprint ?? noValueString;

    this.account = accountString;
    this.timestamp = new Date().toString();
  }

  /**
   * Return a single formatted string representing version data, suitable for
   * copying to the clipboard.
   *
   * @return {string} - Single, multiline string representing current version data
   */
  asFormattedString() {
    return `Version: ${this.version}
User Agent: ${this.userAgent}
URL: ${this.urls}
Fingerprint: ${this.fingerprint}
Account: ${this.account}
Date: ${this.timestamp}
`;
  }

  /**
   * Return a single, encoded URL string of version data suitable for use in
   * a querystring (as the value of a single parameter)
   *
   * @return {string} - URI-encoded string
   */
  asEncodedURLString() {
    return encodeURIComponent(this.asFormattedString());
  }
}

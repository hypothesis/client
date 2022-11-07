/**
 * @typedef {import('../../types/annotator').SegmentInfo} SegmentInfo
 * @typedef {import('../store/modules/frames').Frame} Frame
 */

/**
 * @typedef UserDetails
 * @prop {string|null} [userid]
 * @prop {string} [displayName]
 */

export class VersionData {
  /**
   * @param {UserDetails} userInfo
   * @param {Frame[]} documentFrames - Metadata for connected frames.
   *   If there are multiple frames, the "main" one should be listed first.
   * @param {Window} window_ - test seam
   */
  constructor(userInfo, documentFrames, window_ = window) {
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
    this.urls = documentFrames.map(df => df.uri).join(', ') || noValueString;

    // We currently assume that only the main (first) frame may have a fingerprint.
    this.fingerprint =
      documentFrames[0]?.metadata?.documentFingerprint ?? noValueString;

    this.account = accountString;
    this.timestamp = new Date().toString();

    const segmentInfo = documentFrames[0]?.segment;
    if (segmentInfo) {
      const segmentFields = [];
      if (segmentInfo.cfi) {
        segmentFields.push(['CFI', segmentInfo.cfi]);
      }
      if (segmentInfo.url) {
        segmentFields.push(['URL', segmentInfo.url]);
      }

      this.segment = segmentFields
        .map(([field, value]) => `${field}: ${value}`)
        .join(', ');
    }
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

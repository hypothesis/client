import { VersionData } from '../version-data';

describe('sidebar/helpers/version-data', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  describe('constructor', () => {
    it('sets `timestamp` to string of current date', () => {
      const versionData = new VersionData({}, []);
      assert.equal(versionData.timestamp, new Date().toString());
    });

    it('sets `version`', () => {
      const versionData = new VersionData({}, []);
      assert.equal(versionData.version, '1.0.0-dummy-version');
    });

    it('sets `userAgent`', () => {
      const versionData = new VersionData({}, [], {
        navigator: { userAgent: 'fakeUserAgent' },
      });
      assert.equal(versionData.userAgent, 'fakeUserAgent');
    });

    context('empty `userInfo` and `documentInfo` objects', () => {
      // This can happen early in app lifecycle
      it('sets properties to "N/A" for missing values', () => {
        const versionData = new VersionData({}, []);
        ['urls', 'fingerprint', 'account'].forEach(prop => {
          assert.equal(versionData[prop], 'N/A');
        });
      });
    });

    describe('account information', () => {
      it('includes display name if available', () => {
        const versionData = new VersionData(
          {
            userid: 'acct:foo@bar.com',
            displayName: 'Fred Hubert',
          },
          []
        );
        assert.equal(versionData.account, 'Fred Hubert (acct:foo@bar.com)');
      });

      it('only includes userid if no display name', () => {
        const versionData = new VersionData({ userid: 'acct:foo@bar.com' }, []);
        assert.equal(versionData.account, 'acct:foo@bar.com');
      });
    });

    describe('document information', () => {
      [
        {
          docInfo: [{ uri: 'https://foo.com' }],
          formattedURLs: 'https://foo.com',
        },
        {
          docInfo: [{ uri: 'https://foo.com' }, { uri: 'https://bar.com' }],
          formattedURLs: 'https://foo.com, https://bar.com',
        },
      ].forEach(({ docInfo, formattedURLs }) => {
        it('sets `urls`', () => {
          const versionData = new VersionData({}, docInfo);
          assert.equal(versionData.urls, formattedURLs);
        });
      });

      it('sets `fingerprint`', () => {
        const versionData = new VersionData({}, [
          { metadata: { documentFingerprint: 'DEADBEEF' } },
        ]);
        assert.equal(versionData.fingerprint, 'DEADBEEF');
      });

      it('sets `segment` property if `segment` is present in frame details', () => {
        const versionData = new VersionData({}, [
          { segment: { cfi: '/2', url: '/chapters/02.xhtml' } },
        ]);
        assert.equal(versionData.segment, 'CFI: /2, URL: /chapters/02.xhtml');
      });

      it('does not set `segment` property if `segment` is not present in frame details', () => {
        const versionData = new VersionData({}, []);
        assert.isUndefined(versionData.segment);
      });
    });
  });

  describe('#asFormattedString', () => {
    [
      ['Version', 'version'],
      ['User Agent', 'userAgent'],
      ['URL', 'urls'],
      ['Fingerprint', 'fingerprint'],
      ['Account', 'account'],
      ['Date', 'timestamp'],
    ].forEach(prop => {
      it(`includes a line for the value of ${prop[1]} in the string`, () => {
        const versionData = new VersionData({}, []);
        const formatted = versionData.asFormattedString();
        const subStr = `${prop[0]}: ${versionData[prop[1]]}\n`;
        assert.include(formatted, subStr);
      });
    });
  });

  describe('#asEncodedURLString', () => {
    [
      ['Version', 'version'],
      ['User Agent', 'userAgent'],
      ['URL', 'urls'],
      ['Fingerprint', 'fingerprint'],
      ['Account', 'account'],
      ['Date', 'timestamp'],
    ].forEach(prop => {
      it(`includes encoded value for ${prop[1]} in URL string`, () => {
        const versionData = new VersionData({}, []);
        const encoded = versionData.asEncodedURLString();
        const subStr = encodeURIComponent(
          `${prop[0]}: ${versionData[prop[1]]}\n`
        );
        assert.include(encoded, subStr);
      });
    });
  });
});

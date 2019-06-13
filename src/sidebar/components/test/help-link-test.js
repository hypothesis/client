'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const HelpLink = require('../help-link');

describe('Help (mailto) Link', () => {
  let fakeAuth;
  let fakeDateTime;
  let fakeDocumentFingerprint;
  let fakeUrl;
  let fakeUserAgent;
  let fakeVersion;

  const createHelpLink = () => {
    return shallow(
      <HelpLink
        auth={fakeAuth}
        dateTime={fakeDateTime}
        documentFingerprint={fakeDocumentFingerprint}
        url={fakeUrl}
        userAgent={fakeUserAgent}
        version={fakeVersion}
      />
    );
  };

  beforeEach(() => {
    fakeAuth = {
      username: 'fiona.user',
    };
    fakeDateTime = new Date();
    fakeDocumentFingerprint = 'fingerprint';
    fakeUrl = 'http://www.example.com';
    fakeUserAgent = 'Some User Agent';
    fakeVersion = '1.0.0';
  });

  it('sets required props as part of formatted email body', () => {
    const wrapper = createHelpLink();
    const href = wrapper.find('a').prop('href');

    [
      { label: 'Version', value: fakeVersion },
      { label: 'User Agent', value: fakeUserAgent },
      { label: 'URL', value: fakeUrl },
      { label: 'PDF Fingerprint', value: fakeDocumentFingerprint },
      { label: 'Date', value: fakeDateTime },
      { label: 'Username', value: fakeAuth.username },
    ].forEach(helpInfo => {
      const emailBodyPart = encodeURIComponent(
        `${helpInfo.label}: ${helpInfo.value}`
      );
      assert.include(href, emailBodyPart);
    });
  });

  it('sets a default value for PDF document fingerprint if not provided', () => {
    fakeDocumentFingerprint = undefined;
    const wrapper = createHelpLink();
    const href = wrapper.find('a').prop('href');

    const emailBodyPart = encodeURIComponent('PDF Fingerprint: -');

    assert.include(href, emailBodyPart);
  });

  it('sets a default value for username if no authenticated user', () => {
    fakeAuth = {};
    const wrapper = createHelpLink();
    const href = wrapper.find('a').prop('href');

    const emailBodyPart = encodeURIComponent('Username: -');

    assert.include(href, emailBodyPart);
  });
});

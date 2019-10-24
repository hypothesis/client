'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const VersionInfo = require('../version-info');

describe('VersionInfo', function() {
  let fakeVersionData;

  function createComponent(props) {
    return mount(<VersionInfo versionData={fakeVersionData} {...props} />);
  }

  beforeEach(() => {
    fakeVersionData = {
      version: 'fakeVersion',
      userAgent: 'fakeUserAgent',
      url: 'fakeUrl',
      fingerprint: 'fakeFingerprint',
      account: 'fakeAccount',
      timestamp: 'fakeTimestamp',
    };
  });

  it('renders `versionData` information', () => {
    const wrapper = createComponent();
    const componentText = wrapper.text();
    assert.include(componentText, 'fakeVersion');
    assert.include(componentText, 'fakeUserAgent');
    assert.include(componentText, 'fakeUrl');
    assert.include(componentText, 'fakeFingerprint');
    assert.include(componentText, 'fakeAccount');
    assert.include(componentText, 'fakeTimestamp');
  });
});

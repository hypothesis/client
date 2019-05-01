'use strict';

const configFrom = require('../index');

describe('annotator.config.index', function() {
  let fakeSettingsFrom;

  beforeEach(() => {
    fakeSettingsFrom = sinon.stub().returns({
      hostPageSetting: sinon.stub(),
    });

    configFrom.$imports.$mock({
      './settings': fakeSettingsFrom,
    });
  });

  afterEach(() => {
    configFrom.$imports.$restore();
  });

  it('gets the configuration settings', function() {
    configFrom('WINDOW');

    assert.calledOnce(fakeSettingsFrom);
    assert.calledWithExactly(fakeSettingsFrom, 'WINDOW');
  });

  ['sidebarAppUrl', 'query', 'annotations', 'group', 'showHighlights'].forEach(
    settingName => {
      it('returns the ' + settingName + ' setting', () => {
        fakeSettingsFrom()[settingName] = 'SETTING_VALUE';

        const config = configFrom('WINDOW');

        assert.equal(config[settingName], 'SETTING_VALUE');
      });
    }
  );

  context("when there's no application/annotator+html <link>", function() {
    beforeEach('remove the application/annotator+html <link>', function() {
      Object.defineProperty(fakeSettingsFrom(), 'sidebarAppUrl', {
        get: sinon.stub().throws(new Error("there's no link")),
      });
    });

    it('throws an error', function() {
      assert.throws(function() {
        configFrom('WINDOW');
      }, "there's no link");
    });
  });

  ['assetRoot', 'subFrameIdentifier', 'openSidebar'].forEach(function(
    settingName
  ) {
    it(
      'reads ' +
        settingName +
        ' from the host page, even when in a browser extension',
      function() {
        configFrom('WINDOW');

        assert.calledWithExactly(
          fakeSettingsFrom().hostPageSetting,
          settingName,
          { allowInBrowserExt: true }
        );
      }
    );
  });

  ['branding', 'services'].forEach(function(settingName) {
    it(
      'reads ' +
        settingName +
        ' from the host page only when in an embedded client',
      function() {
        configFrom('WINDOW');

        assert.calledWithExactly(
          fakeSettingsFrom().hostPageSetting,
          settingName
        );
      }
    );
  });

  [
    'assetRoot',
    'branding',
    'openSidebar',
    'requestConfigFromFrame',
    'services',
  ].forEach(function(settingName) {
    it('returns the ' + settingName + ' value from the host page', function() {
      const settings = {
        assetRoot: 'chrome-extension://1234/client/',
        branding: 'BRANDING_SETTING',
        openSidebar: 'OPEN_SIDEBAR_SETTING',
        requestConfigFromFrame: 'https://embedder.com',
        services: 'SERVICES_SETTING',
      };
      fakeSettingsFrom().hostPageSetting = function(settingName) {
        return settings[settingName];
      };

      const settingValue = configFrom('WINDOW')[settingName];

      assert.equal(settingValue, settings[settingName]);
    });
  });
});

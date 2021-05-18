import { getConfig } from '../index';
import { $imports } from '../index';

describe('annotator/config/index', function () {
  let fakeSettingsFrom;

  beforeEach(() => {
    fakeSettingsFrom = sinon.stub().returns({
      hostPageSetting: sinon.stub(),
    });

    $imports.$mock({
      './settings': fakeSettingsFrom,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('gets the configuration settings', function () {
    getConfig('all', 'WINDOW');

    assert.calledOnce(fakeSettingsFrom);
    assert.calledWithExactly(fakeSettingsFrom, 'WINDOW');
  });

  ['sidebarAppUrl', 'query', 'annotations', 'group', 'showHighlights'].forEach(
    settingName => {
      it('returns the ' + settingName + ' setting', () => {
        fakeSettingsFrom()[settingName] = 'SETTING_VALUE';

        const config = getConfig('all', 'WINDOW');

        assert.equal(config[settingName], 'SETTING_VALUE');
      });
    }
  );

  context("when there's no application/annotator+html <link>", function () {
    beforeEach('remove the application/annotator+html <link>', function () {
      Object.defineProperty(fakeSettingsFrom(), 'sidebarAppUrl', {
        get: sinon.stub().throws(new Error("there's no link")),
      });
    });

    it('throws an error', function () {
      assert.throws(function () {
        getConfig('all', 'WINDOW');
      }, "there's no link");
    });
  });

  ['assetRoot', 'subFrameIdentifier'].forEach(function (settingName) {
    it(
      'reads ' +
        settingName +
        ' from the host page, even when in a browser extension',
      function () {
        getConfig('all', 'WINDOW');
        assert.calledWithExactly(
          fakeSettingsFrom().hostPageSetting,
          settingName,
          { allowInBrowserExt: true }
        );
      }
    );
  });

  it('reads openSidebar from the host page, even when in a browser extension', function () {
    getConfig('all', 'WINDOW');
    sinon.assert.calledWith(
      fakeSettingsFrom().hostPageSetting,
      'openSidebar',
      sinon.match({
        allowInBrowserExt: true,
      })
    );
  });

  ['branding', 'services'].forEach(function (settingName) {
    it(
      'reads ' +
        settingName +
        ' from the host page only when in an embedded client',
      function () {
        getConfig('all', 'WINDOW');

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
  ].forEach(function (settingName) {
    it('returns the ' + settingName + ' value from the host page', function () {
      const settings = {
        assetRoot: 'chrome-extension://1234/client/',
        branding: 'BRANDING_SETTING',
        openSidebar: 'OPEN_SIDEBAR_SETTING',
        requestConfigFromFrame: 'https://embedder.com',
        services: 'SERVICES_SETTING',
      };
      const expectedConfigValues = {
        assetRoot: 'chrome-extension://1234/client/',
        branding: 'BRANDING_SETTING',
        openSidebar: true,
        requestConfigFromFrame: 'https://embedder.com',
        services: 'SERVICES_SETTING',
      };
      fakeSettingsFrom().hostPageSetting = function (settingName) {
        return settings[settingName];
      };

      const settingValue = getConfig('all', 'WINDOW')[settingName];

      assert.equal(settingValue, expectedConfigValues[settingName]);
    });
  });

  describe('coerces values', () => {
    it('coerces `openSidebar` from a string to a boolean', () => {
      fakeSettingsFrom().hostPageSetting = sinon
        .stub()
        .withArgs('openSidebar')
        .returns('false');
      const config = getConfig('all', 'WINDOW');
      assert.equal(config.openSidebar, false);
    });
  });

  describe('application contexts', () => {
    [
      {
        app: 'annotator',
        expectedKeys: ['clientUrl', 'showHighlights', 'subFrameIdentifier'],
      },
      {
        app: 'sidebar',
        expectedKeys: [
          'annotations',
          'branding',
          'enableExperimentalNewNoteButton',
          'externalContainerSelector',
          'focus',
          'group',
          'onLayoutChange',
          'openSidebar',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'sidebarAppUrl',
          'theme',
          'usernameUrl',
        ],
      },
      {
        app: 'notebook',
        expectedKeys: [
          'branding',
          'enableExperimentalNewNoteButton',
          'focus',
          'group',
          'notebookAppUrl',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'theme',
          'usernameUrl',
        ],
      },
    ].forEach(test => {
      it(`ignore values not belonging to "${test.app}" context`, () => {
        const config = getConfig(test.app, 'WINDOW');
        assert.deepEqual(Object.keys(config), test.expectedKeys);
      });
    });
  });
});

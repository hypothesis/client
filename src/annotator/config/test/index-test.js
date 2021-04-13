import getConfig from '../index';
import { $imports } from '../index';

describe('src/annotator/config/index', function () {
  let fakeSettingsFrom;
  let fakeHostPageSetting;

  function mockFakeSettings(params) {
    fakeHostPageSetting = sinon.stub().returns('fake_value');
    fakeSettingsFrom = sinon.stub().returns({
      hostPageSetting: fakeHostPageSetting,
      isBrowserExtension: false,
      ...params,
    });

    $imports.$mock({
      './settings': fakeSettingsFrom,
    });
  }

  beforeEach(() => {
    mockFakeSettings();
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

  context('embedded client detected', function () {
    it('returns all config values', () => {
      const config = getConfig('all', 'WINDOW');
      assert.deepEqual(
        [
          'annotations',
          'assetRoot',
          'branding',
          'clientUrl',
          'enableExperimentalNewNoteButton',
          'experimental',
          'externalContainerSelector',
          'focus',
          'group',
          'notebookAppUrl',
          'onLayoutChange',
          'openSidebar',
          'query',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'sidebarAppUrl',
          'subFrameIdentifier',
          'theme',
          'usernameUrl',
        ],
        Object.keys(config).sort()
      );
    });
  });

  context('browser extension detected', function () {
    beforeEach(() => {
      mockFakeSettings({
        isBrowserExtension: true,
      });
    });
    it('returns only config values where `allowInBrowserExt` is true', () => {
      const config = getConfig('all', 'WINDOW');
      assert.deepEqual(
        [
          'annotations',
          'assetRoot',
          'clientUrl',
          'group',
          'notebookAppUrl',
          'openSidebar',
          'query',
          'showHighlights',
          'sidebarAppUrl',
          'subFrameIdentifier',
        ],
        Object.keys(config).sort()
      );
    });
  });

  describe('hostPageSetting config values', () => {
    it('calls the valueFn() and passes the config name as a param', () => {
      getConfig('all', 'WINDOW');
      [
        'assetRoot',
        'branding',
        'enableExperimentalNewNoteButton',
        'experimental',
        'focus',
        'theme',
        'usernameUrl',
        'onLayoutChange',
        'openSidebar',
        'requestConfigFromFrame',
        'services',
        'subFrameIdentifier',
        'externalContainerSelector',
      ].forEach(name => {
        assert.calledWith(fakeSettingsFrom().hostPageSetting, name);
      });
    });
  });

  describe('default value', () => {
    it('sets corresponding default values if settings are undefined', () => {
      mockFakeSettings({
        isBrowserExtension: false,
        hostPageSetting: sinon.stub().returns(undefined),
        annotations: undefined,
        clientUrl: undefined,
        group: undefined,
        query: undefined,
        showHighlights: undefined,
        notebookAppUrl: undefined,
      });

      const config = getConfig('all', 'WINDOW');

      assert.deepEqual(config, {
        annotations: null,
        assetRoot: null,
        branding: null,
        clientUrl: null,
        enableExperimentalNewNoteButton: null,
        experimental: {},
        externalContainerSelector: null,
        focus: null,
        group: null,
        notebookAppUrl: null,
        onLayoutChange: null,
        openSidebar: false,
        query: null,
        requestConfigFromFrame: null,
        services: null,
        showHighlights: null,
        sidebarAppUrl: null,
        subFrameIdentifier: null,
        theme: null,
        usernameUrl: null,
      });
    });
  });

  describe('coerces values', () => {
    it('coerces `openSidebar` from a string to a boolean', () => {
      fakeHostPageSetting.withArgs('openSidebar').returns('false');
      const config = getConfig('all', 'WINDOW');
      assert.equal(config.openSidebar, false);
    });
  });

  describe('application contexts', () => {
    [
      {
        app: 'annotator',
        expectedKeys: [
          'annotations',
          'assetRoot',
          'branding',
          'clientUrl',
          'enableExperimentalNewNoteButton',
          'experimental',
          'externalContainerSelector',
          'focus',
          'group',
          'notebookAppUrl',
          'onLayoutChange',
          'openSidebar',
          'query',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'sidebarAppUrl',
          'subFrameIdentifier',
          'theme',
          'usernameUrl',
        ],
      },
      {
        app: 'notebook',
        expectedKeys: [
          'assetRoot',
          'branding',
          'clientUrl',
          'enableExperimentalNewNoteButton',
          'experimental',
          'externalContainerSelector',
          'focus',
          'group',
          'notebookAppUrl',
          'onLayoutChange',
          'openSidebar',
          'query',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'sidebarAppUrl',
          'subFrameIdentifier',
          'theme',
          'usernameUrl',
        ],
      },
      {
        app: 'sidebar',
        expectedKeys: [
          'annotations',
          'assetRoot',
          'branding',
          'clientUrl',
          'enableExperimentalNewNoteButton',
          'experimental',
          'externalContainerSelector',
          'focus',
          'group',
          'notebookAppUrl',
          'onLayoutChange',
          'openSidebar',
          'query',
          'requestConfigFromFrame',
          'services',
          'showHighlights',
          'sidebarAppUrl',
          'subFrameIdentifier',
          'theme',
          'usernameUrl',
        ],
      },
    ].forEach(test => {
      it('ignore values not belonging to a namespace', () => {
        const config = getConfig(test.app, 'WINDOW');
        assert.deepEqual(Object.keys(config).sort(), test.expectedKeys);
      });
    });
  });
});

import { getConfig } from '../index';
import { $imports } from '../index';

describe('annotator/config/index', function () {
  let fakeSettingsFrom;
  let fakeIsBrowserExtension;

  beforeEach(() => {
    fakeSettingsFrom = sinon.stub().returns({
      hostPageSetting: sinon.stub().returns('fakeValue'),
      // getters
      annotations: 'fakeValue',
      clientUrl: 'fakeValue',
      group: 'fakeValue',
      notebookAppUrl: 'fakeValue',
      showHighlights: 'fakeValue',
      sidebarAppUrl: 'fakeValue',
      query: 'fakeValue',
    });
    fakeIsBrowserExtension = sinon.stub();

    $imports.$mock({
      './settings': fakeSettingsFrom,
      './is-browser-extension': {
        isBrowserExtension: fakeIsBrowserExtension,
      },
      './url-from-link-tag': {
        urlFromLinkTag: sinon.stub(),
      },
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

  describe('browser extension', () => {
    context('browser extension set to true', function () {
      it('returns only config values where `allowInBrowserExt` is true or the defaultValue if provided', () => {
        fakeIsBrowserExtension.returns(true);
        const config = getConfig('all', 'WINDOW');
        assert.deepEqual(
          {
            annotations: 'fakeValue',
            assetRoot: 'fakeValue',
            branding: null,
            clientUrl: 'fakeValue',
            enableExperimentalNewNoteButton: null,
            experimental: {},
            externalContainerSelector: null,
            focus: null,
            group: 'fakeValue',
            notebookAppUrl: 'fakeValue',
            onLayoutChange: null,
            openSidebar: true, // coerced
            query: 'fakeValue',
            requestConfigFromFrame: null,
            services: null,
            showHighlights: null,
            sidebarAppUrl: 'fakeValue',
            subFrameIdentifier: 'fakeValue',
            theme: null,
            usernameUrl: null,
          },
          config
        );
      });
    });

    context('browser extension set to false', function () {
      it('returns all config values', () => {
        fakeIsBrowserExtension.returns(false);
        const config = getConfig('all', 'WINDOW');
        assert.deepEqual(
          {
            annotations: 'fakeValue',
            assetRoot: 'fakeValue',
            branding: 'fakeValue',
            clientUrl: 'fakeValue',
            enableExperimentalNewNoteButton: 'fakeValue',
            experimental: 'fakeValue',
            externalContainerSelector: 'fakeValue',
            focus: 'fakeValue',
            group: 'fakeValue',
            notebookAppUrl: 'fakeValue',
            onLayoutChange: 'fakeValue',
            openSidebar: true, // coerced
            query: 'fakeValue',
            requestConfigFromFrame: 'fakeValue',
            services: 'fakeValue',
            showHighlights: 'fakeValue',
            sidebarAppUrl: 'fakeValue',
            subFrameIdentifier: 'fakeValue',
            theme: 'fakeValue',
            usernameUrl: 'fakeValue',
          },
          config
        );
      });
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

  describe('default values', () => {
    beforeEach(() => {
      // Remove all fake values
      $imports.$mock({
        './settings': sinon.stub().returns({
          hostPageSetting: sinon.stub().returns(undefined),
          annotations: undefined,
          clientUrl: undefined,
          group: undefined,
          notebookAppUrl: undefined,
          showHighlights: undefined,
          sidebarAppUrl: undefined,
          query: undefined,
        }),
      });
    });

    this.afterEach(() => {
      $imports.$restore({
        './settings': true,
      });
    });

    it('sets corresponding default values if settings are undefined', () => {
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

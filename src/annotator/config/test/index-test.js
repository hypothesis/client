import { getConfig } from '../index';
import { $imports } from '../index';

describe('annotator/config/index', function () {
  let fakeSettingsFrom;
  let fakeIsBrowserExtension;
  let fakeHostPageSettings;

  beforeEach(() => {
    sinon.stub(console, 'error'); // Validators report to console

    fakeHostPageSettings = sinon.stub();
    // default hostPageSetting to return "fakeValue"
    fakeHostPageSettings
      .returns('fakeValue')
      // showHighlights has a validator so set its return value to a valid value
      .withArgs('showHighlights')
      .returns('always');
    // Add more override values here as needed...
    // .withArgs('settingName').returns('settingValue');

    fakeSettingsFrom = sinon.stub().returns({
      hostPageSetting: fakeHostPageSettings,
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
    console.error.restore();
  });

  it('gets the configuration settings', function () {
    getConfig('all', 'WINDOW');

    assert.calledOnce(fakeSettingsFrom);
    assert.calledWithExactly(fakeSettingsFrom, 'WINDOW');
  });

  ['sidebarAppUrl', 'query', 'annotations', 'group'].forEach(settingName => {
    it(`returns the ${settingName} setting`, () => {
      fakeSettingsFrom()[settingName] = 'SETTING_VALUE';

      const config = getConfig('all', 'WINDOW');

      assert.equal(config[settingName], 'SETTING_VALUE');
    });
  });

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
    context('when client is loaded from the browser extension', function () {
      it('returns only config values where `allowInBrowserExt` is true or the `defaultValue` if provided', () => {
        fakeIsBrowserExtension.returns(true);
        const config = getConfig('all', 'WINDOW');
        assert.deepEqual(
          {
            appType: 'fakeValue',
            annotations: 'fakeValue',
            branding: null,
            clientUrl: 'fakeValue',
            enableExperimentalNewNoteButton: null,
            externalContainerSelector: null,
            focus: null,
            group: 'fakeValue',
            notebookAppUrl: 'fakeValue',
            onLayoutChange: null,
            openSidebar: true, // coerced to true
            query: 'fakeValue',
            requestConfigFromFrame: null,
            services: null,
            showHighlights: 'always', // defaulted to 'always'
            sidebarAppUrl: 'fakeValue',
            subFrameIdentifier: 'fakeValue',
            theme: null,
            usernameUrl: null,
          },
          config
        );
      });

      it('reports errors for invalid values', () => {
        fakeIsBrowserExtension.returns(false);
        fakeHostPageSettings.withArgs('showHighlights').returns('invalid');
        const config = getConfig('all', 'WINDOW');

        assert.calledWith(
          console.error,
          'Config setting showHighlights=invalid has errored.',
          [
            'value does not match accepted values: [always,never,whenSidebarOpen]',
            'value is not a boolean',
          ]
        );
        // showHighlights should be defaulted
        assert.equal(config.showHighlights, 'always');
      });
    });

    context('when client is not loaded from browser extension', function () {
      it('returns all config values', () => {
        fakeIsBrowserExtension.returns(false);
        const config = getConfig('all', 'WINDOW');
        assert.deepEqual(
          {
            appType: 'fakeValue',
            annotations: 'fakeValue',
            branding: 'fakeValue',
            clientUrl: 'fakeValue',
            enableExperimentalNewNoteButton: 'fakeValue',
            externalContainerSelector: 'fakeValue',
            focus: 'fakeValue',
            group: 'fakeValue',
            notebookAppUrl: 'fakeValue',
            onLayoutChange: 'fakeValue',
            openSidebar: true, // coerced to true
            query: 'fakeValue',
            requestConfigFromFrame: 'fakeValue',
            services: 'fakeValue',
            showHighlights: 'always',
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

    afterEach(() => {
      $imports.$restore({
        './settings': true,
      });
    });

    it('sets corresponding default values if settings are undefined', () => {
      const config = getConfig('all', 'WINDOW');

      assert.deepEqual(config, {
        appType: null,
        annotations: null,
        branding: null,
        clientUrl: null,
        enableExperimentalNewNoteButton: null,
        externalContainerSelector: null,
        focus: null,
        group: null,
        notebookAppUrl: null,
        onLayoutChange: null,
        openSidebar: false,
        query: null,
        requestConfigFromFrame: null,
        services: null,
        showHighlights: 'always',
        sidebarAppUrl: null,
        subFrameIdentifier: null,
        theme: null,
        usernameUrl: null,
      });
    });
  });

  ['branding', 'openSidebar', 'requestConfigFromFrame', 'services'].forEach(
    function (settingName) {
      it(`returns the ${settingName} value from the host page`, function () {
        const settings = {
          branding: 'BRANDING_SETTING',
          openSidebar: true,
          requestConfigFromFrame: 'https://embedder.com',
          services: 'SERVICES_SETTING',
        };
        fakeSettingsFrom().hostPageSetting = function (settingName) {
          return settings[settingName];
        };

        const settingValue = getConfig('all', 'WINDOW')[settingName];

        assert.equal(settingValue, settings[settingName]);
      });
    }
  );

  describe('coerces values', () => {
    it('coerces `openSidebar` from a string to a boolean', () => {
      fakeSettingsFrom().hostPageSetting = sinon
        .stub()
        .withArgs('openSidebar')
        .returns('false');
      const config = getConfig('all', 'WINDOW');
      assert.equal(config.openSidebar, false);
    });

    [
      {
        value: true,
        result: 'always',
      },
      {
        value: false,
        result: 'never',
      },
      {
        value: 'whenSidebarOpen',
        result: 'whenSidebarOpen',
      },
      {
        value: 'always',
        result: 'always',
      },
      {
        value: 'never',
        result: 'never',
      },
    ].forEach(function (test) {
      it('coerces `showHighlights` appropriately', () => {
        fakeSettingsFrom().hostPageSetting = sinon
          .stub()
          .withArgs('showHighlights')
          .returns(test.value);
        const config = getConfig('all', 'WINDOW');
        assert.equal(config.showHighlights, test.result);
      });
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
          'appType',
          'annotations',
          'branding',
          'enableExperimentalNewNoteButton',
          'externalContainerSelector',
          'focus',
          'group',
          'onLayoutChange',
          'openSidebar',
          'query',
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
          'group',
          'notebookAppUrl',
          'requestConfigFromFrame',
          'services',
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

  it(`throws an error if an invalid context was passed`, () => {
    assert.throws(() => {
      getConfig('fake', 'WINDOW');
    }, 'Invalid application context used: "fake"');
  });
});

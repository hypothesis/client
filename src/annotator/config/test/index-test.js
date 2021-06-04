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
      it(`returns the ${settingName} setting`, () => {
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

  ['appType', 'openSidebar', 'subFrameIdentifier'].forEach(function (
    settingName
  ) {
    it(`reads ${settingName} from the host page, even when in a browser extension`, function () {
      getConfig('all', 'WINDOW');
      assert.calledWith(
        fakeSettingsFrom().hostPageSetting,
        settingName,
        sinon.match({ allowInBrowserExt: true })
      );
    });
  });

  ['branding', 'services'].forEach(function (settingName) {
    it(`reads ${settingName} from the host page only when in an embedded client`, function () {
      getConfig('all', 'WINDOW');

      assert.calledWithExactly(fakeSettingsFrom().hostPageSetting, settingName);
    });
  });

  ['branding', 'openSidebar', 'requestConfigFromFrame', 'services'].forEach(
    function (settingName) {
      it(`returns the ${settingName} value from the host page`, function () {
        const settings = {
          branding: 'BRANDING_SETTING',
          openSidebar: 'OPEN_SIDEBAR_SETTING',
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

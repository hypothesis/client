'use strict';

var proxyquire = require('proxyquire');
var util = require('../../../shared/test/util');

var fakeSharedSettings = {};
var fakeSettingsFrom = sinon.stub();
var fakeConfigFuncSettingsFrom = sinon.stub();
var fakeIsBrowserExtension = sinon.stub();

var configFrom = proxyquire('../index', util.noCallThru({
  './settings': fakeSettingsFrom,
  './is-browser-extension': fakeIsBrowserExtension,
  './config-func-settings-from': fakeConfigFuncSettingsFrom,
  '../../shared/settings': fakeSharedSettings,
}));

function fakeWindow() {
  return {
    document: 'THE_DOCUMENT',
    location: {href: 'LOCATION_HREF'},
  };
}

describe('annotator.config.index', function() {
  beforeEach('reset fakeSharedSettings', function() {
    fakeSharedSettings.jsonConfigsFrom = sinon.stub().returns({});
  });

  beforeEach('reset fakeSettingsFrom', function() {
    fakeSettingsFrom.reset();
    fakeSettingsFrom.returns({});
  });

  beforeEach('reset fakeIsBrowserExtension()', function() {
    fakeIsBrowserExtension.reset();
    fakeIsBrowserExtension.returns(false);
  });

  beforeEach('reset fakeConfigFuncSettingsFrom()', function() {
    fakeConfigFuncSettingsFrom.reset();
    fakeConfigFuncSettingsFrom.returns({});
  });

  it('gets the settings from the window', function() {
    var window_ = fakeWindow();

    configFrom(window_);

    assert.calledOnce(fakeSettingsFrom);
    assert.calledWithExactly(fakeSettingsFrom, window_);
  });

  [
    'app',
    'query',
    'annotations',
  ].forEach(function(settingName) {
    it('returns the ' + settingName + ' setting', function() {
      fakeSettingsFrom()[settingName] = 'SETTING_VALUE';

      var config = configFrom(fakeWindow());

      assert.equal(config[settingName], 'SETTING_VALUE');
    });
  });


  context("when there's no application/annotator+html <link>", function() {
    beforeEach('remove the application/annotator+html <link>', function() {
      Object.defineProperty(
        fakeSettingsFrom(),
        'app',
        {
          get: sinon.stub().throws(new Error("there's no link")),
        }
      );
    });

    it('throws an error', function() {
      assert.throws(
        function() { configFrom(fakeWindow()); },
        "there's no link"
      );
    });
  });

  it('gets the JSON settings from the document', function() {
    var window_ = fakeWindow();

    configFrom(window_);

    assert.calledOnce(fakeSharedSettings.jsonConfigsFrom);
    assert.calledWithExactly(
      fakeSharedSettings.jsonConfigsFrom, window_.document);
  });

  context('when jsonConfigsFrom() returns a non-empty object', function() {
    it('reads the setting into the returned config', function() {
      // configFrom() just blindly adds any key: value settings that
      // jsonConfigsFrom() returns into the returns options object.
      fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

      var config = configFrom(fakeWindow());

      assert.equal(config.foo, 'bar');
    });
  });

  it('gets config settings from window.hypothesisConfig()', function() {
    var window_ = fakeWindow();

    configFrom(window_);

    assert.calledOnce(fakeConfigFuncSettingsFrom);
    assert.calledWithExactly(fakeConfigFuncSettingsFrom, window_);
  });

  context('when configFuncSettingsFrom() returns an object', function() {
    it('reads arbitrary settings from configFuncSettingsFrom() into config', function() {
      fakeConfigFuncSettingsFrom.returns({foo: 'bar'});

      var config = configFrom(fakeWindow());

      assert.equal(config.foo, 'bar');
    });

    specify('hypothesisConfig() settings override js-hypothesis-config ones', function() {
      fakeConfigFuncSettingsFrom.returns({
        foo: 'fooFromHypothesisConfigFunc'});
      fakeSharedSettings.jsonConfigsFrom.returns({
        foo: 'fooFromJSHypothesisConfigObj',
      });

      var config = configFrom(fakeWindow());

      assert.equal(config.foo, 'fooFromHypothesisConfigFunc');
    });
  });

  describe('showHighlights', function() {
    [
      {
        name: 'changes `true` to `"always"`',
        in:   true,
        out:  'always',
      },
      {
        name: 'changes `false` to `"never"`',
        in:   false,
        out:  'never',
      },
      // It adds any arbitrary string value for showHighlights to the
      // returned config, unmodified.
      {
        name: 'passes arbitrary strings through unmodified',
        in:   'foo',
        out:  'foo',
      },
    ].forEach(function(test) {
      it(test.name, function() {
        fakeSharedSettings.jsonConfigsFrom.returns({showHighlights: test.in});

        var config = configFrom(fakeWindow());

        assert.equal(config.showHighlights, test.out);
      });
    });
  });

  context('when the client is injected by the browser extension', function() {
    beforeEach('configure a browser extension client', function() {
      fakeIsBrowserExtension.returns(true);
    });

    it('still reads the config.app setting from the host page', function() {
      fakeSettingsFrom().app = 'SOME_APP_URL';

      assert.equal(configFrom(fakeWindow()).app, 'SOME_APP_URL');
    });

    it('still reads the config.query setting from the host page', function() {
      fakeSettingsFrom().query = 'SOME_QUERY';

      assert.equal(configFrom(fakeWindow()).query, 'SOME_QUERY');
    });

    it('still reads the config.annotations setting from the host page', function() {
      fakeSettingsFrom().annotations = 'SOME_ANNOTATION_ID';

      assert.equal(configFrom(fakeWindow()).annotations, 'SOME_ANNOTATION_ID');
    });

    it('ignores settings from JSON objects in the host page', function() {
      fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

      assert.isUndefined(configFrom(fakeWindow()).foo);
    });

    it('ignores settings from the hypothesisConfig() function in the host page', function() {
      fakeConfigFuncSettingsFrom.returns({foo: 'bar'});

      assert.isUndefined(configFrom(fakeWindow()).foo);
    });
  });

  context('when the client is not injected by the browser extension', function() {
    beforeEach('configure an embedded client', function() {
      fakeSettingsFrom().app = 'https://hypothes.is/app.html';
    });

    it('does not ignore the host page config', function() {
      fakeSettingsFrom().annotations = 'SOME_ANNOTATION_ID';
      fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

      var config = configFrom(fakeWindow());

      assert.equal(config.app, 'https://hypothes.is/app.html');
      assert.equal(config.annotations, 'SOME_ANNOTATION_ID');
      assert.equal(config.foo, 'bar');
    });
  });
});

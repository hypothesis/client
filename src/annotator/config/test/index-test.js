'use strict';

var proxyquire = require('proxyquire');
var util = require('../../../shared/test/util');

var fakeSharedSettings = {};
var fakeSettings = {};
var fakeConfigFuncSettingsFrom = sinon.stub();
var fakeIsBrowserExtension = sinon.stub();

var configFrom = proxyquire('../index', util.noCallThru({
  './settings': fakeSettings,
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

  beforeEach('reset fakeSettings', function() {
    fakeSettings.app = sinon.stub().returns('IFRAME_URL');
    fakeSettings.annotations = sinon.stub().returns(null);
    fakeSettings.query = sinon.stub().returns(null);
  });

  beforeEach('reset fakeIsBrowserExtension()', function() {
    fakeIsBrowserExtension.reset();
    fakeIsBrowserExtension.returns(false);
  });

  beforeEach('reset fakeConfigFuncSettingsFrom()', function() {
    fakeConfigFuncSettingsFrom.reset();
    fakeConfigFuncSettingsFrom.returns({});
  });

  it('gets the config.app setting', function() {
    var window_ = fakeWindow();

    configFrom(window_);

    assert.calledOnce(fakeSettings.app);
    assert.calledWith(fakeSettings.app, window_.document);
  });

  context("when there's an application/annotator+html <link>", function() {
    it("returns the <link>'s href as config.app", function() {
      assert.equal(configFrom(fakeWindow()).app, 'IFRAME_URL');
    });
  });

  context("when there's no application/annotator+html <link>", function() {
    beforeEach('remove the application/annotator+html <link>', function() {
      fakeSettings.app.throws(new Error("there's no link"));
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

  it("extracts the direct-linked annotation ID from the parent page's URL", function() {
    configFrom(fakeWindow());

    assert.calledOnce(fakeSettings.annotations);
    assert.calledWithExactly(fakeSettings.annotations, 'LOCATION_HREF');
  });

  context("when there's a direct-linked annotation ID", function() {
    beforeEach(function() {
      fakeSettings.annotations.returns('ANNOTATION_ID');
    });

    it('adds the annotation ID to the config', function() {
      assert.equal(configFrom(fakeWindow()).annotations, 'ANNOTATION_ID');
    });
  });

  context("when there's no direct-linked annotation ID", function() {
    it('sets config.annotations to null', function() {
      assert.isNull(configFrom(fakeWindow()).annotations);
    });
  });

  it("extracts the query from the parent page's URL", function() {
    configFrom(fakeWindow());

    assert.calledOnce(fakeSettings.query);
    assert.calledWithExactly(fakeSettings.query, 'LOCATION_HREF');
  });

  context("when there's no annotations query", function() {
    it('sets config.query to null', function() {
      assert.isNull(configFrom(fakeWindow()).query);
    });
  });

  context("when there's an annotations query", function() {
    beforeEach(function() {
      fakeSettings.query.returns('QUERY');
    });

    it('adds the query to the config', function() {
      assert.equal(configFrom(fakeWindow()).query, 'QUERY');
    });
  });

  context('when the client is injected by the browser extension', function() {
    beforeEach('configure a browser extension client', function() {
      fakeIsBrowserExtension.returns(true);
    });

    it('still reads the config.app setting from the host page', function() {
      fakeSettings.app.returns('SOME_APP_URL');

      assert.equal(configFrom(fakeWindow()).app, fakeSettings.app());
    });

    it('still reads the config.query setting from the host page', function() {
      fakeSettings.query.returns('SOME_QUERY');

      assert.equal(configFrom(fakeWindow()).query, fakeSettings.query());
    });

    it('still reads the config.annotations setting from the host page', function() {
      fakeSettings.annotations.returns('SOME_ANNOTATION_ID');

      assert.equal(configFrom(fakeWindow()).annotations, fakeSettings.annotations());
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
      fakeSettings.app.returns('https://hypothes.is/app.html');
    });

    it('does not ignore the host page config', function() {
      fakeSettings.annotations.returns('SOME_ANNOTATION_ID');
      fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

      var config = configFrom(fakeWindow());

      assert.equal(config.app, 'https://hypothes.is/app.html');
      assert.equal(config.annotations, 'SOME_ANNOTATION_ID');
      assert.equal(config.foo, 'bar');
    });
  });
});

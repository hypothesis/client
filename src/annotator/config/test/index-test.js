'use strict';

var proxyquire = require('proxyquire');
var util = require('../../../shared/test/util');

var fakeSharedSettings = {};
var fakeSettings = {};

var configFrom = proxyquire('../index', util.noCallThru({
  './settings': fakeSettings,
  '../../shared/settings': fakeSharedSettings,
}));

function fakeWindow() {
  return {
    document: 'THE_DOCUMENT',
    location: {href: 'LOCATION_HREF'},
  };
}

describe('annotator.config', function() {
  beforeEach('reset fakeSharedSettings', function() {
    fakeSharedSettings.jsonConfigsFrom = sinon.stub().returns({});
  });

  beforeEach('reset fakeSettings', function() {
    fakeSettings.app = sinon.stub().returns('IFRAME_URL');
    fakeSettings.annotations = sinon.stub().returns(null);
    fakeSettings.query = sinon.stub().returns(null);
    fakeSettings.configFuncSettingsFrom = sinon.stub().returns({});
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

    assert.calledOnce(fakeSettings.configFuncSettingsFrom);
    assert.calledWithExactly(fakeSettings.configFuncSettingsFrom, window_);
  });

  context('when configFuncSettingsFrom() returns an object', function() {
    it('reads arbitrary settings from configFuncSettingsFrom() into config', function() {
      fakeSettings.configFuncSettingsFrom.returns({foo: 'bar'});

      var config = configFrom(fakeWindow());

      assert.equal(config.foo, 'bar');
    });

    specify('hypothesisConfig() settings override js-hypothesis-config ones', function() {
      fakeSettings.configFuncSettingsFrom.returns({
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
    beforeEach(function() {
      fakeSettings.annotations.returns('SOME_ANNOTATION_ID');
      fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});
    });

    it('ignores the host page config on chrome', function() {
      fakeSettings.app.returns('chrome-extension://abcdef');

      var config = configFrom(fakeWindow());

      assert.equal(config.app, 'chrome-extension://abcdef');
      assert.equal(config.annotations, 'SOME_ANNOTATION_ID');
      assert.isUndefined(config.foo);
    });

    it('ignores the host page config on firefox', function() {
      fakeSettings.app.returns('moz-extension://abcdef');

      var config = configFrom(fakeWindow());

      assert.equal(config.app, 'moz-extension://abcdef');
      assert.equal(config.annotations, 'SOME_ANNOTATION_ID');
      assert.isUndefined(config.foo);
    });

    it('ignores the host page config on edge', function() {
      fakeSettings.app.returns('ms-browser-extension://abcdef');

      var config = configFrom(fakeWindow());

      assert.equal(config.app, 'ms-browser-extension://abcdef');
      assert.equal(config.annotations, 'SOME_ANNOTATION_ID');
      assert.isUndefined(config.foo);
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

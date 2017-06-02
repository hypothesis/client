'use strict';

var proxyquire = require('proxyquire');

var sandbox = sinon.sandbox.create();

var fakeSettings = {};
var fakeSharedSettings = {};
var configFrom = proxyquire('../config', {
  './settings': fakeSettings,
  '../../shared/settings': fakeSharedSettings,
});

function fakeWindow() {
  return {
    document: 'THE_DOCUMENT',
    location: {href: 'LOCATION_HREF'},
  };
}

describe('annotator.config', function() {
  beforeEach('stub console.warn()', function() {
    sandbox.stub(console, 'warn');
  });

  beforeEach('reset fakeSettings', function() {
    fakeSettings.iFrameSrc = sinon.stub().returns('IFRAME_URL');
    fakeSettings.annotations = sinon.stub().returns(null);
    fakeSettings.query = sinon.stub().returns(null);
    fakeSettings.configFuncSettingsFrom = sinon.stub().returns({});
  });

  beforeEach('reset fakeSharedSettings', function() {
    fakeSharedSettings.jsonConfigsFrom = sinon.stub().returns({});
  });

  afterEach('reset the sandbox', function() {
    sandbox.restore();
  });

  context("when there's an application/annotator+html <link>", function() {
    it("returns the <link>'s href as config.app", function() {
      assert.equal(configFrom(window).app, 'IFRAME_URL');
    });
  });

  context("when there's no application/annotator+html <link>", function() {
    beforeEach('remove the application/annotator+html <link>', function() {
      fakeSettings.iFrameSrc.returns(null);
    });

    it('sets config.app to null', function() {
      var config = configFrom(fakeWindow());

      assert.isNull(config.app);
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

  context('when jsonConfigsFrom() throws an error', function() {
    beforeEach(function() {
      fakeSharedSettings.jsonConfigsFrom.throws();
    });

    it('catches the error', function() {
      configFrom(fakeWindow());
    });

    it('logs a warning', function() {
      configFrom(fakeWindow());

      assert.called(console.warn);
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

  context('when configFuncSettingsFrom() throws an error', function() {
    it('throws the same error', function() {
      fakeSettings.configFuncSettingsFrom.throws(new TypeError());

      assert.throws(function() { configFrom(fakeWindow()); }, TypeError);
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
});

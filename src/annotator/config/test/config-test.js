'use strict';

var proxyquire = require('proxyquire');

var fakeSettings = {};
var fakeSharedSettings = {};

var configFrom = proxyquire('../config', {
  './settings': fakeSettings,
  '../../shared/settings': fakeSharedSettings,
});
var sandbox = sinon.sandbox.create();

function fakeWindow() {
  return {
    document: {
      querySelector: sinon.stub().returns({href: 'LINK_HREF'}),
    },
    location: {href: 'LOCATION_HREF'},
  };
}

describe('annotator.config', function() {
  beforeEach('stub console.warn()', function() {
    sandbox.stub(console, 'warn');
  });

  beforeEach('reset fakeSharedSettings', function() {
    fakeSharedSettings.jsonConfigsFrom = sinon.stub().returns({});
  });

  beforeEach('reset fakeSettings', function() {
    fakeSettings.annotations = sinon.stub();
    fakeSettings.query = sinon.stub();
    fakeSettings.configFuncSettingsFrom = sinon.stub().returns({});
  });

  afterEach('reset the sandbox', function() {
    sandbox.restore();
  });

  context("when there's an application/annotator+html <link>", function() {
    var link;

    beforeEach('add an application/annotator+html <link>', function() {
      link = document.createElement('link');
      link.type = 'application/annotator+html';
      link.href = 'http://example.com/link';
      document.head.appendChild(link);
    });

    afterEach('tidy up the link', function() {
      document.head.removeChild(link);
    });

    it("returns the <link>'s href as config.app", function() {
      assert.equal(configFrom(window).app, link.href);
    });
  });

  context("when there's no application/annotator+html <link>", function() {
    it('throws a TypeError', function() {
      var window_ = fakeWindow();
      window_.document.querySelector.returns(null);

      assert.throws(function() { configFrom(window_); }, TypeError);
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
    assert.calledWithExactly(
      fakeSettings.annotations, 'LOCATION_HREF');
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
    it("doesn't add any .annotations setting to the config", function() {
      assert.isFalse(configFrom(fakeWindow()).hasOwnProperty('annotations'));
    });

    context("when there's no annotations query", function() {
      it("doesn't add any .query setting to the config", function() {
        assert.isFalse(configFrom(fakeWindow()).hasOwnProperty('query'));
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
});

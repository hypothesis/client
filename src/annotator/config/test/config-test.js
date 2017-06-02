'use strict';

var proxyquire = require('proxyquire');

var fakeSettings = {};
var fakeSharedSettings = {
  jsonConfigsFrom: sinon.stub(),
};

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
    fakeSharedSettings.jsonConfigsFrom.reset();
    fakeSharedSettings.jsonConfigsFrom.returns({});
  });

  beforeEach('reset fakeSettings', function() {
    fakeSettings.annotations = sinon.stub();
    fakeSettings.query = sinon.stub();
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

  context("when there's a window.hypothesisConfig() function", function() {
    it('reads arbitrary settings from hypothesisConfig() into config', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({foo: 'bar'});

      var config = configFrom(window_);

      assert.equal(config.foo, 'bar');
    });

    specify('hypothesisConfig() settings override js-hypothesis-config ones', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({
        foo: 'fooFromHypothesisConfigFunc'});
      fakeSharedSettings.jsonConfigsFrom.returns({
        foo: 'fooFromJSHypothesisConfigObj',
      });

      var config = configFrom(window_);

      assert.equal(config.foo, 'fooFromHypothesisConfigFunc');
    });

    context('if hypothesisConfig() returns a non-object value', function() {
      it("doesn't add anything into the config", function() {
        var window_ = fakeWindow();
        window_.hypothesisConfig = sinon.stub().returns(42);

        var config = configFrom(window_);

        delete config.app; // We don't care about config.app for this test.
        assert.deepEqual({}, config);
      });
    });
  });

  context("when window.hypothesisConfig() isn't a function", function() {
    it('throws a TypeError', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = 'notAFunction';

      assert.throws(
        function() { configFrom(window_); }, TypeError,
        'hypothesisConfig must be a function, see: https://h.readthedocs.io/en/latest/embedding.html'
      );
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

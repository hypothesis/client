'use strict';

var proxyquire = require('proxyquire');

var fakeSettings = sinon.stub();
var fakeExtractAnnotationQuery = {};

var configFrom = proxyquire('../config', {
  '../shared/settings': fakeSettings,
  './util/extract-annotation-query': fakeExtractAnnotationQuery,
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

  beforeEach('reset fakeSettings', function() {
    fakeSettings.reset();
    fakeSettings.returns({});
  });

  beforeEach('reset fakeExtractAnnotationQuery', function() {
    fakeExtractAnnotationQuery.extractAnnotationQuery = sinon.stub();
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

    it("returns the <link>'s href as options.app", function() {
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

    assert.calledOnce(fakeSettings);
    assert.calledWithExactly(fakeSettings, window_.document);
  });

  context('when settings() returns a non-empty object', function() {
    it('reads the setting into the returned options', function() {
      // configFrom() just blindly adds any key: value settings that settings()
      // returns into the returns options object.
      fakeSettings.returns({foo: 'bar'});

      var options = configFrom(fakeWindow());

      assert.equal(options.foo, 'bar');
    });
  });

  context('when settings() throws an error', function() {
    beforeEach(function() {
      fakeSettings.throws();
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
    it('reads arbitrary settings from hypothesisConfig() into options', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({foo: 'bar'});

      var options = configFrom(window_);

      assert.equal(options.foo, 'bar');
    });

    specify('hypothesisConfig() settings override js-hypothesis-config ones', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({
        foo: 'fooFromHypothesisConfigFunc'});
      fakeSettings.returns({foo: 'fooFromJSHypothesisConfigObj'});

      var options = configFrom(window_);

      assert.equal(options.foo, 'fooFromHypothesisConfigFunc');
    });

    context('if hypothesisConfig() returns a non-object value', function() {
      it("doesn't add anything into the options", function() {
        var window_ = fakeWindow();
        window_.hypothesisConfig = sinon.stub().returns(42);

        var options = configFrom(window_);

        delete options.app; // We don't care about options.app for this test.
        assert.deepEqual({}, options);
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
      // returned options, unmodified.
      {
        name: 'passes arbitrary strings through unmodified',
        in:   'foo',
        out:  'foo',
      },
    ].forEach(function(test) {
      it(test.name, function() {
        fakeSettings.returns({showHighlights: test.in});

        var options = configFrom(fakeWindow());

        assert.equal(options.showHighlights, test.out);
      });
    });
  });

  it("extracts the annotation query from the parent page's URL", function() {
    configFrom(fakeWindow());

    assert.calledOnce(fakeExtractAnnotationQuery.extractAnnotationQuery);
    assert.calledWithExactly(
      fakeExtractAnnotationQuery.extractAnnotationQuery, 'LOCATION_HREF');
  });

  context('when extractAnnotationQuery() returns an object', function() {
    beforeEach(function() {
      fakeExtractAnnotationQuery.extractAnnotationQuery.returns({
        foo: 'bar',
      });
    });

    it('blindly adds the properties of the object to the options', function() {
      assert.equal(configFrom(fakeWindow()).foo, 'bar');
    });

    specify('settings from extractAnnotationQuery override others', function() {
      // Settings returned by extractAnnotationQuery() override ones from
      // settings() or from window.hypothesisConfig().
      var window_ = fakeWindow();
      fakeExtractAnnotationQuery.extractAnnotationQuery.returns({
        foo: 'fromExtractAnnotationQuery',
      });
      fakeSettings.returns({foo: 'fromSettings'});
      window_.hypothesisConfig = sinon.stub().returns({
        foo: 'fromHypothesisConfig',
      });

      assert.equal(configFrom(window_).foo, 'fromExtractAnnotationQuery');
    });
  });
});

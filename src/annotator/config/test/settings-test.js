'use strict';

var proxyquire = require('proxyquire');
var util = require('../../../shared/test/util');

var fakeConfigFuncSettingsFrom = sinon.stub();
var fakeIsBrowserExtension = sinon.stub();
var fakeSharedSettings = {};

var settingsFrom = proxyquire('../settings', util.noCallThru({
  './config-func-settings-from': fakeConfigFuncSettingsFrom,
  './is-browser-extension': fakeIsBrowserExtension,
  '../../shared/settings': fakeSharedSettings,
}));

describe('annotator.config.settingsFrom', function() {

  beforeEach('reset fakeConfigFuncSettingsFrom', function() {
    fakeConfigFuncSettingsFrom.reset();
    fakeConfigFuncSettingsFrom.returns({});
  });

  beforeEach('reset fakeIsBrowserExtension', function() {
    fakeIsBrowserExtension.reset();
    fakeIsBrowserExtension.returns(false);
  });

  beforeEach('reset fakeSharedSettings', function() {
    fakeSharedSettings.jsonConfigsFrom = sinon.stub().returns({});
  });

  describe('#app', function() {
    function appendLinkToDocument(href) {
      var link = document.createElement('link');
      link.type = 'application/annotator+html';
      if (href) {
        link.href = href;
      }
      document.head.appendChild(link);
      return link;
    }

    context("when there's an application/annotator+html link", function() {
      var link;

      beforeEach('add an application/annotator+html <link>', function() {
        link = appendLinkToDocument('http://example.com/app.html');
      });

      afterEach('tidy up the link', function() {
        document.head.removeChild(link);
      });

      it('returns the href from the link', function() {
        assert.equal(settingsFrom(window).app, 'http://example.com/app.html');
      });
    });

    context('when there are multiple annotator+html links', function() {
      var link1;
      var link2;

      beforeEach('add two links to the document', function() {
        link1 = appendLinkToDocument('http://example.com/app1');
        link2 = appendLinkToDocument('http://example.com/app2');
      });

      afterEach('tidy up the links', function() {
        document.head.removeChild(link1);
        document.head.removeChild(link2);
      });

      it('returns the href from the first one', function() {
        assert.equal(settingsFrom(window).app, 'http://example.com/app1');
      });
    });

    context('when the annotator+html link has no href', function() {
      var link;

      beforeEach('add an application/annotator+html <link> with no href', function() {
        link = appendLinkToDocument();
      });

      afterEach('tidy up the link', function() {
        document.head.removeChild(link);
      });

      it('throws an error', function() {
        assert.throws(
          function() {
            settingsFrom(window).app; // eslint-disable-line no-unused-expressions
          },
          'application/annotator+html link has no href'
        );
      });
    });

    context("when there's no annotator+html link", function() {
      it('throws an error', function() {
        assert.throws(
          function() {
            settingsFrom(window).app; // eslint-disable-line no-unused-expressions
          },
          'No application/annotator+html link in the document'
        );
      });
    });
  });

  function fakeWindow(href) {
    return {
      location: {
        href: href,
      },
      document: {
        querySelector: sinon.stub().returns({href: 'hi'}),
      },
    };
  }

  describe('#annotations', function() {
    [
      {
        describe: "when there's a valid #annotations:<ID> fragment",
        it: 'returns an object containing the annotation ID',
        url: 'http://localhost:3000#annotations:alphanum3ric_-only',
        returns: 'alphanum3ric_-only',
      },
      {
        describe: "when there's a non-alphanumeric annotation ID",
        it: 'returns null',
        url: 'http://localhost:3000#annotations:not%20alphanumeric',
        returns: null,
      },
      {
        describe: "when there's an unrecognised URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000#unknown',
        returns: null,
      },
      {
        describe: "when there's no URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000',
        returns: null,
      },
    ].forEach(function(test) {
      describe(test.describe, function() {
        it(test.it, function() {
          assert.deepEqual(
            settingsFrom(fakeWindow(test.url)).annotations, test.returns);
        });
      });
    });
  });

  describe('#query', function() {
    [
      {
        describe: "when there's a #annotations:query:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:query:user:fred',
        returns: 'user:fred',
      },
      {
        describe: "when there's a #annotations:q:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:q:user:fred',
        returns: 'user:fred',
      },
      {
        describe: "when there's a #annotations:QuerY:<QUERY> fragment",
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:QuerY:user:fred',
        returns: 'user:fred',
      },
      {
        describe: 'when the query contains both a username and a tag',
        it: 'returns an object containing the query',
        url: 'http://localhost:3000#annotations:q:user:fred%20tag:foo',
        returns: 'user:fred tag:foo',
      },
      {
        describe: 'when the query contains URI escape sequences',
        it: 'decodes the escape sequences',
        url: 'http://localhost:3000#annotations:query:foo%20bar',
        returns: 'foo bar',
      },
      {
        describe: "when there's an unrecognised URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000#unknown',
        returns: null,
      },
      {
        describe: "when there's no URL fragment",
        it: 'returns null',
        url: 'http://localhost:3000',
        returns: null,
      },
    ].forEach(function(test) {
      describe(test.describe, function() {
        it(test.it, function() {
          assert.deepEqual(
            settingsFrom(fakeWindow(test.url)).query, test.returns);
        });
      });
    });

    describe('when the URL contains an invalid fragment', function() {
      var decodeURI;

      beforeEach('make decodeURI throw an error', function() {
        decodeURI = sinon.stub(window, 'decodeURI').throws();
      });

      afterEach('reset decodeURI', function() {
        decodeURI.reset();
      });

      it('returns null', function() {
        // Note: we need a #annotations:query:* fragment here, not just a
        // #annotations:* one or an unrecognised one, otherwise
        // query() won't try to URI-decode the fragment.
        var url = 'http://localhost:3000#annotations:query:abc123';

        assert.isNull(settingsFrom(fakeWindow(url)).query);
      });
    });
  });

  describe('#hostPageSetting', function() {
    context('when the client is from a browser extension', function() {
      beforeEach('configure a browser extension client', function() {
        fakeIsBrowserExtension.returns(true);
      });

      it('always returns null', function() {
        // These settings in the host page should be ignored.
        fakeConfigFuncSettingsFrom.returns({foo: 'bar'});
        fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

        assert.isNull(settingsFrom(fakeWindow()).hostPageSetting('foo'));
      });
    });

    context('when the client is embedded in a web page', function() {
      beforeEach('configure an embedded client', function() {
        fakeIsBrowserExtension.returns(false);
      });

      it('returns setting values from window.hypothesisConfig()', function() {
        fakeConfigFuncSettingsFrom.returns({foo: 'bar'});

        assert.equal(settingsFrom(fakeWindow()).hostPageSetting('foo'), 'bar');
      });

      it('returns setting values from js-hypothesis-config scripts', function() {
        fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

        assert.equal(settingsFrom(fakeWindow()).hostPageSetting('foo'), 'bar');
      });

      specify('hypothesisConfig() overrides js-hypothesis-config', function() {
        fakeConfigFuncSettingsFrom.returns({
          foo: 'fooFromHypothesisConfig',
        });
        fakeSharedSettings.jsonConfigsFrom.returns({
          foo: 'fooFromJsHypothesisConfigScript',
        });

        assert.equal(
          settingsFrom(fakeWindow()).hostPageSetting('foo'),
          'fooFromHypothesisConfig'
        );
      });

      [
        null,
        undefined,
      ].forEach(function(returnValue) {
        specify('even a ' + returnValue + ' from hypothesisConfig() overrides js-hypothesis-configs', function() {
          fakeConfigFuncSettingsFrom.returns({foo: returnValue});
          fakeSharedSettings.jsonConfigsFrom.returns({foo: 'bar'});

          assert.equal(settingsFrom(fakeWindow()).hostPageSetting('foo'), returnValue);
        });
      });

      it("returns undefined if the setting isn't defined anywhere", function() {
        fakeConfigFuncSettingsFrom.returns({});
        fakeSharedSettings.jsonConfigsFrom.returns({});

        assert.isUndefined(settingsFrom(fakeWindow()).hostPageSetting('foo'));
      });
    });
  });
});

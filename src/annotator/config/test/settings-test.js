'use strict';

var settings = require('../settings');

describe('annotation.config.settings', function() {
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
        assert.equal(settings.app(document), 'http://example.com/app.html');
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
        assert.equal(settings.app(document), 'http://example.com/app1');
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
          function() { settings.app(document); },
          'application/annotator+html link has no href'
        );
      });
    });

    context("when there's no annotator+html link", function() {
      it('throws an error', function() {
        assert.throws(
          function() { settings.app(document); },
          'No application/annotator+html link in the document'
        );
      });
    });
  });

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
          assert.deepEqual(settings.annotations(test.url), test.returns);
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
          assert.deepEqual(settings.query(test.url), test.returns);
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

        assert.isNull(settings.query(url));
      });
    });
  });
});

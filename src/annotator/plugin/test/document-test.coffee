$ = require('jquery')
Document = require('../document')

###
** Adapted from:
** https://github.com/openannotation/annotator/blob/v1.2.x/test/spec/plugin/document_spec.coffee
**
** Annotator v1.2.10
** https://github.com/openannotation/annotator
**
** Copyright 2015, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/openannotation/annotator/blob/master/LICENSE
###

describe 'Document', ->
  testDocument = null

  beforeEach ->
    testDocument = new Document($('<div></div>')[0], {})
    testDocument.pluginInit()

  afterEach ->
    $(document).unbind()

  describe 'annotation should have some metadata', ->
    # Add some metadata to the page
    head = $("head")
    head.append('<link rel="alternate" href="foo.pdf" type="application/pdf"></link>')
    head.append('<link rel="alternate" href="foo.doc" type="application/msword"></link>')
    head.append('<link rel="bookmark" href="http://example.com/bookmark"></link>')
    head.append('<link rel="shortlink" href="http://example.com/bookmark/short"></link>')
    head.append('<link rel="alternate" href="es/foo.html" hreflang="es" type="text/html"></link>')
    head.append('<meta name="citation_doi" content="10.1175/JCLI-D-11-00015.1">')
    head.append('<meta name="citation_title" content="Foo">')
    head.append('<meta name="citation_pdf_url" content="foo.pdf">')
    head.append('<meta name="dc.identifier" content="doi:10.1175/JCLI-D-11-00015.1">')
    head.append('<meta name="dc:identifier" content="foobar-abcxyz">')
    head.append('<meta name="dc.relation.ispartof" content="isbn:123456789">')
    head.append('<meta name="DC.type" content="Article">')
    head.append('<meta property="og:url" content="http://example.com">')
    head.append('<meta name="twitter:site" content="@okfn">')
    head.append('<link rel="icon" href="http://example.com/images/icon.ico"></link>')
    head.append('<meta name="eprints.title" content="Computer Lib / Dream Machines">')
    head.append('<meta name="prism.title" content="Literary Machines">')
    head.append('<link rel="alternate" href="feed" type="application/rss+xml"></link>')
    head.append('<link rel="canonical" href="http://example.com/canonical"></link>')

    metadata = null

    beforeEach ->
      metadata = testDocument.metadata

    it 'should have metadata', ->
      assert.ok(metadata)

    it 'should have a title, derived from highwire metadata if possible', ->
      assert.equal(metadata.title, 'Foo')

    it 'should have links with absolute hrefs and types', ->
      assert.ok(metadata.link)
      assert.equal(metadata.link.length, 10)
      assert.equal(metadata.link[1].rel, "alternate")
      assert.match(metadata.link[1].href, /^.+foo\.pdf$/)
      assert.equal(metadata.link[1].type, "application/pdf")
      assert.equal(metadata.link[2].rel, "alternate")
      assert.match(metadata.link[2].href, /^.+foo\.doc$/)
      assert.equal(metadata.link[2].type, "application/msword")
      assert.equal(metadata.link[3].rel, "bookmark")
      assert.equal(metadata.link[3].href, "http://example.com/bookmark")
      assert.equal(metadata.link[4].rel, "shortlink")
      assert.equal(metadata.link[4].href, "http://example.com/bookmark/short")
      assert.equal(metadata.link[5].rel, "canonical")
      assert.equal(metadata.link[5].href, "http://example.com/canonical")
      assert.equal(metadata.link[6].href, "doi:10.1175/JCLI-D-11-00015.1")
      assert.match(metadata.link[7].href, /.+foo\.pdf$/)
      assert.equal(metadata.link[7].type, "application/pdf")
      assert.equal(metadata.link[8].href, "doi:10.1175/JCLI-D-11-00015.1")

      # Link derived from dc resource identifiers in the form of urn:x-dc:<container>/<identifier>
      # Where <container> is the percent-encoded value of the last dc.relation.ispartof meta element
      # and <identifier> is the percent-encoded value of the last dc.identifier meta element.
      assert.equal(
        metadata.link[9].href
        "urn:x-dc:isbn%3A123456789/foobar-abcxyz"
      )

    it 'should ignore atom and RSS feeds and alternate languages', ->
      assert.equal(metadata.link.length, 10)

    it 'should have highwire metadata', ->
      assert.ok(metadata.highwire)
      assert.deepEqual(metadata.highwire.pdf_url, ['foo.pdf'])
      assert.deepEqual(metadata.highwire.doi, ['10.1175/JCLI-D-11-00015.1'])
      assert.deepEqual(metadata.highwire.title, ['Foo'])

    it 'should have dublincore metadata', ->
      assert.ok(metadata.dc)
      assert.deepEqual(metadata.dc.identifier, ["doi:10.1175/JCLI-D-11-00015.1", "foobar-abcxyz"])
      assert.deepEqual(metadata.dc['relation.ispartof'], ["isbn:123456789"])
      assert.deepEqual(metadata.dc.type, ["Article"])

    it 'should have facebook metadata', ->
      assert.ok(metadata.facebook)
      assert.deepEqual(metadata.facebook.url, ["http://example.com"])

    it 'should have eprints metadata', ->
      assert.ok(metadata.eprints)
      assert.deepEqual(metadata.eprints.title, ['Computer Lib / Dream Machines'])

    it 'should have prism metadata', ->
      assert.ok(metadata.prism)
      assert.deepEqual(metadata.prism.title, ['Literary Machines'])

      it 'should have twitter card metadata', ->
        assert.ok(metadata.twitter)
        assert.deepEqual(metadata.twitter.site, ['@okfn'])

    it 'should have unique uris', ->
      uris = testDocument.uris()
      assert.equal(uris.length, 8)

    it 'uri() returns the canonical uri', ->
      uri = testDocument.uri()
      assert.equal(uri, metadata.link[5].href)

    it 'should have a favicon', ->
      assert.equal(
        metadata.favicon
        'http://example.com/images/icon.ico'
      )

    it 'should have a documentFingerprint as the dc resource identifiers URN href', ->
      assert.equal(metadata.documentFingerprint, metadata.link[9].href)


  describe '#_absoluteUrl', ->

    it 'should add the protocol when the url starts with two slashes', ->
      result = testDocument._absoluteUrl('//example.com/')
      expected = "#{document.location.protocol}//example.com/"
      assert.equal(result, expected)

    it 'should add a trailing slash when given an empty path', ->
      result = testDocument._absoluteUrl('http://example.com')
      assert.equal(result, 'http://example.com/')

    it 'should make a relative path into an absolute url', ->
      result = testDocument._absoluteUrl('path')
      expected = (
        document.location.protocol + '//' +
          document.location.host +
          document.location.pathname.replace(/[^\/]+$/, '') +
          'path'
      )
      assert.equal(result, expected)

    it 'should make an absolute path into an absolute url', ->
      result = testDocument._absoluteUrl('/path')
      expected = (
        document.location.protocol + '//' +
          document.location.host +
          '/path'
      )
      assert.equal(result, expected)

  describe '#uri', ->

    beforeEach ->
      # Remove any existing canonical links which would otherwise override the
      # document's own location.
      canonicalLink = document.querySelector('link[rel="canonical"]')
      if canonicalLink
        canonicalLink.remove()

    createDoc = (href, baseURI) ->
      fakeDocument =
        createElement: document.createElement.bind(document),
        location:
          href: href
      doc = new Document($('<div></div>')[0], {
        document: fakeDocument,
        baseURI: baseURI,
      })
      doc.pluginInit()
      doc

    [
      'http://publisher.org/book',
      'https://publisher.org/book',
      'file:///Users/jim/book',
    ].forEach (href) ->
      it "should return the document's URL if it has an allowed scheme", ->
        baseURI = 'https://publisher.org/'
        doc = createDoc(href, baseURI)
        assert.equal(doc.uri(), href)

    it "should return the baseURI if the document's URL does not have an allowed scheme", ->
      href = 'blob:1234-5678'
      baseURI = 'https://publisher.org/book'
      doc = createDoc(href, baseURI)
      assert.equal(doc.uri(), baseURI)

    [
      # The base URI is not available in IE if the document has no `<base>`
      # tags. This is a limitation of `document-base-uri`.
      ['https://publisher.org/article', undefined],
      # Ignore base URIs with non-HTTP/HTTPS/file protocols, which can be
      # created by a `<base>` tag.
      ['blob:1234', 'doi:foo'],
      ['chrome://foo', 'chrome://blah'],
    ].forEach ([href, baseURI]) ->
      it "should return the document's URL if it and the baseURI do not have an allowed scheme", ->
        doc = createDoc(href, baseURI)
        assert.equal(doc.uri(), href)

    it 'returns the canonical URI if present', ->
      canonicalLink = document.createElement('link')
      canonicalLink.rel = 'canonical'
      canonicalLink.href = 'https://publisher.org/canonical'
      document.head.appendChild(canonicalLink)

      doc = createDoc('https://publisher.org/not-canonical', null)

      assert.equal doc.uri(), canonicalLink.href

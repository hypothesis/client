$ = require('jquery')
Plugin = require('../plugin')

baseURI = require('document-base-uri')

###
** Adapted from:
** https://github.com/openannotation/annotator/blob/v1.2.x/src/plugin/document.coffee
**
** Annotator v1.2.10
** https://github.com/openannotation/annotator
**
** Copyright 2015, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/openannotation/annotator/blob/master/LICENSE
###

module.exports = class Document extends Plugin

  events:
    'beforeAnnotationCreated': 'beforeAnnotationCreated'

  pluginInit: ->
    this.getDocumentMetadata()

# returns the primary URI for the document being annotated

  uri: =>
    uri = decodeURIComponent(this._getDocumentHref())
    for link in @metadata.link
      if link.rel == "canonical"
        uri = link.href
    return uri

# returns all uris for the document being annotated

  uris: =>
    uniqueUrls = {}
    for link in @metadata.link
      uniqueUrls[link.href] = true if link.href
    return (href for href of uniqueUrls)

  beforeAnnotationCreated: (annotation) =>
    annotation.document = @metadata

  getDocumentMetadata: =>
    @metadata = {}

    # first look for some common metadata types
    # TODO: look for microdata/rdfa?
    this._getHighwire()
    this._getDublinCore()
    this._getFacebook()
    this._getEprints()
    this._getPrism()
    this._getTwitter()
    this._getFavicon()

    # extract out/normalize some things
    this._getTitle()
    this._getLinks()

    return @metadata

  _getHighwire: =>
    return @metadata.highwire = this._getMetaTags("citation", "name", "_")

  _getFacebook: =>
    return @metadata.facebook = this._getMetaTags("og", "property", ":")

  _getTwitter: =>
    return @metadata.twitter = this._getMetaTags("twitter", "name", ":")

  _getDublinCore: =>
    return @metadata.dc = this._getMetaTags("dc", "name", ".")

  _getPrism: =>
    return @metadata.prism = this._getMetaTags("prism", "name", ".")

  _getEprints: =>
    return @metadata.eprints = this._getMetaTags("eprints", "name", ".")

  _getMetaTags: (prefix, attribute, delimiter) =>
    tags = {}
    for meta in $("meta")
      name = $(meta).attr(attribute)
      content = $(meta).prop("content")
      if name
        match = name.match(RegExp("^#{prefix}#{delimiter}(.+)$", "i"))
        if match
          n = match[1]
          if tags[n]
            tags[n].push(content)
          else
            tags[n] = [content]
    return tags

  _getTitle: =>
    if @metadata.highwire.title
      @metadata.title = @metadata.highwire.title[0]
    else if @metadata.eprints.title
      @metadata.title = @metadata.eprints.title[0]
    else if @metadata.prism.title
      @metadata.title = @metadata.prism.title[0]
    else if @metadata.facebook.title
      @metadata.title = @metadata.facebook.title[0]
    else if @metadata.twitter.title
      @metadata.title = @metadata.twitter.title[0]
    else if @metadata.dc.title
      @metadata.title = @metadata.dc.title[0]
    else
      @metadata.title = $("head title").text()

  _getLinks: =>
# we know our current location is a link for the document
    @metadata.link = [href: this._getDocumentHref()]

    # look for some relevant link relations
    for link in $("link")
      l = $(link)
      href = this._absoluteUrl(l.prop('href')) # get absolute url
      rel = l.prop('rel')
      type = l.prop('type')
      lang = l.prop('hreflang')

      if rel not in ["alternate", "canonical", "bookmark", "shortlink"] then continue

      if rel is 'alternate'
# Ignore feeds resources
        if type and type.match /^application\/(rss|atom)\+xml/ then continue
        # Ignore alternate languages
        if lang then continue

      @metadata.link.push(href: href, rel: rel, type: type)

    # look for links in scholar metadata
    for name, values of @metadata.highwire

      if name == "pdf_url"
        for url in values
          @metadata.link.push
            href: this._absoluteUrl(url)
            type: "application/pdf"

      # kind of a hack to express DOI identifiers as links but it's a
      # convenient place to look them up later, and somewhat sane since
      # they don't have a type

      if name == "doi"
        for doi in values
          if doi[0..3] != "doi:"
            doi = "doi:" + doi
          @metadata.link.push(href: doi)

    # look for links in dublincore data
    for name, values of @metadata.dc
      if name == "identifier"
        for id in values
          if id[0..3] == "doi:"
            @metadata.link.push(href: id)

  _getFavicon: =>
    for link in $("link")
      if $(link).prop("rel") in ["shortcut icon", "icon"]
        @metadata["favicon"] = this._absoluteUrl(link.href)

# hack to get a absolute url from a possibly relative one

  _absoluteUrl: (url) ->
    d = document.createElement('a')
    d.href = url
    d.href

# get the true URI record when it's masked via a different protocol.
# this happens when an href is set with a uri using the 'blob:' protocol
# but the document can set a different uri through a <base> tag.

  _getDocumentHref: ->
    href = document.location.href
    if new URL(href).protocol != new URL(baseURI).protocol
      # use the baseURI instead since it's likely what's intended
      href = baseURI
    return href
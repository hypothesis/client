'use strict';

/*
 ** Adapted from:
 ** https://github.com/openannotation/annotator/blob/v1.2.x/src/plugin/document.coffee
 **
 ** Annotator v1.2.10
 ** https://github.com/openannotation/annotator
 **
 ** Copyright 2015, the Annotator project contributors.
 ** Dual licensed under the MIT and GPLv3 licenses.
 ** https://github.com/openannotation/annotator/blob/master/LICENSE
 */

const baseURI = require('document-base-uri');

const Plugin = require('../plugin');
const { normalizeURI } = require('../util/url');

/**
 * DocumentMeta reads metadata/links from the current HTML document and
 * populates the `document` property of new annotations.
 */
class DocumentMeta extends Plugin {
  constructor(element, options) {
    super(element, options);

    this.events = {
      beforeAnnotationCreated: 'beforeAnnotationCreated',
    };
  }

  pluginInit() {
    // Test seams.
    this.baseURI = this.options.baseURI || baseURI;
    this.document = this.options.document || document;
    this.normalizeURI = this.options.normalizeURI || normalizeURI;

    this.getDocumentMetadata();
  }

  /**
   * Returns the primary URI for the document being annotated
   *
   * @return {string}
   */
  uri() {
    let uri = decodeURIComponent(this._getDocumentHref());
    for (let link of this.metadata.link) {
      if (link.rel === 'canonical') {
        uri = link.href;
      }
    }
    return uri;
  }

  /**
   * Returns all uris for the document being annotated
   *
   * @return {string[]}
   */
  uris() {
    const uniqueUrls = {};
    for (let link of this.metadata.link) {
      if (link.href) {
        uniqueUrls[link.href] = true;
      }
    }
    return Object.keys(uniqueUrls);
  }

  /**
   * Hook that augments new annotations with metadata about the document they
   * came from.
   */
  beforeAnnotationCreated(annotation) {
    annotation.document = this.metadata;
  }

  /**
   * Return metadata for the current page.
   */
  getDocumentMetadata() {
    this.metadata = {};

    // first look for some common metadata types
    // TODO: look for microdata/rdfa?
    this._getHighwire();
    this._getDublinCore();
    this._getFacebook();
    this._getEprints();
    this._getPrism();
    this._getTwitter();
    this._getFavicon();

    // extract out/normalize some things
    this._getTitle();
    this._getLinks();

    return this.metadata;
  }

  _getHighwire() {
    this.metadata.highwire = this._getMetaTags('citation', 'name', '_');
  }

  _getFacebook() {
    this.metadata.facebook = this._getMetaTags('og', 'property', ':');
  }

  _getTwitter() {
    this.metadata.twitter = this._getMetaTags('twitter', 'name', ':');
  }

  _getDublinCore() {
    this.metadata.dc = this._getMetaTags('dc', 'name', '.');
  }

  _getPrism() {
    this.metadata.prism = this._getMetaTags('prism', 'name', '.');
  }

  _getEprints() {
    this.metadata.eprints = this._getMetaTags('eprints', 'name', '.');
  }

  _getMetaTags(prefix, attribute, delimiter) {
    const tags = {};
    for (let meta of Array.from(this.document.querySelectorAll('meta'))) {
      const name = meta.getAttribute(attribute);
      const { content } = meta;
      if (name) {
        const match = name.match(RegExp(`^${prefix}${delimiter}(.+)$`, 'i'));
        if (match) {
          const n = match[1];
          if (tags[n]) {
            tags[n].push(content);
          } else {
            tags[n] = [content];
          }
        }
      }
    }
    return tags;
  }

  _getTitle() {
    if (this.metadata.highwire.title) {
      this.metadata.title = this.metadata.highwire.title[0];
    } else if (this.metadata.eprints.title) {
      this.metadata.title = this.metadata.eprints.title[0];
    } else if (this.metadata.prism.title) {
      this.metadata.title = this.metadata.prism.title[0];
    } else if (this.metadata.facebook.title) {
      this.metadata.title = this.metadata.facebook.title[0];
    } else if (this.metadata.twitter.title) {
      this.metadata.title = this.metadata.twitter.title[0];
    } else if (this.metadata.dc.title) {
      this.metadata.title = this.metadata.dc.title[0];
    } else {
      this.metadata.title = this.document.title;
    }
  }

  _getLinks() {
    // We know our current location is a link for the document.
    this.metadata.link = [{ href: this._getDocumentHref() }];

    // Extract links from certain `<link>` tags.
    const linkElements = Array.from(this.document.querySelectorAll('link'));
    for (let link of linkElements) {
      if (
        !['alternate', 'canonical', 'bookmark', 'shortlink'].includes(link.rel)
      ) {
        continue;
      }

      if (link.rel === 'alternate') {
        // Ignore RSS feed links.
        if (link.type && link.type.match(/^application\/(rss|atom)\+xml/)) {
          continue;
        }
        // Ignore alternate languages.
        if (link.hreflang) {
          continue;
        }
      }

      try {
        const href = this._absoluteUrl(link.href);
        this.metadata.link.push({ href, rel: link.rel, type: link.type });
      } catch (e) {
        // Ignore URIs which cannot be parsed.
      }
    }

    // look for links in scholar metadata
    for (let name of Object.keys(this.metadata.highwire)) {
      const values = this.metadata.highwire[name];
      if (name === 'pdf_url') {
        for (let url of values) {
          try {
            this.metadata.link.push({
              href: this._absoluteUrl(url),
              type: 'application/pdf',
            });
          } catch (e) {
            // Ignore URIs which cannot be parsed.
          }
        }
      }

      // kind of a hack to express DOI identifiers as links but it's a
      // convenient place to look them up later, and somewhat sane since
      // they don't have a type
      if (name === 'doi') {
        for (let doi of values) {
          if (doi.slice(0, 4) !== 'doi:') {
            doi = `doi:${doi}`;
          }
          this.metadata.link.push({ href: doi });
        }
      }
    }

    // look for links in dublincore data
    for (let name of Object.keys(this.metadata.dc)) {
      const values = this.metadata.dc[name];
      if (name === 'identifier') {
        for (let id of values) {
          if (id.slice(0, 4) === 'doi:') {
            this.metadata.link.push({ href: id });
          }
        }
      }
    }

    // look for a link to identify the resource in dublincore metadata
    const dcRelationValues = this.metadata.dc['relation.ispartof'];
    const dcIdentifierValues = this.metadata.dc.identifier;
    if (dcRelationValues && dcIdentifierValues) {
      const dcUrnRelationComponent =
        dcRelationValues[dcRelationValues.length - 1];
      const dcUrnIdentifierComponent =
        dcIdentifierValues[dcIdentifierValues.length - 1];
      const dcUrn =
        'urn:x-dc:' +
        encodeURIComponent(dcUrnRelationComponent) +
        '/' +
        encodeURIComponent(dcUrnIdentifierComponent);
      this.metadata.link.push({ href: dcUrn });
      // set this as the documentFingerprint as a hint to include this in search queries
      this.metadata.documentFingerprint = dcUrn;
    }
  }

  _getFavicon() {
    for (let link of Array.from(this.document.querySelectorAll('link'))) {
      if (['shortcut icon', 'icon'].includes(link.rel)) {
        try {
          this.metadata.favicon = this._absoluteUrl(link.href);
        } catch (e) {
          // Ignore URIs which cannot be parsed.
        }
      }
    }
  }

  /**
   * Convert a possibly relative URI to an absolute one. This will throw an
   * exception if the URL cannot be parsed.
   */
  _absoluteUrl(url) {
    return this.normalizeURI(url, this.baseURI);
  }

  // Get the true URI record when it's masked via a different protocol.
  // This happens when an href is set with a uri using the 'blob:' protocol
  // but the document can set a different uri through a <base> tag.
  _getDocumentHref() {
    const { href } = this.document.location;
    const allowedSchemes = ['http:', 'https:', 'file:'];

    // Use the current document location if it has a recognized scheme.
    const scheme = new URL(href).protocol;
    if (allowedSchemes.includes(scheme)) {
      return href;
    }

    // Otherwise, try using the location specified by the <base> element.
    if (
      this.baseURI &&
      allowedSchemes.includes(new URL(this.baseURI).protocol)
    ) {
      return this.baseURI;
    }

    // Fall back to returning the document URI, even though the scheme is not
    // in the allowed list.
    return href;
  }
}

module.exports = DocumentMeta;

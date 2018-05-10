/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Document;
const baseURI = require('document-base-uri');

const Plugin = require('../plugin');
const { normalizeURI } = require('../util/url');

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

module.exports = (Document = (function() {
  Document = class Document extends Plugin {
    constructor(...args) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { this; }).toString();
        let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
        eval(`${thisName} = this;`);
      }
      this.uri = this.uri.bind(this);
      this.uris = this.uris.bind(this);
      this.beforeAnnotationCreated = this.beforeAnnotationCreated.bind(this);
      this.getDocumentMetadata = this.getDocumentMetadata.bind(this);
      this._getHighwire = this._getHighwire.bind(this);
      this._getFacebook = this._getFacebook.bind(this);
      this._getTwitter = this._getTwitter.bind(this);
      this._getDublinCore = this._getDublinCore.bind(this);
      this._getPrism = this._getPrism.bind(this);
      this._getEprints = this._getEprints.bind(this);
      this._getMetaTags = this._getMetaTags.bind(this);
      this._getTitle = this._getTitle.bind(this);
      this._getLinks = this._getLinks.bind(this);
      this._getFavicon = this._getFavicon.bind(this);
      super(...args);
    }

    static initClass() {
  
      this.prototype.events =
        {'beforeAnnotationCreated': 'beforeAnnotationCreated'};
    }

    pluginInit() {
      // Test seams.
      this.baseURI = this.options.baseURI || baseURI;
      this.document = this.options.document || document;

      return this.getDocumentMetadata();
    }

    // Returns the primary URI for the document being annotated
    uri() {
      let uri = decodeURIComponent(this._getDocumentHref());
      for (let link of Array.from(this.metadata.link)) {
        if (link.rel === 'canonical') {
          uri = link.href;
        }
      }
      return uri;
    }

    // Returns all uris for the document being annotated
    uris() {
      let href;
      const uniqueUrls = {};
      for (let link of Array.from(this.metadata.link)) {
        if (link.href) { uniqueUrls[link.href] = true; }
      }
      return ((() => {
        const result = [];
        for (href in uniqueUrls) {
          result.push(href);
        }
        return result;
      })());
    }

    beforeAnnotationCreated(annotation) {
      return annotation.document = this.metadata;
    }

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
      return this.metadata.highwire = this._getMetaTags('citation', 'name', '_');
    }

    _getFacebook() {
      return this.metadata.facebook = this._getMetaTags('og', 'property', ':');
    }

    _getTwitter() {
      return this.metadata.twitter = this._getMetaTags('twitter', 'name', ':');
    }

    _getDublinCore() {
      return this.metadata.dc = this._getMetaTags('dc', 'name', '.');
    }

    _getPrism() {
      return this.metadata.prism = this._getMetaTags('prism', 'name', '.');
    }

    _getEprints() {
      return this.metadata.eprints = this._getMetaTags('eprints', 'name', '.');
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
        return this.metadata.title = this.metadata.highwire.title[0];
      } else if (this.metadata.eprints.title) {
        return this.metadata.title = this.metadata.eprints.title[0];
      } else if (this.metadata.prism.title) {
        return this.metadata.title = this.metadata.prism.title[0];
      } else if (this.metadata.facebook.title) {
        return this.metadata.title = this.metadata.facebook.title[0];
      } else if (this.metadata.twitter.title) {
        return this.metadata.title = this.metadata.twitter.title[0];
      } else if (this.metadata.dc.title) {
        return this.metadata.title = this.metadata.dc.title[0];
      } else {
        return this.metadata.title = this.document.title;
      }
    }

    _getLinks() {
      // we know our current location is a link for the document
      let href, 
        type, 
        values;
      this.metadata.link = [{href: this._getDocumentHref()}];

      // look for some relevant link relations
      for (let link of Array.from(this.document.querySelectorAll('link'))) {
        href = this._absoluteUrl(link.href); // get absolute url
        const { rel } = link;
        ({ type } = link);
        const lang = link.hreflang;

        if (!['alternate', 'canonical', 'bookmark', 'shortlink'].includes(rel)) { continue; }

        if (rel === 'alternate') {
          // Ignore feeds resources
          if (type && type.match(/^application\/(rss|atom)\+xml/)) { continue; }
          // Ignore alternate languages
          if (lang) { continue; }
        }

        this.metadata.link.push({href, rel, type});
      }

      // look for links in scholar metadata
      for (var name in this.metadata.highwire) {

        values = this.metadata.highwire[name];
        if (name === 'pdf_url') {
          for (let url of Array.from(values)) {
            this.metadata.link.push({
              href: this._absoluteUrl(url),
              type: 'application/pdf',
            });
          }
        }

        // kind of a hack to express DOI identifiers as links but it's a
        // convenient place to look them up later, and somewhat sane since
        // they don't have a type
        if (name === 'doi') {
          for (let doi of Array.from(values)) {
            if (doi.slice(0, 4) !== 'doi:') {
              doi = `doi:${doi}`;
            }
            this.metadata.link.push({href: doi});
          }
        }
      }

      // look for links in dublincore data
      for (name in this.metadata.dc) {
        values = this.metadata.dc[name];
        if (name === 'identifier') {
          for (let id of Array.from(values)) {
            if (id.slice(0, 4) === 'doi:') {
              this.metadata.link.push({href: id});
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
        const dcUrn = 'urn:x-dc:' +
          encodeURIComponent(dcUrnRelationComponent) + '/' +
          encodeURIComponent(dcUrnIdentifierComponent);
        this.metadata.link.push({href: dcUrn});
        // set this as the documentFingerprint as a hint to include this in search queries
        return this.metadata.documentFingerprint = dcUrn;
      }
    }

    _getFavicon() {
      return (() => {
        const result = [];
        for (let link of Array.from(this.document.querySelectorAll('link'))) {
          if (['shortcut icon', 'icon'].includes(link.rel)) {
            result.push(this.metadata.favicon = this._absoluteUrl(link.href));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }

    // Hack to get a absolute url from a possibly relative one
    _absoluteUrl(url) {
      return normalizeURI(url, this.baseURI);
    }

    // Get the true URI record when it's masked via a different protocol.
    // This happens when an href is set with a uri using the 'blob:' protocol
    // but the document can set a different uri through a <base> tag.
    _getDocumentHref() {
      let needle, 
        needle1;
      const { href } = this.document.location;
      const allowedSchemes = ['http:', 'https:', 'file:'];

      // Use the current document location if it has a recognized scheme.
      if ((needle = new URL(href).protocol, Array.from(allowedSchemes).includes(needle))) {
        return href;
      }

      // Otherwise, try using the location specified by the <base> element.
      if (this.baseURI && ((needle1 = new URL(this.baseURI).protocol, Array.from(allowedSchemes).includes(needle1)))) {
        return this.baseURI;
      }

      // Fall back to returning the document URI, even though the scheme is not
      // in the allowed list.
      return href;
    }
  };
  Document.initClass();
  return Document;
})());

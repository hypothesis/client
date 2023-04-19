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
import { normalizeURI } from '../util/url';

type Link = {
  href: string;
  rel?: string;
  type?: string;
};

/**
 * Extension of the `Metadata` type with non-optional fields for `dc`, `eprints` etc.
 */
type HTMLDocumentMetadata = {
  title: string;
  link: Link[];
  dc: Record<string, string[]>;
  eprints: Record<string, string[]>;
  facebook: Record<string, string[]>;
  highwire: Record<string, string[]>;
  prism: Record<string, string[]>;
  twitter: Record<string, string[]>;
  favicon?: string;
  documentFingerprint?: string;
};

/**
 * HTMLMetadata reads metadata/links from the current HTML document.
 */
export class HTMLMetadata {
  document: Document;

  constructor(options: { document?: Document } = {}) {
    this.document = options.document || document;
  }

  /**
   * Returns the primary URI for the document being annotated
   */
  uri(): string {
    let uri = decodeURIComponent(this._getDocumentHref());

    // Use the `link[rel=canonical]` element's href as the URL if present.
    const links = this._getLinks();
    for (const link of links) {
      if (link.rel === 'canonical') {
        uri = link.href;
      }
    }

    return uri;
  }

  /**
   * Return metadata for the current page.
   */
  getDocumentMetadata(): HTMLDocumentMetadata {
    const metadata: HTMLDocumentMetadata = {
      title: document.title,
      link: [],

      dc: this._getMetaTags('name', 'dc.'),
      eprints: this._getMetaTags('name', 'eprints.'),
      facebook: this._getMetaTags('property', 'og:'),
      highwire: this._getMetaTags('name', 'citation_'),
      prism: this._getMetaTags('name', 'prism.'),
      twitter: this._getMetaTags('name', 'twitter:'),
    };

    const favicon = this._getFavicon();
    if (favicon) {
      metadata.favicon = favicon;
    }

    metadata.title = this._getTitle(metadata);
    metadata.link = this._getLinks(metadata);

    const dcLink = metadata.link.find(link => link.href.startsWith('urn:x-dc'));
    if (dcLink) {
      metadata.documentFingerprint = dcLink.href;
    }

    return metadata;
  }

  /**
   * Return an array of all the `content` values of `<meta>` tags on the page
   * where the value of the attribute begins with `<prefix>`.
   *
   * @param prefix - it is interpreted as a regex
   */
  private _getMetaTags(
    attribute: string,
    prefix: string
  ): Record<string, string[]> {
    const tags: Record<string, string[]> = {};
    for (const meta of Array.from(this.document.querySelectorAll('meta'))) {
      const name = meta.getAttribute(attribute);
      const { content } = meta;
      if (name && content) {
        const match = name.match(RegExp(`^${prefix}(.+)$`, 'i'));
        if (match) {
          const key = match[1].toLowerCase();
          if (tags[key]) {
            tags[key].push(content);
          } else {
            tags[key] = [content];
          }
        }
      }
    }
    return tags;
  }

  private _getTitle(metadata: HTMLDocumentMetadata): string {
    if (metadata.highwire.title) {
      return metadata.highwire.title[0];
    } else if (metadata.eprints.title) {
      return metadata.eprints.title[0];
    } else if (metadata.prism.title) {
      return metadata.prism.title[0];
    } else if (metadata.facebook.title) {
      return metadata.facebook.title[0];
    } else if (metadata.twitter.title) {
      return metadata.twitter.title[0];
    } else if (metadata.dc.title) {
      return metadata.dc.title[0];
    } else {
      return this.document.title;
    }
  }

  /**
   * Get document URIs from `<link>` and `<meta>` elements on the page.
   *
   * @param [metadata] - Dublin Core and Highwire metadata parsed from `<meta>` tags.
   */
  private _getLinks(
    metadata: Pick<HTMLDocumentMetadata, 'highwire' | 'dc'> = {
      dc: {},
      highwire: {},
    }
  ): Link[] {
    const links: Link[] = [{ href: this._getDocumentHref() }];

    // Extract links from `<link>` tags with certain `rel` values.
    const linkElements = Array.from(this.document.querySelectorAll('link'));
    for (const link of linkElements) {
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
        links.push({ href, rel: link.rel, type: link.type });
      } catch (e) {
        // Ignore URIs which cannot be parsed.
      }
    }

    // Look for links in scholar metadata
    for (const name of Object.keys(metadata.highwire)) {
      const values = metadata.highwire[name];
      if (name === 'pdf_url') {
        for (const url of values) {
          try {
            links.push({
              href: this._absoluteUrl(url),
              type: 'application/pdf',
            });
          } catch (e) {
            // Ignore URIs which cannot be parsed.
          }
        }
      }

      // Kind of a hack to express DOI identifiers as links but it's a
      // convenient place to look them up later, and somewhat sane since
      // they don't have a type.
      if (name === 'doi') {
        for (let doi of values) {
          if (doi.slice(0, 4) !== 'doi:') {
            doi = `doi:${doi}`;
          }
          links.push({ href: doi });
        }
      }
    }

    // Look for links in Dublin Core data
    for (const name of Object.keys(metadata.dc)) {
      const values = metadata.dc[name];
      if (name === 'identifier') {
        for (const id of values) {
          if (id.slice(0, 4) === 'doi:') {
            links.push({ href: id });
          }
        }
      }
    }

    // Look for a link to identify the resource in Dublin Core metadata
    const dcRelationValues = metadata.dc['relation.ispartof'];
    const dcIdentifierValues = metadata.dc.identifier;
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
      links.push({ href: dcUrn });
    }

    return links;
  }

  private _getFavicon(): string | null {
    let favicon = null;
    for (const link of Array.from(this.document.querySelectorAll('link'))) {
      if (['shortcut icon', 'icon'].includes(link.rel)) {
        try {
          favicon = this._absoluteUrl(link.href);
        } catch (e) {
          // Ignore URIs which cannot be parsed.
        }
      }
    }
    return favicon;
  }

  /**
   * Convert a possibly relative URI to an absolute one. This will throw an
   * exception if the URL cannot be parsed.
   */
  private _absoluteUrl(url: string): string {
    return normalizeURI(url, this.document.baseURI);
  }

  /**
   * Get the true URI record when it's masked via a different protocol.
   * This happens when an href is set with a uri using the 'blob:' protocol
   * but the document can set a different uri through a <base> tag.
   */
  private _getDocumentHref(): string {
    const { href } = this.document.location;
    const allowedSchemes = ['http:', 'https:', 'file:'];

    // Use the current document location if it has a recognized scheme.
    const scheme = new URL(href).protocol;
    if (allowedSchemes.includes(scheme)) {
      return href;
    }

    // Otherwise, try using the location specified by the <base> element.
    if (
      this.document.baseURI &&
      allowedSchemes.includes(new URL(this.document.baseURI).protocol)
    ) {
      return this.document.baseURI;
    }

    // Fall back to returning the document URI, even though the scheme is not
    // in the allowed list.
    return href;
  }
}

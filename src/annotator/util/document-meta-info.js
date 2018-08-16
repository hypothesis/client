'use strict';

/**
 * @typedef MetadataMap
 * @prop {Object} meta - Map of `<meta>` tag names to values
 * @prop {Object} links - Map of `<link>` tag names to values
 */

/**
 * Return a map of document metadata.
 *
 * @param {HTMLHeadElement} headEl
 * @return {MetadataMap}
 */
function documentMetaInfo(headEl) {
  const metaEls = [...headEl.querySelectorAll('meta')];
  const linkEls = [...headEl.querySelectorAll('link')];

  return {
    meta: metaEls.reduce((map, el) => {
      map[el.name] = el.content;
      return map;
    }, {}),

    links: linkEls.reduce((map, el) => {
      map[el.rel] = el.href;
      return map;
    }, {}),
  };
}

module.exports = documentMetaInfo;

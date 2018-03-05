'use strict';

const isEqual = require('lodash.isequal');
const Observable = require('zen-observable');

const documentMetaInfo = require('./document-meta-info');

/**
 * Create an Observable of document metadata gathered from `<meta>` and `<link>`
 * tags.
 *
 * @return {Observable<MetadataMap>}
 */
function documentMetaObservable() {
  const headEl = document.querySelector('head');

  return new Observable(observer => {
    let prevMeta = documentMetaInfo(headEl);

    function checkForMetaChange() {
      const currentMeta = documentMetaInfo(headEl);
      if (!isEqual(currentMeta, prevMeta)) {
        prevMeta = currentMeta;
        observer.next(prevMeta);
      }
    }

    const mo = new MutationObserver(() => {
      mo.takeRecords();
      checkForMetaChange();
    });

    mo.observe(headEl, {
      attributeFilter: ['name', 'content', 'rel', 'href'],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      mo.disconnect();
    };
  });
}

module.exports = documentMetaObservable;

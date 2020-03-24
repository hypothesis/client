/**
 * Fetch all annotations in the same thread as `id`.
 *
 * @return Promise<Array<Annotation>>
 */
function fetchThread(api, id) {
  let annot;
  return api.annotation
    .get({ id: id })
    .then(function(annot) {
      if (annot.references && annot.references.length) {
        // This is a reply, fetch the top-level annotation
        return api.annotation.get({ id: annot.references[0] });
      } else {
        return annot;
      }
    })
    .then(function(annot_) {
      annot = annot_;
      return api.search({ references: annot.id });
    })
    .then(function(searchResult) {
      return [annot].concat(searchResult.rows);
    });
}

// @ngInject
function AnnotationViewerContentController(
  store,
  api,
  rootThread,
  streamer,
  streamFilter,
  annotationMapper
) {
  store.clearAnnotations();

  const annotationId = store.routeParams().id;

  this.rootThread = () => rootThread.thread(store.getState());

  this.setCollapsed = function(id, collapsed) {
    store.setCollapsed(id, collapsed);
  };

  this.ready = fetchThread(api, annotationId).then(function(annots) {
    annotationMapper.loadAnnotations(annots);

    const topLevelAnnot = annots.filter(function(annot) {
      return (annot.references || []).length === 0;
    })[0];

    if (!topLevelAnnot) {
      return;
    }

    streamFilter
      .addClause('/references', 'one_of', topLevelAnnot.id, true)
      .addClause('/id', 'equals', topLevelAnnot.id, true);
    streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    streamer.connect();

    annots.forEach(function(annot) {
      store.setCollapsed(annot.id, false);
    });

    if (topLevelAnnot.id !== annotationId) {
      store.highlightAnnotations([annotationId]);
    }
  });
}

export default {
  controller: AnnotationViewerContentController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/annotation-viewer-content.html'),
};

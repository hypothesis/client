import { createElement } from 'preact';
import { useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { withServices } from '../util/service-context';

import ThreadList from './thread-list';

/**
 * The main content for the single annotation page (aka. https://hypothes.is/a/<annotation ID>)
 */
function AnnotationViewerContent({
  api,
  rootThread: rootThreadService,
  streamer,
  streamFilter,
}) {
  const addAnnotations = useStore(store => store.addAnnotations);
  const annotationId = useStore(store => store.routeParams().id);
  const clearAnnotations = useStore(store => store.clearAnnotations);
  const highlightAnnotations = useStore(store => store.highlightAnnotations);
  const rootThread = useStore(store =>
    rootThreadService.thread(store.getState())
  );
  const setCollapsed = useStore(store => store.setCollapsed);

  useEffect(() => {
    clearAnnotations();

    // TODO - Handle exceptions during the `fetchThread` call.
    fetchThread(api, annotationId).then(annots => {
      addAnnotations(annots);

      const topLevelAnnot = annots.filter(
        ann => (ann.references || []).length === 0
      )[0];

      if (!topLevelAnnot) {
        return;
      }

      streamFilter
        .addClause('/references', 'one_of', topLevelAnnot.id, true)
        .addClause('/id', 'equals', topLevelAnnot.id, true);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
      streamer.connect();

      annots.forEach(annot => setCollapsed(annot.id, false));

      if (topLevelAnnot.id !== annotationId) {
        // FIXME - This should show a visual indication of which reply the
        // annotation ID in the URL refers to. That isn't working.
        highlightAnnotations([annotationId]);
      }
    });
  }, [
    addAnnotations,
    annotationId,
    api,
    clearAnnotations,
    highlightAnnotations,
    setCollapsed,
    streamFilter,
    streamer,
  ]);

  return <ThreadList thread={rootThread} />;
}

AnnotationViewerContent.propTypes = {
  // Injected.
  api: propTypes.object,
  rootThread: propTypes.object,
  streamer: propTypes.object,
  streamFilter: propTypes.object,
};

AnnotationViewerContent.injectedProps = [
  'api',
  'rootThread',
  'streamer',
  'streamFilter',
];

// NOTE: The function below is intentionally at the bottom of the file.
//
// Putting it at the top resulted in an issue where the `createElement` import
// wasn't correctly referenced in the body of `AnnotationViewerContent` in
// the compiled JS, causing a runtime error.

/**
 * Fetch all annotations in the same thread as `id`.
 *
 * @param {Object} api - API client
 * @param {string} id - Annotation ID. This may be an annotation or a reply.
 * @return Promise<Annotation[]> - The annotation, followed by any replies.
 */
async function fetchThread(api, id) {
  let annot = await api.annotation.get({ id });

  if (annot.references && annot.references.length) {
    // This is a reply, fetch the top-level annotation
    annot = await api.annotation.get({ id: annot.references[0] });
  }

  // Fetch all replies to the top-level annotation.
  const replySearchResult = await api.search({ references: annot.id });

  return [annot, ...replySearchResult.rows];
}

export default withServices(AnnotationViewerContent);

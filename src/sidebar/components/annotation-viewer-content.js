import { Fragment, createElement } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { withServices } from '../util/service-context';

import ThreadList from './thread-list';
import SidebarContentError from './sidebar-content-error';

/**
 * The main content for the single annotation page (aka. https://hypothes.is/a/<annotation ID>)
 */
function AnnotationViewerContent({
  api,
  onLogin,
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
  const userid = useStore(store => store.profile().userid);

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setFetchError(false);
    clearAnnotations();

    fetchThread(api, annotationId)
      .then(annots => {
        addAnnotations(annots);

        // Find the top-level annotation in the thread that `annotationId` is
        // part of. This will be different to `annotationId` if `annotationId`
        // is a reply.
        const topLevelAnnot = annots.filter(
          ann => (ann.references || []).length === 0
        )[0];

        if (!topLevelAnnot) {
          // We were able to fetch annotations in the thread that `annotationId`
          // is part of (note that `annotationId` may refer to a reply) but
          // couldn't find a top-level (non-reply) annotation in that thread.
          //
          // This might happen if the top-level annotation was deleted or
          // moderated or had its permissions changed.
          //
          // We need to decide what what be the most useful behavior in this case
          // and implement it.
          /* istanbul ignore next */
          return;
        }

        // Configure the connection to the real-time update service to send us
        // updates to any of the annotations in the thread.
        streamFilter
          .addClause('/references', 'one_of', topLevelAnnot.id, true)
          .addClause('/id', 'equals', topLevelAnnot.id, true);
        streamer.setConfig('filter', { filter: streamFilter.getFilter() });
        streamer.connect();

        // Make the full thread of annotations visible. By default replies are
        // not shown until the user expands the thread.
        annots.forEach(annot => setCollapsed(annot.id, false));

        // FIXME - This should show a visual indication of which reply the
        // annotation ID in the URL refers to. That isn't currently working.
        if (topLevelAnnot.id !== annotationId) {
          highlightAnnotations([annotationId]);
        }
      })
      .catch(() => {
        setFetchError(true);
      });
  }, [
    annotationId,

    // This is not used by the effect but ensures that the annotation is
    // fetched after the user logs in/out, in case the annotation is private.
    userid,

    // Static dependencies.
    addAnnotations,
    api,
    clearAnnotations,
    highlightAnnotations,
    setCollapsed,
    streamFilter,
    streamer,
  ]);

  return (
    <Fragment>
      {fetchError && (
        // This is the same error shown if a direct-linked annotation cannot
        // be fetched in the sidebar. Fortunately the error message makes sense
        // for this scenario as well.
        <SidebarContentError errorType="annotation" onLoginRequest={onLogin} />
      )}
      <ThreadList thread={rootThread} />
    </Fragment>
  );
}

AnnotationViewerContent.propTypes = {
  onLogin: propTypes.func.isRequired,

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

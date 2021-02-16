import { Fragment, createElement } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../util/service-context';
import useRootThread from './hooks/use-root-thread';

import ThreadList from './thread-list';
import SidebarContentError from './sidebar-content-error';

/**
 * @typedef AnnotationViewProps
 * @prop {() => any} onLogin
 * @prop {Object} [loadAnnotationsService] - Injected service
 */

/**
 * The main content for the single annotation page (aka. https://hypothes.is/a/<annotation ID>)
 *
 * @param {AnnotationViewProps} props
 */
function AnnotationView({ loadAnnotationsService, onLogin }) {
  const store = useStoreProxy();
  const annotationId = store.routeParams().id;
  const rootThread = useRootThread();
  const userid = store.profile().userid;

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setFetchError(false);
    store.clearAnnotations();

    loadAnnotationsService
      .loadThread(annotationId)
      .then(annots => {
        // Find the top-level annotation in the thread that `annotationId` is
        // part of. This will be different to `annotationId` if `annotationId`
        // is a reply. A top-level annotation will not have any references.
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

        // Make the full thread of annotations visible. By default replies are
        // not shown until the user expands the thread.
        annots.forEach(annot => store.setExpanded(annot.id, true));

        // FIXME - This should show a visual indication of which reply the
        // annotation ID in the URL refers to. That isn't currently working.
        if (topLevelAnnot.id !== annotationId) {
          store.highlightAnnotations([annotationId]);
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
    loadAnnotationsService,
    store,
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

AnnotationView.propTypes = {
  onLogin: propTypes.func.isRequired,
  loadAnnotationsService: propTypes.object,
};

AnnotationView.injectedProps = ['loadAnnotationsService'];

export default withServices(AnnotationView);

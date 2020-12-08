import { createElement } from 'preact';
import propTypes from 'prop-types';
import { useEffect, useRef } from 'preact/hooks';

import useRootThread from './hooks/use-root-thread';
import { withServices } from '../util/service-context';
import { useStoreProxy } from '../store/use-store';
import { tabForAnnotation } from '../util/tabs';

import FilterStatus from './filter-status';
import LoggedOutMessage from './logged-out-message';
import LoginPromptPanel from './login-prompt-panel';
import SelectionTabs from './selection-tabs';
import SidebarContentError from './sidebar-content-error';
import ThreadList from './thread-list';

/**
 * @typedef SidebarViewProps
 * @prop {() => any} onLogin
 * @prop {() => any} onSignUp
 * @prop {Object} [frameSync] - Injected service
 * @prop {Object} [loadAnnotationsService]  - Injected service
 * @prop {Object} [streamer] - Injected service
 */

/**
 * Render the sidebar and its components
 *
 * @param {SidebarViewProps} props
 */
function SidebarView({
  frameSync,
  onLogin,
  onSignUp,
  loadAnnotationsService,
  streamer,
}) {
  const rootThread = useRootThread();

  // Store state values
  const store = useStoreProxy();
  const focusedGroupId = store.focusedGroupId();
  const hasAppliedFilter =
    store.hasAppliedFilter() || store.hasSelectedAnnotations();
  const isLoading = store.isLoading();
  const isLoggedIn = store.isLoggedIn();

  const linkedAnnotationId = store.directLinkedAnnotationId();
  const linkedAnnotation = linkedAnnotationId
    ? store.findAnnotationByID(linkedAnnotationId)
    : undefined;
  const directLinkedTab = linkedAnnotation
    ? tabForAnnotation(linkedAnnotation)
    : 'annotation';

  const searchUris = store.searchUris();
  const sidebarHasOpened = store.hasSidebarOpened();
  const userId = store.profile().userid;

  // The local `$tag` of a direct-linked annotation; populated once it
  // has anchored: meaning that it's ready to be focused and scrolled to
  const linkedAnnotationAnchorTag =
    linkedAnnotation && linkedAnnotation.$orphan === false
      ? linkedAnnotation.$tag
      : null;

  // If, after loading completes, no `linkedAnnotation` object is present when
  // a `linkedAnnotationId` is set, that indicates an error
  const hasDirectLinkedAnnotationError =
    !isLoading && linkedAnnotationId ? !linkedAnnotation : false;

  const hasDirectLinkedGroupError = store.directLinkedGroupFetchFailed();

  const hasContentError =
    hasDirectLinkedAnnotationError || hasDirectLinkedGroupError;

  const showFilterStatus = !hasContentError;
  const showTabs = !hasContentError && !hasAppliedFilter;

  // Show a CTA to log in if successfully viewing a direct-linked annotation
  // and not logged in
  const showLoggedOutMessage =
    linkedAnnotationId &&
    !isLoggedIn &&
    !hasDirectLinkedAnnotationError &&
    !isLoading;

  /** @type {import("preact/hooks").Ref<string|null>} */
  const prevGroupId = useRef(focusedGroupId);

  // Reload annotations when group, user or document search URIs change
  useEffect(() => {
    if (!prevGroupId.current || prevGroupId.current !== focusedGroupId) {
      // Clear any selected annotations when the group ID changes
      store.clearSelection();
      prevGroupId.current = focusedGroupId;
    }
    if (focusedGroupId && searchUris.length) {
      loadAnnotationsService.load({
        groupId: focusedGroupId,
        uris: searchUris,
      });
    }
  }, [store, loadAnnotationsService, focusedGroupId, userId, searchUris]);

  // When a `linkedAnnotationAnchorTag` becomes available, scroll to it
  // and focus it
  useEffect(() => {
    if (linkedAnnotationAnchorTag) {
      frameSync.focusAnnotations([linkedAnnotationAnchorTag]);
      frameSync.scrollToAnnotation(linkedAnnotationAnchorTag);
      store.selectTab(directLinkedTab);
    } else if (linkedAnnotation) {
      // Make sure to allow for orphaned annotations (which won't have an anchor)
      store.selectTab(directLinkedTab);
    }
  }, [
    directLinkedTab,
    frameSync,
    linkedAnnotation,
    linkedAnnotationAnchorTag,
    store,
  ]);

  // Connect to the streamer when the sidebar has opened or if user is logged in
  useEffect(() => {
    if (sidebarHasOpened || isLoggedIn) {
      streamer.connect();
    }
  }, [streamer, sidebarHasOpened, isLoggedIn]);

  return (
    <div>
      <h2 className="u-screen-reader-only">Annotations</h2>
      {showFilterStatus && <FilterStatus />}
      <LoginPromptPanel onLogin={onLogin} onSignUp={onSignUp} />
      {hasDirectLinkedAnnotationError && (
        <SidebarContentError
          errorType="annotation"
          onLoginRequest={onLogin}
          showClearSelection={true}
        />
      )}
      {hasDirectLinkedGroupError && (
        <SidebarContentError errorType="group" onLoginRequest={onLogin} />
      )}
      {showTabs && <SelectionTabs isLoading={isLoading} />}
      <ThreadList thread={rootThread} />
      {showLoggedOutMessage && <LoggedOutMessage onLogin={onLogin} />}
    </div>
  );
}

SidebarView.propTypes = {
  onLogin: propTypes.func.isRequired,
  onSignUp: propTypes.func.isRequired,
  frameSync: propTypes.object,
  loadAnnotationsService: propTypes.object,
  streamer: propTypes.object,
};

SidebarView.injectedProps = ['frameSync', 'loadAnnotationsService', 'streamer'];

export default withServices(SidebarView);

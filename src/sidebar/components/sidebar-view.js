import { createElement } from 'preact';
import propTypes from 'prop-types';
import { useEffect, useRef } from 'preact/hooks';

import useRootThread from './hooks/use-root-thread';
import { withServices } from '../util/service-context';
import useStore from '../store/use-store';
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
  const focusedGroupId = useStore(store => store.focusedGroupId());
  const hasAppliedFilter = useStore(store => store.hasAppliedFilter());
  const isLoading = useStore(store => store.isLoading());
  const isLoggedIn = useStore(store => store.isLoggedIn());

  const linkedAnnotationId = useStore(store =>
    store.directLinkedAnnotationId()
  );
  const linkedAnnotation = useStore(store => {
    return linkedAnnotationId
      ? store.findAnnotationByID(linkedAnnotationId)
      : undefined;
  });
  const directLinkedTab = linkedAnnotation
    ? tabForAnnotation(linkedAnnotation)
    : 'annotation';

  const searchUris = useStore(store => store.searchUris());
  const sidebarHasOpened = useStore(store => store.hasSidebarOpened());
  const userId = useStore(store => store.profile().userid);

  // The local `$tag` of a direct-linked annotation; populated once it
  // has anchored: meaning that it's ready to be focused and scrolled to
  const linkedAnnotationAnchorTag =
    linkedAnnotation && linkedAnnotation.$orphan === false
      ? linkedAnnotation.$tag
      : null;

  // Actions
  const clearSelection = useStore(store => store.clearSelection);
  const selectTab = useStore(store => store.selectTab);

  // If, after loading completes, no `linkedAnnotation` object is present when
  // a `linkedAnnotationId` is set, that indicates an error
  const hasDirectLinkedAnnotationError =
    !isLoading && linkedAnnotationId ? !linkedAnnotation : false;

  const hasDirectLinkedGroupError = useStore(store =>
    store.directLinkedGroupFetchFailed()
  );

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
      clearSelection();
      prevGroupId.current = focusedGroupId;
    }
    if (focusedGroupId && searchUris.length) {
      loadAnnotationsService.load({
        groupId: focusedGroupId,
        uris: searchUris,
      });
    }
  }, [
    clearSelection,
    loadAnnotationsService,
    focusedGroupId,
    userId,
    searchUris,
  ]);

  // When a `linkedAnnotationAnchorTag` becomes available, scroll to it
  // and focus it
  useEffect(() => {
    if (linkedAnnotationAnchorTag) {
      frameSync.focusAnnotations([linkedAnnotationAnchorTag]);
      frameSync.scrollToAnnotation(linkedAnnotationAnchorTag);
      selectTab(directLinkedTab);
    } else if (linkedAnnotation) {
      // Make sure to allow for orphaned annotations (which won't have an anchor)
      selectTab(directLinkedTab);
    }
  }, [
    directLinkedTab,
    frameSync,
    linkedAnnotation,
    linkedAnnotationAnchorTag,
    selectTab,
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

import { useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import { withServices } from '../service-context';
import useRootThread from './hooks/use-root-thread';
import { useStoreProxy } from '../store/use-store';

import NotebookFilters from './NotebookFilters';
import NotebookResultCount from './NotebookResultCount';
import ThreadList from './ThreadList';

/**
 * @typedef NotebookViewProps
 * @prop {Object} [loadAnnotationsService] - Injected service
 */

/**
 * The main content of the "notebook" route (https://hypothes.is/notebook)
 *
 * @param {NotebookViewProps} props
 */
function NotebookView({ loadAnnotationsService }) {
  const store = useStoreProxy();
  const focusedGroup = store.focusedGroup();

  // Reload annotations if focused group changes
  useEffect(() => {
    // Load all annotations in the group, unless there are more than 5000
    // of them: this is a performance safety valve
    store.setSortKey('Newest');
    if (focusedGroup) {
      loadAnnotationsService.load({
        groupId: focusedGroup.id,
        maxResults: 5000,
      });
    }
  }, [loadAnnotationsService, focusedGroup, store]);

  const rootThread = useRootThread();
  const groupName = focusedGroup?.name ?? '…';

  return (
    <div className="NotebookView">
      <header className="NotebookView__heading">
        <h1 className="NotebookView__group-name">{groupName}</h1>
      </header>
      <div className="NotebookView__filters">
        <NotebookFilters />
      </div>
      <div className="NotebookView__results">
        <NotebookResultCount />
      </div>
      <div className="NotebookView__items">
        <ThreadList threads={rootThread.children} />
      </div>
    </div>
  );
}

NotebookView.propTypes = {
  loadAnnotationsService: propTypes.object,
};

NotebookView.injectedProps = ['loadAnnotationsService'];

export default withServices(NotebookView);

import { Button, CardActions, Input } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../../store';
import LoadingSpinner from './LoadingSpinner';

/**
 * Render content for "export" tab panel
 */
export default function ExportAnnotations() {
  const store = useSidebarStore();
  const group = store.focusedGroup();
  const exportReady = group && !store.isLoading();
  const annotations = store.allAnnotations();

  if (!exportReady) {
    return <LoadingSpinner />;
  }

  // TODO: Handle 0 annotations
  return (
    <>
      <p>
        Export <strong>{annotations.length} annotations</strong> in a file
        named:
      </p>
      <Input id="export-filename" value="filename-tbd-export.json" />
      <CardActions>
        <Button variant="primary" disabled>
          Export
        </Button>
      </CardActions>
    </>
  );
}

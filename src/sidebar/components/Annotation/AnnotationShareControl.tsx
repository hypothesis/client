import { AnnotationShareControl as BaseAnnotationShareControl } from '@hypothesis/annotation-ui';
import { useCallback } from 'preact/hooks';

import type { Annotation } from '../../../types/api';
import { withServices } from '../../service-context';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';

export type AnnotationShareControlProps = {
  annotation: Annotation;

  // Injected
  toastMessenger: ToastMessengerService;
};

/**
 * "Popup"-style component for sharing a single annotation.
 */
function AnnotationShareControl({
  annotation,
  toastMessenger,
}: AnnotationShareControlProps) {
  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);

  const copyShareLink = useCallback(
    async (result: { ok: boolean }) => {
      if (result.ok) {
        toastMessenger.success('Copied share link to clipboard');
      } else {
        toastMessenger.error('Unable to copy link');
      }
    },
    [toastMessenger],
  );

  return (
    <BaseAnnotationShareControl
      annotation={annotation}
      group={group ?? null}
      onCopy={copyShareLink}
      data-testid="base-share-control"
    />
  );
}

export default withServices(AnnotationShareControl, ['toastMessenger']);

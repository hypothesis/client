import BaseToastMessages from '../../shared/components/BaseToastMessages';
import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type ToastMessageProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * A component designed to render toast messages handled by the sidebar store.
 */
function ToastMessages({ toastMessenger }: ToastMessageProps) {
  const store = useSidebarStore();
  const messages = store.getToastMessages();

  return (
    <BaseToastMessages
      messages={messages}
      onMessageDismiss={(id: string) => toastMessenger.dismiss(id)}
    />
  );
}

export default withServices(ToastMessages, ['toastMessenger']);

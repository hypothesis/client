import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import DependencyLessToastMessages from './DependencyLessToastMessages';

export type ToastMessageProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 */
function ToastMessages({ toastMessenger }: ToastMessageProps) {
  const store = useSidebarStore();
  const messages = store.getToastMessages();

  return (
    <DependencyLessToastMessages
      messages={messages}
      onMessageDismiss={(id: string) => toastMessenger.dismiss(id)}
    />
  );
}

export default withServices(ToastMessages, ['toastMessenger']);

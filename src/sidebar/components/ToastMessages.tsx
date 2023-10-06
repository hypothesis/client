import { ToastMessages as BaseToastMessages } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type ToastMessageProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * Component that renders the active toast messages from the sidebar store
 */
function ToastMessages({ toastMessenger }: ToastMessageProps) {
  const store = useSidebarStore();
  const messages = store.getToastMessages();

  return (
    <div
      className={classnames(
        // Ensure toast messages are rendered above other content
        'z-10',
        'absolute left-0 w-full',
      )}
    >
      <BaseToastMessages
        messages={messages}
        onMessageDismiss={(id: string) => toastMessenger.dismiss(id)}
        transitionClasses={{
          transitionIn:
            'motion-safe:animate-slide-in-from-right lg:animate-fade-in motion-reduce:animate-fade-in',
        }}
      />
    </div>
  );
}

export default withServices(ToastMessages, ['toastMessenger']);

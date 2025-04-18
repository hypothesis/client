import { ToastMessages as BaseToastMessages } from '@hypothesis/frontend-shared';
import type { ToastMessage } from '@hypothesis/frontend-shared';
import { useCallback, useEffect, useState } from 'preact/hooks';

import type { Emitter } from '../util/emitter';

export type ToastMessagesEvents = {
  toastMessageAdded(msg: ToastMessage): void;
  toastMessageDismissed(id: string): void;
};

export type ToastMessagesProps = {
  emitter: Emitter<ToastMessagesEvents>;
};

/**
 * A component that renders toast messages published from the sidebar, in a way
 * that they "appear" in the viewport even when the sidebar is collapsed.
 * This is useful to make sure screen readers announce hidden messages.
 */
export default function ToastMessages({ emitter }: ToastMessagesProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const addMessage = useCallback(
    (newMessage: ToastMessage) => setMessages(prev => [...prev, newMessage]),
    [],
  );
  const dismissMessage = useCallback(
    (messageId: string) =>
      setMessages(prev => prev.filter(message => message.id !== messageId)),
    [],
  );

  useEffect(() => {
    emitter.subscribe('toastMessageAdded', addMessage);
    emitter.subscribe('toastMessageDismissed', dismissMessage);

    return () => {
      emitter.unsubscribe('toastMessageAdded', addMessage);
      emitter.unsubscribe('toastMessageDismissed', dismissMessage);
    };
  }, [emitter, dismissMessage, addMessage]);

  return (
    <BaseToastMessages messages={messages} onMessageDismiss={dismissMessage} />
  );
}

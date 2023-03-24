import { useCallback, useEffect, useState } from 'preact/hooks';

import BaseToastMessages from '../../shared/components/BaseToastMessages';
import type { ToastMessage } from '../../shared/components/BaseToastMessages';
import type { PortRPC } from '../../shared/messaging';
import type {
  HostToSidebarEvent,
  SidebarToHostEvent,
} from '../../types/port-rpc-events';

export type ToastMessagesProps = {
  sidebarRPC: PortRPC<SidebarToHostEvent, HostToSidebarEvent>;
};

/**
 * A component that renders toast messages coming from the sidebar, in a way
 * that they "appear" in the viewport even when the sidebar is collapsed.
 * This is useful to make sure screen readers announce hidden messages.
 */
export default function ToastMessages({ sidebarRPC }: ToastMessagesProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const addMessage = useCallback(
    (newMessage: ToastMessage) => setMessages(prev => [...prev, newMessage]),
    []
  );
  const dismissMessage = useCallback(
    (messageId: string) =>
      setMessages(prev => prev.filter(message => message.id !== messageId)),
    []
  );

  useEffect(() => {
    sidebarRPC.on('toastMessageAdded', addMessage);
    sidebarRPC.on('toastMessageDismissed', dismissMessage);
  }, [sidebarRPC, dismissMessage, addMessage]);

  return (
    <BaseToastMessages messages={messages} onMessageDismiss={dismissMessage} />
  );
}

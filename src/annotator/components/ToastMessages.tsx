import { useCallback, useEffect, useState } from 'preact/hooks';

import BaseToastMessages from '../../shared/components/BaseToastMessages';
import type { PortRPC } from '../../shared/messaging';
import type { ToastMessage } from '../../sidebar/store/modules/toast-messages';
import type {
  HostToSidebarEvent,
  SidebarToHostEvent,
} from '../../types/port-rpc-events';

export type HostToastMessagesProps = {
  sidebarRPC: PortRPC<SidebarToHostEvent, HostToSidebarEvent>;
};

/**
 * A component designed to render toast messages coming from the sidebar, in a
 * way that they "appear" in the viewport even when the sidebar is collapsed.
 * This is useful to make sure screen readers announce hidden messages.
 */
export default function ToastMessages({ sidebarRPC }: HostToastMessagesProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const pushMessage = useCallback(
    (newMessage: ToastMessage) => setMessages(prev => [...prev, newMessage]),
    []
  );
  const dismissMessage = useCallback(
    (messageId: string) =>
      setMessages(prev => prev.filter(message => message.id !== messageId)),
    []
  );

  useEffect(() => {
    sidebarRPC.on('toastMessageAdded', pushMessage);
    sidebarRPC.on('toastMessageDismissed', dismissMessage);
  }, [sidebarRPC, dismissMessage, pushMessage]);

  return (
    <BaseToastMessages messages={messages} onMessageDismiss={dismissMessage} />
  );
}

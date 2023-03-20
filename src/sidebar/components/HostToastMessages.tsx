import { useCallback, useEffect, useState } from 'preact/hooks';

import type { PortRPC } from '../../shared/messaging';
import type {
  HostToSidebarEvent,
  SidebarToHostEvent,
} from '../../types/port-rpc-events';
import type { ToastMessage } from '../store/modules/toast-messages';
import DependencyLessToastMessages from './DependencyLessToastMessages';

export type HostToastMessagesProps = {
  sidebarRPC: PortRPC<SidebarToHostEvent, HostToSidebarEvent>;
};

/**
 * A component designed to render toast messages coming from the sidebar, in a
 * way that they "appear" in the viewport even when the sidebar is collapsed.
 * This is useful to make sure screen readers announce hidden messages.
 */
export default function HostToastMessages({
  sidebarRPC,
}: HostToastMessagesProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const pushNewMessage = useCallback(
    (newMessage: ToastMessage) => setMessages(prev => [...prev, newMessage]),
    []
  );

  useEffect(() => {
    sidebarRPC.on('toastMessagePushed', (message: ToastMessage) => {
      console.log('Hi!');
      pushNewMessage(message);
    });
  }, [sidebarRPC, pushNewMessage]);

  return (
    <DependencyLessToastMessages
      messages={messages}
      onMessageDismiss={() => {}}
    />
  );
}

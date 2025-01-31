import { Button, Card, Tab } from '@hypothesis/frontend-shared';

import classnames from 'classnames';
import { nip19 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';
import { useId, useState, useRef, useEffect } from 'preact/hooks';

import { useSidebarStore } from '../store';
import type { State as NostrSettingsState } from '../store/modules/nostr';
import SidebarPanel from './SidebarPanel';
import TabHeader from './tabs/TabHeader';
import TabPanel from './tabs/TabPanel';

type NostrConnectPanelProps = {
  onClose: () => void;
  onSavePrivateKey: (privateKey: Uint8Array) => void;
};

type PanelKey = NostrSettingsState['connectMode'];

export default function NostrConnectPanel({
  onClose,
  onSavePrivateKey,
}: NostrConnectPanelProps) {
  const store = useSidebarStore();
  const isOpen = store.isSidebarPanelOpen('nostrConnect');
  const [activeSubPanel, setActiveSubPanel] = useState<PanelKey>('nsec');
  const nsecRef = useRef<HTMLInputElement>(null);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(
    store.getPrivateKey(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const privateKeyTabId = useId();
  const privateKeyPanelId = useId();
  const remoteSignerTabId = useId();
  const remoteSignerPanelId = useId();

  const [privateKeyHex, setPrivateKeyHex] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && privateKey) {
      setPrivateKeyHex(bytesToHex(privateKey));

      const nsec = getEncodedNsec(privateKey);
      
      if (nsec && nsecRef.current) {
        nsecRef.current.value = nsec;
      }
    }
  }, [isOpen, privateKey]);

  if (!isOpen) {
    return null;
  }

  const handleDecoding = () => {
    try {
      if (nsecRef.current?.value) {
        const decoded = nip19.decode(nsecRef.current.value);
        
        if (decoded.type === 'nsec') {
          setPrivateKey(decoded.data);
          setError(null); // Clear error on success
        }
      }
    } catch (err) {
      setError('Invalid private key format');

      console.error('Failed to decode private key:', err);
    }
  };

  const getEncodedNsec = (privateKey: Uint8Array): string | null => {
    try {
      return nip19.nsecEncode(privateKey);
    } catch (err) {
      console.error('Failed to encode private key:', err);
      
      return null;
    }
  };

  const handleSaveAndConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!privateKey) {
        setError('Please enter a valid private key');
        return;
      }

      onSavePrivateKey(privateKey);
      onClose();
    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SidebarPanel
      title="Connect to Nostr"
      panelName="nostrConnect"
      onActiveChanged={active => !active && onClose()}
      variant="custom"
    >
      <TabHeader closeTitle="Close Nostr Connect panel">
        <Tab
          id={privateKeyTabId}
          aria-controls={privateKeyPanelId}
          variant="tab"
          textContent="Private Key"
          selected={activeSubPanel === 'nsec'}
          onClick={() => setActiveSubPanel('nsec')}
        >
          Private Key
        </Tab>
        <Tab
          id={remoteSignerTabId}
          aria-controls={remoteSignerPanelId}
          variant="tab"
          textContent="Remote Signer"
          selected={activeSubPanel === 'nostr-connect'}
          onClick={() => setActiveSubPanel('nostr-connect')}
        >
          Remote Signer
        </Tab>
      </TabHeader>
      <Card
        classes={classnames({
          'rounded-tl-none': activeSubPanel === 'nsec',
        })}
      >
        <div className="border-b">
          <TabPanel
            id={privateKeyPanelId}
            aria-labelledby={privateKeyTabId}
            active={activeSubPanel === 'nsec'}
            title="Connect with Private Key"
          >
            <div className="p-4">
              {error && (
                <p className="text-red-600 mb-4" role="alert">
                  {error}
                </p>
              )}
              <input type="hidden" value={privateKeyHex ?? ''} />
              <p className="text-color-text-light mb-4">
                Paste your Nostr private key in nsec format to connect.
              </p>
              <div className="relative mb-4">
                <input
                  ref={nsecRef}
                  type="password"
                  className="w-full border rounded p-2 pr-10"
                  placeholder="nsec1..."
                  aria-label="Private key"
                  onChange={handleDecoding}
                />
              </div>

              <p className="text-color-text-light mb-4">
                You can generate a new Nostr private key and a profile via
                <a
                  href="https://start.njump.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://start.njump.me/
                </a>
              </p>
              <p className="text-color-text-light mb-4">
                After creating one, copy the private key (nsec) and paste it
                here.
              </p>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleSaveAndConnect}
                  disabled={isConnecting || !privateKeyHex}
                >
                  {isConnecting ? 'Connecting...' : 'Save & Connect'}
                </Button>
              </div>
            </div>
          </TabPanel>
          <TabPanel
            id={remoteSignerPanelId}
            aria-labelledby={remoteSignerTabId}
            active={activeSubPanel === 'nostr-connect'}
            title="Connect with Remote Signer"
          >
            <div className="p-4">
              <p className="text-color-text-light mb-4">
                Connect using a remote signer like Amber (Android), Nostrify
                (iOS), or nsec.app (Web)
              </p>
              <div className="flex gap-2 justify-end">
                <Button onClick={() => {}}>Save Private Key</Button>
              </div>
            </div>
          </TabPanel>
        </div>
      </Card>
    </SidebarPanel>
  );
}

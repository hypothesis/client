import { ProfileIcon, Spinner } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import { useSidebarStore } from '../store';
import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

export type NostrUserMenuProps = {
  onNostrLogout: () => void;
};

/**
 * A menu with Nostr user and account links.
 *
 * This menu will contain Nostr-specific items and functionality.
 */
export default function NostrUserMenu({ onNostrLogout }: NostrUserMenuProps) {
  const store = useSidebarStore();
  const profile = store.getProfile();
  const isLoading = store.isProfileLoading();
  const [isOpen, setOpen] = useState(false);

  // For now, using a placeholder display name
  const displayName = profile?.displayName ?? 'Nostr User';

  // Add this function to handle opening the NostrConnectPanel
  const openNostrConnectPanel = () => {
    store.toggleSidebarPanel('nostrConnect');
    setOpen(false); // Close the menu after clicking
  };

  const menuLabel = (
    <span className="p-1">
      {
        profile?.picture 
          ? <img src={profile.picture} alt="Profile" width={20} height={20} /> 
          : <ProfileIcon />
      }
    </span>
  );

  return (
    <>
      {isLoading && <Spinner />}
      {!isLoading && (
        <Menu
          label={menuLabel}
          title={displayName}
          align="right"
          open={isOpen}
          onOpenChanged={setOpen}
        >
          <MenuSection>
            <MenuItem label={displayName} isDisabled={false} />
            <MenuItem label="Nostr settings" onClick={openNostrConnectPanel} />
          </MenuSection>
          <MenuSection>
            <MenuItem label="Log out" onClick={onNostrLogout} />
          </MenuSection>
        </Menu>
      )}
    </>
  );
}

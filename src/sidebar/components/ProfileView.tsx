import { useSidebarStore } from '../store';

export default function ProfileView() {
  const store = useSidebarStore();

  if (!store.isFeatureEnabled('client_user_profile')) {
    return null;
  }

  return (
    <div className="text-center" data-testid="profile-container">
      Profile
    </div>
  );
}

import { useEffect, useRef, useState } from 'preact/hooks';
import classnames from 'classnames';
import { CancelIcon, IconButton } from '@hypothesis/frontend-shared/lib/next';

import type { Emitter, EventBus } from '../util/emitter';

export type ProfileConfig = { profileAppUrl: string } & Record<string, unknown>;

type ProfileModalProps = {
  eventBus: EventBus;
  config: ProfileConfig;
};

export function ProfileModal({ eventBus, config }: ProfileModalProps) {
  const [isHidden, setIsHidden] = useState(true);
  const originalDocumentOverflowStyle = useRef('');
  const emitterRef = useRef<Emitter | null>(null);

  // Stores the original overflow CSS property of document.body and reset it
  // when the component is destroyed
  useEffect(() => {
    originalDocumentOverflowStyle.current = document.body.style.overflow;

    return () => {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    };
  }, []);

  // The overflow CSS property is set to hidden to prevent scrolling of the host page,
  // while the profile modal is open. It is restored when the modal is closed.
  useEffect(() => {
    if (isHidden) {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    } else {
      document.body.style.overflow = 'hidden';
    }
  }, [isHidden]);

  useEffect(() => {
    const emitter = eventBus.createEmitter();
    emitter.subscribe('openProfile', () => {
      console.log('Open!');
      setIsHidden(false);
    });
    emitterRef.current = emitter;

    return () => {
      emitter.destroy();
    };
  }, [eventBus]);

  const onClose = () => {
    setIsHidden(true);
    emitterRef.current?.publish('closeProfile');
  };

  return (
    <div
      className={classnames(
        'fixed z-max top-0 left-0 right-0 bottom-0 p-3 bg-black/50',
        { hidden: isHidden }
      )}
      data-testid="profile-outer"
    >
      <div className="relative w-full h-full" data-testid="profile-inner">
        <div className="absolute right-0 m-3">
          <IconButton
            title="Close the Profile"
            onClick={onClose}
            variant="dark"
            classes={classnames(
              // Remove the dark variant's background color to avoid
              // interfering with modal overlays. Re-activate the dark variant's
              // background color on hover.
              // See https://github.com/hypothesis/client/issues/3676
              '!bg-transparent enabled:hover:!bg-grey-3'
            )}
          >
            <CancelIcon className="w-4 h-4" />
          </IconButton>
        </div>
        <iframe
          title={'Hypothesis profile'}
          className="h-full w-full border-0"
          // Enable media in annotations to be shown fullscreen.
          // TODO: Use `allow="fullscreen" once `allow` attribute available for
          // iframe elements in all supported browsers
          // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-allow
          // eslint-disable-next-line react/no-unknown-property
          allowFullScreen
          src={config.profileAppUrl}
        />
      </div>
    </div>
  );
}

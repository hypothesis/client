import { render } from 'preact';

import type { Destroyable } from '../types/annotator';

import type { ProfileConfig } from './components/ProfileModal';
import { ProfileModal } from './components/ProfileModal';
import type { EventBus } from './util/emitter';
import { createShadowRoot } from './util/shadow-root';

export class Profile implements Destroyable {
  private _outerContainer: HTMLElement;
  public shadowRoot: ShadowRoot;

  constructor(element: HTMLElement, eventBus: EventBus, config: ProfileConfig) {
    this._outerContainer = document.createElement('hypothesis-profile');
    element.appendChild(this._outerContainer);
    this.shadowRoot = createShadowRoot(this._outerContainer);

    render(
      <ProfileModal eventBus={eventBus} config={config} />,
      this.shadowRoot
    );
  }

  destroy(): void {
    render(null, this.shadowRoot);
    this._outerContainer.remove();
  }
}

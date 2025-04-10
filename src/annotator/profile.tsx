import type { Destroyable, Events } from '../types/annotator';
import type { ProfileConfig } from './components/ProfileModal';
import ProfileModal from './components/ProfileModal';
import type { EventBus } from './util/emitter';
import { PreactContainer } from './util/preact-container';

export class Profile implements Destroyable {
  private _container: PreactContainer;

  constructor(
    element: HTMLElement,
    eventBus: EventBus<Events>,
    config: ProfileConfig,
  ) {
    this._container = new PreactContainer('profile', () => (
      <ProfileModal eventBus={eventBus} config={config} />
    ));
    element.append(this._container.element);
    this._container.render();
  }

  destroy(): void {
    this._container.destroy();
  }
}

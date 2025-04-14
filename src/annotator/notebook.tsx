import type { Destroyable } from '../types/annotator';
import NotebookModal from './components/NotebookModal';
import type {
  NotebookConfig,
  NotebookEvents,
} from './components/NotebookModal';
import type { EventBus } from './util/emitter';
import { PreactContainer } from './util/preact-container';

export class Notebook implements Destroyable {
  private _container: PreactContainer;

  /**
   * @param eventBus - Enables communication between components sharing the
   *   same eventBus
   */
  constructor(
    element: HTMLElement,
    eventBus: EventBus<NotebookEvents>,
    config: NotebookConfig,
  ) {
    this._container = new PreactContainer('notebook', () => (
      <NotebookModal eventBus={eventBus} config={config} />
    ));
    element.append(this._container.element);
    this._container.render();
  }

  destroy() {
    this._container.destroy();
  }
}

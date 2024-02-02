import type { Destroyable } from '../types/annotator';
import OutsideAssignmentNotice from './components/OutsideAssignmentNotice';
import { PreactContainer } from './util/preact-container';

/**
 * Notice displayed in the guest frame informing users that they are viewing
 * part of the document that is outside the scope of the current activity (eg.
 * a classroom assignment).
 */
export class OutsideAssignmentNoticeController implements Destroyable {
  private _container: PreactContainer;
  private _visible: boolean;

  constructor(container: HTMLElement) {
    this._visible = false;
    this._container = new PreactContainer('notice', () => this._render());
    container.appendChild(this._container.element);
  }

  destroy() {
    this._container.destroy();
  }

  setVisible(visible: boolean) {
    this._visible = visible;
    this._container.render();
  }

  private _render() {
    if (!this._visible) {
      return null;
    }
    return <OutsideAssignmentNotice />;
  }
}

import Delegator from './delegator';

export default class Notebook extends Delegator {
  constructor(element, config) {
    super(element, config);
    // TODO?: handle external container?

    this.container = document.createElement('div');
    this.container.style.display = 'none';
    // TODO?: Is there any necessity to handle theme-clean?
    this.container.className = 'notebook-outer';

    // TODO: this.inner will become this.frame (likely) and will be an iframe
    this.inner = document.createElement('div');
    this.inner.className = 'notebook-inner';
    // TODO: entirely temporary
    this.inner.onclick = event => {
      event.stopPropagation();
      this.publish('hideNotebook');
    };

    this.container.appendChild(this.inner);
    this.element.appendChild(this.container);

    this.subscribe('showNotebook', () => this.show());
    this.subscribe('hideNotebook', () => this.hide());
    // If the sidebar has opened, get out of the way
    this.subscribe('sidebarOpened', () => this.hide());
  }

  show() {
    // TODO check for iframe initialization
    this.container.style.display = '';
  }

  hide() {
    this.container.style.display = 'none';
  }

  destroy() {
    // TBD
    return;
  }
}

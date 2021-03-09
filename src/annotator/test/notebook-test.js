import Notebook from '../notebook';
import { EventBus } from '../util/emitter';

describe('Notebook', () => {
  // `Notebook` instances created by current test
  let notebooks;

  const createNotebook = (config = {}) => {
    config = { notebookAppUrl: '/base/annotator/test/empty.html', ...config };
    const element = document.createElement('div');
    const eventBus = new EventBus();
    const notebook = new Notebook(element, eventBus, config);

    notebooks.push(notebook);

    return notebook;
  };

  beforeEach(() => {
    notebooks = [];
  });

  afterEach(() => {
    notebooks.forEach(n => n.destroy());
  });

  describe('notebook container frame', () => {
    it('is not created until the notebook is shown', () => {
      const notebook = createNotebook();
      assert.isNull(notebook.container);

      notebook.open();
      assert.isNotNull(notebook.container);
    });

    it('is not created if `hide` is called before notebook is first shown', () => {
      const notebook = createNotebook();
      notebook.close();
      assert.isNull(notebook.container);
    });

    it('displays when opened', () => {
      const notebook = createNotebook();

      notebook.open();

      assert.equal(notebook.container.style.display, '');
      assert.isTrue(notebook.container.classList.contains('is-open'));
    });

    it('hides when closed', () => {
      const notebook = createNotebook();

      notebook.open();
      notebook.close();

      assert.equal(notebook.container.style.display, 'none');
      assert.isFalse(notebook.container.classList.contains('is-open'));
    });
  });

  describe('creating the notebook iframe', () => {
    it('creates the iframe when the notebook is opened for the first time', () => {
      const notebook = createNotebook();

      assert.isNull(notebook.frame);

      notebook.open();

      assert.isTrue(notebook.frame instanceof Element);
    });

    it('sets the iframe source to the configured `notebookAppUrl`', () => {
      const notebook = createNotebook({
        notebookAppUrl: 'http://www.example.com/foo/bar',
      });

      notebook.open();

      // The rest of the config gets added as a hash to the end of the src,
      // so split that off and look at the string before it
      assert.equal(
        notebook.frame.src.split('#')[0],
        'http://www.example.com/foo/bar'
      );
    });

    it('does not create a new iframe if opened again with same group ID', () => {
      const notebook = createNotebook();
      notebook._groupId = 'mygroup';

      // The first opening will create a new iFrame
      notebook._emitter.publish('openNotebook', 'myGroup');
      const removeSpy = sinon.spy(notebook.frame, 'remove');
      // Open it again — the group hasn't changed so the iframe won't be
      // replaced
      notebook._emitter.publish('openNotebook', 'myGroup');

      assert.notCalled(removeSpy);
    });

    it('does not create a new iframe if shown again with same group ID', () => {
      const notebook = createNotebook();
      notebook._groupId = 'mygroup';

      // First open: creates an iframe
      notebook._emitter.publish('openNotebook', 'myGroup');
      const removeSpy = sinon.spy(notebook.frame, 'remove');

      // Open again with another group
      notebook._emitter.publish('openNotebook', 'anotherGroup');

      // Open again, which will remove the first iframe and create a new one
      notebook.open();
      assert.calledOnce(removeSpy);
    });
  });

  describe('responding to user input', () => {
    it('closes the notebook when close button clicked', () => {
      const notebook = createNotebook();

      notebook.open();

      const button = notebook.container.getElementsByClassName(
        'Notebook__close-button'
      )[0];
      button.click();
      assert.equal(notebook.container.style.display, 'none');
    });
  });

  describe('responding to events', () => {
    it('opens on `openNotebook`', () => {
      const notebook = createNotebook();

      notebook._emitter.publish('openNotebook');

      assert.equal(notebook.container.style.display, '');
    });
  });

  describe('destruction', () => {
    it('should remove the frame', () => {
      const notebook = createNotebook();
      const hostDocument = notebook.element;

      // Make sure the frame is created
      notebook.open();
      assert.isNotNull(hostDocument.querySelector('hypothesis-notebook'));

      notebook.destroy();

      assert.isNull(hostDocument.querySelector('hypothesis-notebook'));
    });
  });
});

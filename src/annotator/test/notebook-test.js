import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';

import Notebook, { $imports } from '../notebook';

describe('Notebook', () => {
  // `Notebook` instances created by current test
  let notebooks;
  let container;
  let cleanUpCallback;
  let modalProps;

  const createNotebook = (config = {}) => {
    const notebook = new Notebook(container, config);
    notebooks.push(notebook);
    return notebook;
  };

  beforeEach(() => {
    notebooks = [];
    container = document.createElement('div');
    cleanUpCallback = sinon.stub();
    modalProps = null;

    const FakeNotebookModal = props => {
      modalProps = props;
      useEffect(() => {
        return () => {
          cleanUpCallback();
        };
      }, []);
      return <div id="notebook-modal" />;
    };

    $imports.$mock({
      './components/NotebookModal': { default: FakeNotebookModal },
    });
  });

  afterEach(() => {
    notebooks.forEach(n => n.destroy());
    $imports.$restore();
  });

  describe('#open', () => {
    it('opens the notebook', () => {
      const notebook = createNotebook();
      assert.isFalse(notebook.isOpen());
      assert.match(modalProps, { open: false, groupId: null });

      notebook.open('group-1');

      assert.isTrue(notebook.isOpen());
      assert.match(modalProps, { open: true, groupId: 'group-1' });
    });
  });

  describe('#close', () => {
    it('closes the notebook', () => {
      const notebook = createNotebook();
      const closed = sinon.stub();
      notebook.on('closed', closed);

      notebook.open('group-1');
      notebook.close();

      assert.isFalse(notebook.isOpen());
      assert.called(closed);
    });
  });

  it("closes the notebook when NotebookModal's `onClose` prop is called", () => {
    const notebook = createNotebook();
    const closed = sinon.stub();
    notebook.on('closed', closed);

    notebook.open('group-1');
    modalProps.onClose();

    assert.isFalse(notebook.isOpen());
    assert.called(closed);
  });

  describe('notebook container', () => {
    it('creates the container', () => {
      assert.isFalse(container.hasChildNodes());
      const notebook = createNotebook();
      const shadowRoot = notebook._outerContainer.shadowRoot;
      assert.isNotNull(shadowRoot);
      assert.isNotNull(shadowRoot.querySelector('#notebook-modal'));
    });

    it('removes the container', () => {
      const notebook = createNotebook();
      notebook.destroy();
      assert.isFalse(container.hasChildNodes());
    });

    it('unmounts the NotebookModal when the container is removed', () => {
      // Necessary to run the useEffect for first time and register the cleanup function
      let notebook;
      act(() => {
        notebook = createNotebook();
      });
      // Necessary to run the cleanup function of the useEffect
      act(() => {
        notebook.destroy();
      });
      assert.called(cleanUpCallback);
    });
  });
});

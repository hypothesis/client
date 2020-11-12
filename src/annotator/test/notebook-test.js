import Notebook from '../notebook';

describe('Notebook', () => {
  // `Notebook` instances created by current test
  let notebooks;

  const createNotebook = (config = {}) => {
    config = { notebookAppUrl: '/base/annotator/test/empty.html', ...config };
    const element = document.createElement('div');
    const notebook = new Notebook(element, config);

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
    it('starts hidden', () => {
      const notebook = createNotebook();

      assert.equal(notebook.container.style.display, 'none');
    });

    it('displays when opened', () => {
      const notebook = createNotebook();

      notebook.show();

      assert.equal(notebook.container.style.display, '');
      assert.isTrue(notebook.container.classList.contains('is-open'));
    });

    it('hides when closed', () => {
      const notebook = createNotebook();

      notebook.show();
      notebook.hide();

      assert.equal(notebook.container.style.display, 'none');
      assert.isFalse(notebook.container.classList.contains('is-open'));
    });
  });

  describe('creating the notebook iframe', () => {
    it('creates the iframe when the notebook is shown for the first time', () => {
      const notebook = createNotebook();

      assert.isNull(notebook.frame);

      notebook.show();

      assert.isTrue(notebook.frame instanceof Element);
    });

    it('sets the iframe source to the configured `notebookAppUrl`', () => {
      const notebook = createNotebook({
        notebookAppUrl: 'http://www.example.com/foo/bar',
      });

      notebook.show();

      // The rest of the config gets added as a hash to the end of the src,
      // so split that off and look at the string before it
      assert.equal(
        notebook.frame.src.split('#')[0],
        'http://www.example.com/foo/bar'
      );
    });
  });

  describe('responding to events', () => {
    it('shows on `showNotebook`', () => {
      const notebook = createNotebook();

      notebook.publish('showNotebook');

      assert.equal(notebook.container.style.display, '');
    });

    it('hides on `hideNotebook`', () => {
      const notebook = createNotebook();

      notebook.show();
      notebook.publish('hideNotebook');

      assert.equal(notebook.container.style.display, 'none');
    });

    it('hides on "sidebarOpened"', () => {
      const notebook = createNotebook();

      notebook.show();
      notebook.publish('sidebarOpened');

      assert.equal(notebook.container.style.display, 'none');
    });
  });

  describe('destruction', () => {
    it('should remove the frame', () => {
      const notebook = createNotebook();
      // Make sure the frame is created
      notebook.init();

      notebook.destroy();

      assert.equal(notebook.frame.parentElement, null);
    });
  });
});

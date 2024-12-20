import { Select } from '@hypothesis/frontend-shared';
import {
  checkAccessibility,
  waitFor,
  waitForElement,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import ImportAnnotations, { $imports } from '../ImportAnnotations';

describe('ImportAnnotations', () => {
  let fakeImportAnnotationsService;
  let fakeReadExportFile;
  let fakeStore;

  beforeEach(() => {
    fakeReadExportFile = sinon.stub().rejects(new Error('Failed to read file'));

    fakeImportAnnotationsService = {
      import: sinon.stub().resolves([]),
    };

    fakeStore = {
      defaultAuthority: sinon.stub().returns('example.com'),
      focusedGroup: sinon.stub().returns({ id: 'group-1' }),
      importsPending: sinon.stub().returns(0),
      importsTotal: sinon.stub().returns(0),
      isFeatureEnabled: sinon.stub().returns(true),
      hasFetchedAnnotations: sinon.stub().returns(true),
      isFetchingAnnotations: sinon.stub().returns(false),
      defaultContentFrame: sinon.stub().returns({}),
      profile: sinon.stub().returns({ userid: 'acct:john@example.com' }),
    };

    $imports.$mock({
      '../../helpers/import': { readExportFile: fakeReadExportFile },
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createImportAnnotations() {
    return mount(
      <ImportAnnotations
        store={fakeStore}
        importAnnotationsService={fakeImportAnnotationsService}
      />,
      { connected: true },
    );
  }

  function getImportButton(wrapper) {
    return wrapper.find('button[data-testid="import-button"]');
  }

  function selectFile(wrapper, readResult) {
    const fileInput = wrapper.find('input[type="file"]');
    const file = new File(['dummy content'], 'export.json');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.getDOMNode().files = transfer.files;

    if (readResult instanceof Error) {
      fakeReadExportFile.withArgs(file).rejects(readResult);
    } else {
      fakeReadExportFile.withArgs(file).resolves(readResult);
    }

    fileInput.simulate('change');
  }

  function importDisabled(wrapper) {
    return Boolean(getImportButton(wrapper).prop('disabled'));
  }

  /**
   * Wait for a `Select` to be found, then opens it and wait for the listbox to
   * be found.
   * @return Promise<{ select: EnzymeWrapper; listbox: EnzymeWrapper }> -
   *         The select and listbox wrappers
   */
  async function waitForOpenSelect(wrapper) {
    const select = await waitForElement(wrapper, Select);
    select.find('button').simulate('click');
    const listbox = await waitForElement(wrapper, '[role="listbox"]');

    return { select, listbox };
  }

  it('shows a notice if the user is not logged in', () => {
    fakeStore.profile.returns({ userid: null });
    const wrapper = createImportAnnotations();
    assert.isTrue(wrapper.exists('[data-testid="log-in-message"]'));
    assert.isFalse(wrapper.exists('input[type="file"]'));
  });

  it('disables import button if group, document or annotations are not loaded', async () => {
    fakeStore.defaultContentFrame.returns(null); // Document metadata not available
    fakeStore.focusedGroup.returns(null); // No group set
    fakeStore.hasFetchedAnnotations.returns(false); // Annotations still loading
    fakeStore.isFetchingAnnotations.returns(true);

    // Select annotations to import.
    const wrapper = createImportAnnotations();
    const annotations = [
      {
        user: 'acct:john@example.com',
        user_info: {
          display_name: 'John Smith',
        },
        text: 'Test annotation',
      },
    ];
    selectFile(wrapper, annotations);
    const userList = await waitForElement(wrapper, Select);
    assert.ok(userList.prop('value')); // Current user should be auto-selected

    // Import button should be disabled since we don't have the things we need
    // to perform the import.
    assert.isTrue(importDisabled(wrapper));

    fakeStore.defaultContentFrame.returns({}); // Document metadata available
    wrapper.setProps({});
    assert.isTrue(importDisabled(wrapper));

    fakeStore.focusedGroup.returns({ id: 'group-1' }); // Group selected
    wrapper.setProps({});
    assert.isTrue(importDisabled(wrapper));

    fakeStore.hasFetchedAnnotations.returns(true); // Annotation loading finishes
    fakeStore.isFetchingAnnotations.returns(false);
    wrapper.setProps({});
    assert.isFalse(importDisabled(wrapper)); // Finally, we can start an import
  });

  it('disables "Import" button when no file is selected', () => {
    const wrapper = createImportAnnotations();
    assert.isTrue(importDisabled(wrapper));
  });

  [
    // File with a mix of annotations and replies.
    {
      annotations: [
        {
          id: 'abc',
          user: 'acct:john@example.com',
          user_info: {
            display_name: 'John Smith',
          },
          text: 'Test annotation',
        },

        {
          id: 'def',
          user: 'acct:brian@example.com',
          user_info: {
            display_name: 'Brian Smith',
          },
          text: 'Test annotation',
        },

        // A reply, this shouldn't be counted in the list.
        {
          id: 'xyz',
          user: 'acct:brian@example.com',
          user_info: {
            display_name: 'Brian Smith',
          },
          text: 'Test annotation',
          references: ['abc'],
        },
      ],
      userEntries: [
        {
          userid: 'acct:brian@example.com',
          displayName: 'Brian Smith',
          annotationsCount: 1,
        },
        {
          userid: 'acct:john@example.com',
          displayName: 'John Smith',
          annotationsCount: 1,
        },
      ],
    },

    // File with a single reply.
    {
      annotations: [
        {
          id: 'xyz',
          user: 'acct:brian@example.com',
          user_info: {
            display_name: 'Brian Smith',
          },
          text: 'Test annotation',
          references: ['abc'],
        },
      ],
      userEntries: [],
    },
  ].forEach(({ annotations, userEntries }) => {
    it('displays user list when a valid file is selected', async () => {
      const wrapper = createImportAnnotations();

      selectFile(wrapper, annotations);

      const { listbox } = await waitForOpenSelect(wrapper);
      const users = listbox.find(Select.Option);

      assert.equal(users.length, userEntries.length);

      for (const [i, entry] of userEntries.entries()) {
        const optionValue = users.at(i).prop('value');

        assert.equal(optionValue.userid, entry.userid);
        assert.equal(optionValue.displayName, entry.displayName);
        assert.equal(optionValue.annotations.length, entry.annotationsCount);
      }
    });
  });

  it('displays error if file is invalid', async () => {
    const wrapper = createImportAnnotations();
    const reason = 'Not a valid Hypothesis JSON file';

    selectFile(wrapper, new Error(reason));

    const error = await waitForElement(wrapper, '[data-testid="error-info"]');
    assert.equal(
      error.text(),
      `Unable to find annotations to import: ${reason}`,
    );
  });

  it('selects user matching logged in user if found', async () => {
    const wrapper = createImportAnnotations();
    const annotations = [
      {
        user: 'acct:john@example.com',
        user_info: {
          display_name: 'John Smith',
        },
        text: 'Test annotation',
      },
    ];
    selectFile(wrapper, annotations);

    const userList = await waitForElement(wrapper, Select);
    assert.equal(userList.props().value.userid, 'acct:john@example.com');
  });

  it('does not select a user if no user matches logged-in user', async () => {
    fakeStore.profile.returns({ userid: 'acct:brian@example.com' });
    const wrapper = createImportAnnotations();
    const annotations = [
      {
        user: 'acct:john@example.com',
        user_info: {
          display_name: 'John Smith',
        },
        text: 'Test annotation',
      },
    ];
    selectFile(wrapper, annotations);

    const userList = await waitForElement(wrapper, Select);
    assert.equal(userList.prop('value'), null);
  });

  it('imports annotations when "Import" button is clicked', async () => {
    const wrapper = createImportAnnotations();
    const annotations = [
      // Annotation by a different user. This should be ignored.
      {
        id: 'abc',
        user: 'acct:john@example.com',
        user_info: {
          display_name: 'John Smith',
        },
        text: 'Test annotation',
      },
      {
        id: 'def',
        user: 'acct:brian@example.com',
        user_info: {
          display_name: 'Brian Smith',
        },
        text: 'Test annotation',
      },
      // Reply by selected user. This should be ignored.
      {
        id: 'xyz',
        references: ['abc'],
        user: 'acct:brian@example.com',
        user_info: {
          display_name: 'Brian Smith',
        },
        text: 'Test annotation',
      },
    ];

    selectFile(wrapper, annotations);

    const { select, listbox } = await waitForOpenSelect(wrapper);
    const option = listbox
      .find(Select.Option)
      .filterWhere(
        option => option.prop('value').userid === 'acct:brian@example.com',
      )
      .first();

    select.prop('onChange')(option.prop('value'));
    wrapper.update();

    const importButton = getImportButton(wrapper).getDOMNode();
    await waitFor(() => !importButton.disabled);
    importButton.click();

    assert.calledWith(
      fakeImportAnnotationsService.import,
      annotations.filter(
        ann => ann.user === 'acct:brian@example.com' && !ann.references,
      ),
    );
  });

  it('shows progress indicator during import', () => {
    fakeStore.importsPending.returns(1);
    fakeStore.importsTotal.returns(2);

    const wrapper = createImportAnnotations();

    const progressText = wrapper.find('[data-testid="progress-text"]');
    assert.isTrue(progressText.exists());
    assert.equal(progressText.text(), '50% complete');

    const progress = wrapper.find('CircularProgress');
    assert.isTrue(progress.exists());
    assert.equal(progress.prop('value'), 50);

    fakeStore.importsPending.returns(0);
    fakeStore.importsTotal.returns(0);
    wrapper.setProps({}); // Force re-render

    assert.isFalse(wrapper.exists('CircularProgress'));
    assert.isFalse(wrapper.exists('[data-testid="progress-text"]'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => (
        <ImportAnnotations
          store={fakeStore}
          importAnnotationsService={fakeImportAnnotationsService}
        />
      ),
    }),
  );
});

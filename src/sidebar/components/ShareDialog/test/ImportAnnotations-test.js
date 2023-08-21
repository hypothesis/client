import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { waitFor, waitForElement } from '../../../../test-util/wait';
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
      profile: sinon.stub().returns({ userid: 'acct:john@example.com' }),
      defaultAuthority: sinon.stub().returns('example.com'),
      isFeatureEnabled: sinon.stub().returns(true),
      importsPending: sinon.stub().returns(0),
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
    );
  }

  it('shows a notice if the user is not logged in', () => {
    fakeStore.profile.returns({ userid: null });
    const wrapper = createImportAnnotations();
    assert.isTrue(wrapper.exists('[data-testid="log-in-message"]'));
    assert.isFalse(wrapper.exists('input[type="file"]'));
  });

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

  it('disables "Import" button when no file is selected', () => {
    const wrapper = createImportAnnotations();
    assert.isTrue(getImportButton(wrapper).prop('disabled'));
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
        { value: '', text: '' }, // "No user selected" entry
        { value: 'acct:brian@example.com', text: 'Brian Smith (1)' },
        { value: 'acct:john@example.com', text: 'John Smith (1)' },
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
      userEntries: [
        { value: '', text: '' }, // "No user selected" entry
      ],
    },
  ].forEach(({ annotations, userEntries }) => {
    it('displays user list when a valid file is selected', async () => {
      const wrapper = createImportAnnotations();

      selectFile(wrapper, annotations);

      const userList = await waitForElement(wrapper, 'Select');
      const users = userList.find('option');
      assert.equal(users.length, userEntries.length);

      for (const [i, entry] of userEntries.entries()) {
        assert.equal(users.at(i).prop('value'), entry.value);
        assert.equal(users.at(i).text(), entry.text);
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

    const userList = await waitForElement(wrapper, 'Select');
    assert.equal(userList.getDOMNode().value, 'acct:john@example.com');
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

    const userList = await waitForElement(wrapper, 'Select');
    assert.equal(userList.getDOMNode().value, '');
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

    const userList = await waitForElement(wrapper, 'select');
    userList.getDOMNode().value = 'acct:brian@example.com';
    userList.simulate('change');

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

  it('shows loading spinner during import', () => {
    fakeStore.importsPending.returns(2);
    const wrapper = createImportAnnotations();
    assert.isTrue(wrapper.exists('LoadingSpinner'));

    fakeStore.importsPending.returns(0);
    wrapper.setProps({}); // Force re-render

    assert.isFalse(wrapper.exists('LoadingSpinner'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () =>
        mount(
          // re. outer div, see https://github.com/hypothesis/client/issues/5690
          <div>
            <ImportAnnotations
              store={fakeStore}
              importAnnotationsService={fakeImportAnnotationsService}
            />
          </div>,
        ),
    }),
  );
});

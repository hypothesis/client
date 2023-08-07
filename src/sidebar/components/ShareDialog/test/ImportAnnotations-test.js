import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { waitFor, waitForElement } from '../../../../test-util/wait';
import ImportAnnotations, { $imports } from '../ImportAnnotations';

describe('ImportAnnotations', () => {
  let fakeImportAnnotationsService;
  let fakeStore;

  beforeEach(() => {
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

  function selectFile(wrapper, data) {
    const fileInput = wrapper.find('input[type="file"]');
    const fileContent = typeof data === 'string' ? data : JSON.stringify(data);
    const file = new File([fileContent], 'export.json');

    // `HTMLInputElement.files` can be assigned, but is a `FileList`, which
    // can't be constructed, so we just stub the property instead.
    Object.defineProperty(fileInput.getDOMNode(), 'files', {
      get: () => [file],
    });

    fileInput.simulate('change');
  }

  it('disables "Import" button when no file is selected', () => {
    const wrapper = createImportAnnotations();
    assert.isTrue(getImportButton(wrapper).prop('disabled'));
  });

  it('displays user list when a valid file is selected', async () => {
    const wrapper = createImportAnnotations();

    selectFile(wrapper, {
      annotations: [
        {
          user: 'acct:john@example.com',
          user_info: {
            display_name: 'John Smith',
          },
          text: 'Test annotation',
        },
        {
          user: 'acct:brian@example.com',
          user_info: {
            display_name: 'Brian Smith',
          },
          text: 'Test annotation',
        },
      ],
    });

    const userList = await waitForElement(wrapper, 'Select');
    const users = userList.find('option');
    assert.equal(users.length, 3);
    assert.equal(users.at(0).prop('value'), '');
    assert.equal(users.at(0).text(), '');
    assert.equal(users.at(1).prop('value'), 'acct:brian@example.com');
    assert.equal(users.at(1).text(), 'Brian Smith (1)');
    assert.equal(users.at(2).prop('value'), 'acct:john@example.com');
    assert.equal(users.at(2).text(), 'John Smith (1)');
  });

  // TODO - Check handling of errors when reading file fails

  [
    {
      content: 'foobar',
      reason: 'Not a valid JSON file',
    },
    {
      content: {},
      reason: 'Not a valid Hypothesis JSON file',
    },
  ].forEach(({ content, reason }) => {
    it('displays error if file is invalid', async () => {
      const wrapper = createImportAnnotations();

      selectFile(wrapper, content);

      const error = await waitForElement(wrapper, '[data-testid="error-info"]');
      assert.equal(
        error.text(),
        `Unable to find annotations to import: ${reason}`,
      );
    });
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
    selectFile(wrapper, { annotations });

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
    selectFile(wrapper, { annotations });

    const userList = await waitForElement(wrapper, 'Select');
    assert.equal(userList.getDOMNode().value, '');
  });

  it('imports annotations when "Import" button is clicked', async () => {
    const wrapper = createImportAnnotations();
    const annotations = [
      {
        user: 'acct:john@example.com',
        user_info: {
          display_name: 'John Smith',
        },
        text: 'Test annotation',
      },
      {
        user: 'acct:brian@example.com',
        user_info: {
          display_name: 'Brian Smith',
        },
        text: 'Test annotation',
      },
    ];

    selectFile(wrapper, { annotations });

    const userList = await waitForElement(wrapper, 'select');
    userList.getDOMNode().value = 'acct:brian@example.com';
    userList.simulate('change');

    const importButton = getImportButton(wrapper).getDOMNode();
    await waitFor(() => !importButton.disabled);
    importButton.click();

    assert.calledWith(
      fakeImportAnnotationsService.import,
      annotations.filter(ann => ann.user === 'acct:brian@example.com'),
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

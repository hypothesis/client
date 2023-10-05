import {
  checkAccessibility,
  mockImportedComponents,
  waitForElement,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import * as fixtures from '../../../test/annotation-fixtures';
import ExportAnnotations, { $imports } from '../ExportAnnotations';

describe('ExportAnnotations', () => {
  let fakeStore;
  let fakeAnnotationsExporter;
  let fakeToastMessenger;
  let fakeDownloadJSONFile;
  let fakeSuggestedFilename;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createComponent = props =>
    mount(
      <ExportAnnotations
        annotationsExporter={fakeAnnotationsExporter}
        toastMessenger={fakeToastMessenger}
        {...props}
      />,
    );

  beforeEach(() => {
    fakeAnnotationsExporter = {
      buildExportContent: sinon.stub().returns({}),
    };
    fakeToastMessenger = {
      error: sinon.stub(),
    };
    fakeDownloadJSONFile = sinon.stub();
    fakeStore = {
      defaultAuthority: sinon.stub().returns('example.com'),
      isFeatureEnabled: sinon.stub().returns(true),
      profile: sinon.stub().returns({ userid: 'acct:john@example.com' }),
      countDrafts: sinon.stub().returns(0),
      defaultContentFrame: sinon.stub().returns({
        metadata: { title: 'Example document' },
      }),
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      isLoading: sinon.stub().returns(false),
      savedAnnotations: sinon
        .stub()
        .returns([fixtures.oldAnnotation(), fixtures.oldAnnotation()]),
    };
    fakeSuggestedFilename = sinon.stub().returns('suggested-filename');

    $imports.$mock(mockImportedComponents());

    $imports.$mock({
      '../../../shared/download-json-file': {
        downloadJSONFile: fakeDownloadJSONFile,
      },
      '../../helpers/export-annotations': {
        suggestedFilename: fakeSuggestedFilename,
      },
      '../../store': { useSidebarStore: () => fakeStore },
    });

    // Restore this very simple component to get it test coverage
    $imports.$restore({
      './LoadingSpinner': true,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('export annotations not ready (loading)', () => {
    it('renders a loading spinner if there is no focused group', () => {
      fakeStore.focusedGroup.returns(null);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('LoadingSpinner').exists());
    });

    it('renders a loading spinner if annotations are loading', () => {
      fakeStore.isLoading.returns(true);

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('LoadingSpinner').exists());
    });
  });

  [
    // A mix of annotations and replies.
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
        { value: '', text: 'All annotations (3)' }, // "No user selected" entry
        { value: 'acct:brian@example.com', text: 'Brian Smith (2)' },
        { value: 'acct:john@example.com', text: 'John Smith (1)' },
      ],
    },

    // A single reply.
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
        { value: '', text: 'All annotations (1)' }, // "No user selected" entry
        { value: 'acct:brian@example.com', text: 'Brian Smith (1)' },
      ],
    },
  ].forEach(({ annotations, userEntries }) => {
    it('displays a list with users who annotated the document', async () => {
      fakeStore.savedAnnotations.returns(annotations);

      const wrapper = createComponent();

      const userList = await waitForElement(wrapper, 'Select');
      const users = userList.find('option');
      assert.equal(users.length, userEntries.length);

      for (const [i, entry] of userEntries.entries()) {
        assert.equal(users.at(i).prop('value'), entry.value);
        assert.equal(users.at(i).text(), entry.text);
      }
    });
  });

  it('provides a filename field with a default suggested name', () => {
    const wrapper = createComponent();
    const input = wrapper.find('Input');
    assert.isTrue(input.exists());

    assert.calledWith(fakeSuggestedFilename, {
      groupName: fakeStore.focusedGroup().name,
      documentMetadata: fakeStore.defaultContentFrame().metadata,
    });
    assert.equal(input.prop('defaultValue'), 'suggested-filename');
  });

  describe('export form submitted', () => {
    const submitExportForm = wrapper =>
      wrapper.find('[data-testid="export-form"]').simulate('submit');

    it('builds an export file from all non-draft annotations', () => {
      const wrapper = createComponent();
      const annotationsToExport = [
        fixtures.oldAnnotation(),
        fixtures.oldAnnotation(),
      ];
      fakeStore.savedAnnotations.returns(annotationsToExport);

      submitExportForm(wrapper);

      assert.calledOnce(fakeAnnotationsExporter.buildExportContent);
      assert.calledWith(
        fakeAnnotationsExporter.buildExportContent,
        annotationsToExport,
      );
      assert.notCalled(fakeToastMessenger.error);
    });

    it('builds an export file from selected user annotations', async () => {
      const selectedUserAnnotations = [
        {
          id: 'abc',
          user: 'acct:john@example.com',
          user_info: {
            display_name: 'John Smith',
          },
          text: 'Test annotation',
        },
        {
          id: 'xyz',
          user: 'acct:john@example.com',
          user_info: {
            display_name: 'John Smith',
          },
          text: 'Test annotation',
          references: ['def'],
        },
      ];
      const allAnnotations = [
        ...selectedUserAnnotations,
        {
          id: 'def',
          user: 'acct:brian@example.com',
          user_info: {
            display_name: 'Brian Smith',
          },
          text: 'Test annotation',
        },
      ];
      fakeStore.savedAnnotations.returns(allAnnotations);

      const wrapper = createComponent();

      // Select the user whose annotations we want to export
      const userList = await waitForElement(wrapper, 'Select');
      userList.prop('onChange')({
        target: {
          value: 'acct:john@example.com',
        },
      });
      wrapper.update();

      submitExportForm(wrapper);

      assert.calledOnce(fakeAnnotationsExporter.buildExportContent);
      assert.calledWith(
        fakeAnnotationsExporter.buildExportContent,
        selectedUserAnnotations,
      );
    });

    it('downloads a file using user-entered filename appended with `.json`', () => {
      const wrapper = createComponent();
      const filenameInput = wrapper.find(
        'input[data-testid="export-filename"]',
      );

      filenameInput.getDOMNode().value = 'my-filename';
      filenameInput.simulate('change');

      submitExportForm(wrapper);

      assert.calledOnce(fakeDownloadJSONFile);
      assert.calledWith(
        fakeDownloadJSONFile,
        sinon.match.object,
        'my-filename.json',
      );
    });

    context('when exporting annotations fails', () => {
      it('displays error toast message', () => {
        fakeAnnotationsExporter.buildExportContent.throws(
          new Error('Error exporting'),
        );

        const wrapper = createComponent();

        submitExportForm(wrapper);

        assert.notCalled(fakeDownloadJSONFile);
        assert.calledOnce(fakeAnnotationsExporter.buildExportContent);
        assert.calledWith(
          fakeToastMessenger.error,
          'Exporting annotations failed',
        );
      });
    });
  });

  context('no annotations available to export', () => {
    beforeEach(() => {
      fakeStore.savedAnnotations.returns([]);
    });

    it('shows a message that no annotations are available', () => {
      const wrapper = createComponent();

      assert.include(
        wrapper.find('[data-testid="no-annotations-message"]').text(),
        'There are no annotations available for export',
      );
    });

    it('disables the export button', () => {
      const wrapper = createComponent();

      assert.isTrue(
        wrapper.find('button[data-testid="export-button"]').props().disabled,
      );
    });

    it('does not show the filename input field', () => {
      const wrapper = createComponent();

      assert.isFalse(wrapper.find('Input').exists());
    });
  });

  context('there are draft annotations', () => {
    it('shows a message with a count of draft annotations', () => {
      fakeStore.countDrafts.returns(1);
      const wrapperSingular = createComponent();

      fakeStore.countDrafts.returns(2);
      const wrapperPlural = createComponent();

      assert.include(
        wrapperSingular.find('[data-testid="drafts-message"]').text(),
        'You have 1 unsaved draft that',
      );

      assert.include(
        wrapperPlural.find('[data-testid="drafts-message"]').text(),
        'You have 2 unsaved drafts that',
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});

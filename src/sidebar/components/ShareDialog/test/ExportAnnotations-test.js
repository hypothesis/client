import { SelectNext } from '@hypothesis/frontend-shared';
import {
  checkAccessibility,
  mockImportedComponents,
  waitForElement,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import * as fixtures from '../../../test/annotation-fixtures';
import ExportAnnotations, { $imports } from '../ExportAnnotations';

describe('ExportAnnotations', () => {
  let fakeStore;
  let fakeAnnotationsExporter;
  let fakeToastMessenger;
  let fakeDownloadJSONFile;
  let fakeDownloadTextFile;
  let fakeDownloadCSVFile;
  let fakeDownloadHTMLFile;
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
      buildJSONExportContent: sinon.stub().returns({}),
      buildTextExportContent: sinon.stub().returns(''),
      buildCSVExportContent: sinon.stub().returns(''),
      buildHTMLExportContent: sinon.stub().returns(''),
    };
    fakeToastMessenger = {
      error: sinon.stub(),
    };
    fakeDownloadJSONFile = sinon.stub();
    fakeDownloadTextFile = sinon.stub();
    fakeDownloadCSVFile = sinon.stub();
    fakeDownloadHTMLFile = sinon.stub();
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
      '../../../shared/download-file': {
        downloadJSONFile: fakeDownloadJSONFile,
        downloadTextFile: fakeDownloadTextFile,
        downloadCSVFile: fakeDownloadCSVFile,
        downloadHTMLFile: fakeDownloadHTMLFile,
      },
      '../../helpers/export-annotations': {
        suggestedFilename: fakeSuggestedFilename,
      },
      '../../store': { useSidebarStore: () => fakeStore },
    });

    $imports.$restore({
      // Restore this very simple component to get it test coverage
      './LoadingSpinner': true,
      // Restore UserAnnotationsListItem, as it's used as some buttons' content
      // and is needed to make a11y tests pass
      './UserAnnotationsListItem': true,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const waitForTestId = async (wrapper, testId) =>
    waitForElement(wrapper, `[data-testid="${testId}"]`);

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
        {
          // "No user selected" entry
          displayName: 'All annotations',
          annotationsCount: 3,
        },
        {
          userid: 'acct:brian@example.com',
          displayName: 'Brian Smith',
          annotationsCount: 2,
        },
        {
          userid: 'acct:john@example.com',
          displayName: 'John Smith',
          annotationsCount: 1,
        },
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
        {
          // "No user selected" entry
          displayName: 'All annotations',
          annotationsCount: 1,
        },
        {
          userid: 'acct:brian@example.com',
          displayName: 'Brian Smith',
          annotationsCount: 1,
        },
      ],
    },
  ].forEach(({ annotations, userEntries }) => {
    it('displays a list with users who annotated the document', async () => {
      fakeStore.savedAnnotations.returns(annotations);

      const wrapper = createComponent();

      const userList = await waitForTestId(wrapper, 'user-select');
      const users = userList.find(SelectNext.Option);
      assert.equal(users.length, userEntries.length);

      for (const [i, entry] of userEntries.entries()) {
        const value = users.at(i).prop('value');

        assert.equal(value.userid, entry.userid);
        assert.equal(value.displayName, entry.displayName);
        assert.equal(value.annotations.length, entry.annotationsCount);
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

  [
    { exportFormatsEnabled: true, expectedAmountOfSelects: 2 },
    { exportFormatsEnabled: false, expectedAmountOfSelects: 1 },
  ].forEach(({ exportFormatsEnabled, expectedAmountOfSelects }) => {
    it('displays format selector when feature is enabled', async () => {
      fakeStore.isFeatureEnabled.callsFake(
        ff => exportFormatsEnabled || ff !== 'export_formats',
      );

      const wrapper = createComponent();
      const selects = await waitForElement(wrapper, SelectNext);

      assert.equal(selects.length, expectedAmountOfSelects);
    });
  });

  it('lists supported export formats', async () => {
    const wrapper = createComponent();
    const select = await waitForElement(
      wrapper,
      '[data-testid="export-format-select"]',
    );
    const options = select.find(SelectNext.Option);
    const optionText = (index, type) =>
      options.at(index).find(`[data-testid="format-${type}"]`).text();

    assert.equal(options.length, 4);
    assert.equal(optionText(0, 'name'), 'JSON');
    assert.equal(
      optionText(0, 'description'),
      'For import into another Hypothesis group or document',
    );
    assert.equal(optionText(1, 'name'), 'Plain text (TXT)');
    assert.equal(
      optionText(1, 'description'),
      'For import into word processors as plain text',
    );
    assert.equal(optionText(2, 'name'), 'Table (CSV)');
    assert.equal(optionText(2, 'description'), 'For import into a spreadsheet');
    assert.equal(optionText(3, 'name'), 'Rich text (HTML)');
    assert.equal(
      optionText(3, 'description'),
      'For import into word processors as rich text',
    );
  });

  [
    [{ shortTitle: 'Short', title: 'Something longer' }, 'Short'],
    [{ title: 'Something longer' }, 'Something longer'],
  ].forEach(([format, expectedTitle]) => {
    it('displays format short title if defined', async () => {
      const wrapper = createComponent();
      const getSelect = () =>
        waitForElement(wrapper, '[data-testid="export-format-select"]');

      const selectBefore = await getSelect();
      selectBefore.props().onChange(format);

      const selectAfter = await getSelect();
      assert.equal(selectAfter.prop('buttonContent'), expectedTitle);
    });
  });

  describe('export form submitted', () => {
    const submitExportForm = wrapper =>
      wrapper.find('[data-testid="export-form"]').simulate('submit');
    const selectExportFormat = async (wrapper, format) => {
      const select = await waitForElement(
        wrapper,
        '[data-testid="export-format-select"]',
      );
      select.props().onChange({ value: format });
      wrapper.update();
    };

    [
      {
        format: 'json',
        getExpectedInvokedContentBuilder: () =>
          fakeAnnotationsExporter.buildJSONExportContent,
      },
      {
        format: 'txt',
        getExpectedInvokedContentBuilder: () =>
          fakeAnnotationsExporter.buildTextExportContent,
      },
      {
        format: 'csv',
        getExpectedInvokedContentBuilder: () =>
          fakeAnnotationsExporter.buildCSVExportContent,
      },
      {
        format: 'html',
        getExpectedInvokedContentBuilder: () =>
          fakeAnnotationsExporter.buildHTMLExportContent,
      },
    ].forEach(({ format, getExpectedInvokedContentBuilder }) => {
      it('builds an export file from all non-draft annotations', async () => {
        const wrapper = createComponent();
        const annotationsToExport = [
          fixtures.oldAnnotation(),
          fixtures.oldAnnotation(),
        ];
        fakeStore.savedAnnotations.returns(annotationsToExport);

        await selectExportFormat(wrapper, format);

        submitExportForm(wrapper);

        const invokedContentBuilder = getExpectedInvokedContentBuilder();
        assert.calledOnce(invokedContentBuilder);
        assert.calledWith(invokedContentBuilder, annotationsToExport);
        assert.notCalled(fakeToastMessenger.error);
      });
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
      const userList = await waitForTestId(wrapper, 'user-select');
      const option = userList
        .find(SelectNext.Option)
        .filterWhere(
          option => option.prop('value').userid === 'acct:john@example.com',
        )
        .first();
      act(() => {
        userList.prop('onChange')(option.prop('value'));
      });
      wrapper.update();

      submitExportForm(wrapper);

      assert.calledOnce(fakeAnnotationsExporter.buildJSONExportContent);
      assert.calledWith(
        fakeAnnotationsExporter.buildJSONExportContent,
        selectedUserAnnotations,
      );
    });

    [
      {
        format: 'json',
        getExpectedInvokedDownloader: () => fakeDownloadJSONFile,
      },
      {
        format: 'txt',
        getExpectedInvokedDownloader: () => fakeDownloadTextFile,
      },
      {
        format: 'csv',
        getExpectedInvokedDownloader: () => fakeDownloadCSVFile,
      },
      {
        format: 'html',
        getExpectedInvokedDownloader: () => fakeDownloadHTMLFile,
      },
    ].forEach(({ format, getExpectedInvokedDownloader }) => {
      it('downloads a file using user-entered filename appended with proper extension', async () => {
        const wrapper = createComponent();
        const filenameInput = wrapper.find(
          'input[data-testid="export-filename"]',
        );

        filenameInput.getDOMNode().value = 'my-filename';
        filenameInput.simulate('change');

        await selectExportFormat(wrapper, format);

        submitExportForm(wrapper);

        const invokedDownloader = getExpectedInvokedDownloader();
        assert.calledOnce(invokedDownloader);
        assert.calledWith(
          invokedDownloader,
          sinon.match.any,
          `my-filename.${format}`,
        );
      });
    });

    context('when exporting annotations fails', () => {
      it('displays error toast message', () => {
        fakeAnnotationsExporter.buildJSONExportContent.throws(
          new Error('Error exporting'),
        );

        const wrapper = createComponent();

        submitExportForm(wrapper);

        assert.notCalled(fakeDownloadJSONFile);
        assert.calledOnce(fakeAnnotationsExporter.buildJSONExportContent);
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

  it('should pass a11y checks', async () => {
    const wrapper = createComponent();
    const select = await waitForTestId(wrapper, 'user-select');

    await checkAccessibility({
      content: () => wrapper,
      shouldIgnoreViolation: ({ id, nodes }) => {
        if (id !== 'button-name') {
          return false;
        }

        // axe-core can report a violation on any button[role="combobox"] linked
        // to a label if it does not have aria-label or aria-labelledby, because
        // the Dragon NaturallySpeaking screen reader does not play well with
        // that combination.
        // Since its use is marginal, we want to ignore the "button-name"
        // violation if reported on SelectNext.
        // See https://github.com/dequelabs/axe-core/issues/4235 for context

        const targets = nodes.flatMap(node => node.target);
        return targets.includes(`#${select.prop('buttonId')}`);
      },
    })();
  });
});

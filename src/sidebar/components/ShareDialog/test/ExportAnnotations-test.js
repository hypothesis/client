import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import * as fixtures from '../../../test/annotation-fixtures';
import ExportAnnotations, { $imports } from '../ExportAnnotations';

describe('ExportAnnotations', () => {
  let fakeStore;
  let fakeAnnotationsExporter;
  let fakeToastMessenger;
  let fakeDownloadJSONFile;

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
      countDrafts: sinon.stub().returns(0),
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      isLoading: sinon.stub().returns(false),
      savedAnnotations: sinon
        .stub()
        .returns([fixtures.oldAnnotation(), fixtures.oldAnnotation()]),
    };

    $imports.$mock(mockImportedComponents());

    $imports.$mock({
      '../../../shared/download-json-file': {
        downloadJSONFile: fakeDownloadJSONFile,
      },
      '../../store': { useSidebarStore: () => fakeStore },
      '../../util/export-annotations': {
        suggestedFilename: () => 'suggested-filename',
      },
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

  it('shows a count of annotations for export', () => {
    fakeStore.savedAnnotations.returns([fixtures.oldAnnotation()]);
    const wrapperSingular = createComponent();
    fakeStore.savedAnnotations.returns([
      fixtures.oldAnnotation(),
      fixtures.oldAnnotation(),
    ]);
    const wrapperPlural = createComponent();

    assert.include(
      wrapperSingular.find('[data-testid="export-count"]').text(),
      'Export 1 annotation in a file',
    );

    assert.include(
      wrapperPlural.find('[data-testid="export-count"]').text(),
      'Export 2 annotations in a file',
    );
  });

  it('provides a filename field with a default suggested name', () => {
    const wrapper = createComponent();
    const input = wrapper.find('Input');

    assert.isTrue(input.exists());
    assert.equal(input.prop('defaultValue'), 'suggested-filename');
  });

  describe('export form submitted', () => {
    const submitExportForm = wrapper =>
      wrapper.find('[data-testid="export-form"]').simulate('submit');

    it('builds an export file from the non-draft annotations', () => {
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
        'You have 1 unsaved annotation that',
      );

      assert.include(
        wrapperPlural.find('[data-testid="drafts-message"]').text(),
        'You have 2 unsaved annotations that',
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

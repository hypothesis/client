import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import ExportAnnotations from '../ExportAnnotations';
import { $imports } from '../ExportAnnotations';

describe('ExportAnnotations', () => {
  let fakeStore;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createComponent = props => mount(<ExportAnnotations {...props} />);

  beforeEach(() => {
    fakeStore = {
      allAnnotations: sinon.stub().returns(0),
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      isLoading: sinon.stub().returns(false),
    };

    $imports.$mock(mockImportedComponents());

    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('export annotations not ready', () => {
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

  it('provides a filename field', () => {
    // TODO expand as component logic is implemented
    const wrapper = createComponent();

    assert.isTrue(wrapper.find('Input').exists());
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});

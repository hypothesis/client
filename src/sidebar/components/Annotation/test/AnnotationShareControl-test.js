import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import AnnotationShareControl, { $imports } from '../AnnotationShareControl';

describe('AnnotationShareControl', () => {
  let fakeAnnotation;
  let fakeToastMessenger;
  let fakeGroup;
  let fakeStore;

  function createComponent(props = {}) {
    return mount(
      <AnnotationShareControl
        annotation={fakeAnnotation}
        toastMessenger={fakeToastMessenger}
        settings={{}}
        {...props}
      />,
      { connected: true },
    );
  }

  beforeEach(() => {
    fakeAnnotation = {
      group: 'fakegroup',
    };

    fakeToastMessenger = {
      success: sinon.stub(),
      error: sinon.stub(),
    };
    fakeGroup = {
      name: 'My Group',
      type: 'private',
    };

    fakeStore = {
      getGroup: sinon.stub().returns(fakeGroup),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
      '@hypothesis/annotation-ui': {
        AnnotationShareControl: () => null,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const baseShareControl = wrapper =>
    wrapper.find('[data-testid="base-share-control"]');

  [fakeGroup, undefined].forEach(group => {
    it('passes group from sidebar store to base share control', () => {
      fakeStore.getGroup.returns(group);
      const wrapper = createComponent();

      assert.equal(baseShareControl(wrapper).prop('group'), group ?? null);
    });
  });

  it.each([true, false, undefined])(
    'passes commentsMode from settings to base share control',
    commentsMode => {
      const wrapper = createComponent({
        settings: { commentsMode },
      });
      assert.equal(
        baseShareControl(wrapper).prop('commentsMode'),
        commentsMode,
      );
    },
  );

  describe('copying the share URI to the clipboard', () => {
    it('confirms link copy when successful', async () => {
      const wrapper = createComponent();
      baseShareControl(wrapper).props().onCopy({ ok: true });

      assert.calledWith(
        fakeToastMessenger.success,
        'Copied share link to clipboard',
      );
    });

    it('flashes an error if link copying unsuccessful', () => {
      const wrapper = createComponent();
      baseShareControl(wrapper).props().onCopy({ ok: false });

      assert.calledWith(fakeToastMessenger.error, 'Unable to copy link');
    });
  });
});

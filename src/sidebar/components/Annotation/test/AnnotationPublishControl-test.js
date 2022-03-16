import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';

import AnnotationPublishControl, {
  $imports,
} from '../AnnotationPublishControl';

describe('AnnotationPublishControl', () => {
  let fakeGroup;
  let fakeSettings;
  let fakeApplyTheme;

  let fakeOnSave;
  let fakeOnCancel;
  let fakeOnSetPrivate;

  const createAnnotationPublishControl = (props = {}) => {
    return mount(
      <AnnotationPublishControl
        group={fakeGroup}
        isDisabled={false}
        isPrivate={false}
        onCancel={fakeOnCancel}
        onSave={fakeOnSave}
        onSetPrivate={fakeOnSetPrivate}
        settings={fakeSettings}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeOnCancel = sinon.stub();
    fakeOnSave = sinon.stub();
    fakeOnSetPrivate = sinon.stub();
    fakeGroup = {
      name: 'Fake Group',
      type: 'private',
    };

    fakeSettings = {
      branding: {
        ctaTextColor: '#0f0',
        ctaBackgroundColor: '#00f',
      },
    };

    fakeApplyTheme = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../helpers/theme': {
        applyTheme: fakeApplyTheme,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const getPublishButton = wrapper =>
    wrapper.find('LabeledButton[data-testid="publish-control-button"]');

  describe('theming', () => {
    it('should apply theme styles', () => {
      const fakeStyle = { foo: 'bar' };
      fakeApplyTheme.returns(fakeStyle);
      const wrapper = createAnnotationPublishControl();
      const btnPrimary = getPublishButton(wrapper);

      assert.calledWith(
        fakeApplyTheme,
        ['ctaTextColor', 'ctaBackgroundColor'],
        fakeSettings
      );
      assert.include(btnPrimary.prop('style'), fakeStyle);
    });
  });

  describe('dropdown menu button (form submit button)', () => {
    context('shared annotation', () => {
      it('should label the button with the group name', () => {
        const wrapper = createAnnotationPublishControl();

        const btn = getPublishButton(wrapper);
        assert.equal(btn.text(), `Post to ${fakeGroup.name}`);
      });
    });

    context('private annotation', () => {
      it('should label the button with "Only Me"', () => {
        const wrapper = createAnnotationPublishControl({ isPrivate: true });

        const btn = getPublishButton(wrapper);
        assert.equal(btn.text(), 'Post to Only Me');
      });
    });

    it('should disable the button if `isDisabled`', () => {
      const wrapper = createAnnotationPublishControl({ isDisabled: true });

      const btn = getPublishButton(wrapper);
      assert.isOk(btn.prop('disabled'));
    });

    it('should enable the button if not `isDisabled`', () => {
      const wrapper = createAnnotationPublishControl({ isDisabled: false });

      const btn = getPublishButton(wrapper);
      assert.isNotOk(btn.prop('disabled'));
    });

    it('should have a save callback', () => {
      const fakeOnSave = sinon.stub();
      const wrapper = createAnnotationPublishControl({ onSave: fakeOnSave });

      const btn = getPublishButton(wrapper);

      assert.equal(btn.prop('onClick'), fakeOnSave);
    });
  });

  describe('menu', () => {
    describe('share (to group) menu item', () => {
      it('should set privacy to shared when group name clicked', () => {
        const wrapper = createAnnotationPublishControl();
        const shareMenuItem = wrapper.find('MenuItem[label="Fake Group"]');

        shareMenuItem.prop('onClick')();

        assert.calledOnce(fakeOnSetPrivate);
        assert.calledWith(fakeOnSetPrivate, false);
      });

      context('private group', () => {
        it('should have a group icon', () => {
          const wrapper = createAnnotationPublishControl();
          const shareMenuItem = wrapper.find('MenuItem').first();

          assert.equal(shareMenuItem.prop('icon'), 'groups');
        });
      });

      context('open group', () => {
        beforeEach(() => {
          fakeGroup.type = 'open';
        });

        it('should have a public icon', () => {
          const wrapper = createAnnotationPublishControl();
          const shareMenuItem = wrapper.find('MenuItem').first();

          assert.equal(shareMenuItem.prop('icon'), 'public');
        });
      });
    });

    describe('private (only me) menu item', () => {
      it('should set privacy to private when "Only Me" option clicked', () => {
        const wrapper = createAnnotationPublishControl();
        const shareMenuItem = wrapper.find('MenuItem[label="Only Me"]');

        shareMenuItem.prop('onClick')();

        assert.calledOnce(fakeOnSetPrivate);
        assert.calledWith(fakeOnSetPrivate, true);
      });

      it('should use a private/lock icon', () => {
        const wrapper = createAnnotationPublishControl();
        const privateMenuItem = wrapper.find('MenuItem').at(1);

        assert.equal(privateMenuItem.prop('icon'), 'lock');
      });

      it('should have an "Only me" label', () => {
        const wrapper = createAnnotationPublishControl();
        const privateMenuItem = wrapper.find('MenuItem').at(1);

        assert.equal(privateMenuItem.prop('label'), 'Only Me');
      });
    });
  });

  describe('cancel button', () => {
    it('should invoke the `onCancel` callback when cancel button clicked', () => {
      const wrapper = createAnnotationPublishControl();
      const cancelBtn = wrapper
        .find('LabeledButton')
        .filter({ icon: 'cancel' });

      cancelBtn.props().onClick();

      assert.calledOnce(fakeOnCancel);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createAnnotationPublishControl(),
    })
  );
});

'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const AnnotationPublishControl = require('../annotation-publish-control');
const MenuItem = require('../menu-item');

describe('AnnotationPublishControl', () => {
  let fakeGroup;
  let fakeSettings;
  let fakeApplyTheme;

  const createAnnotationPublishControl = (props = {}) => {
    return shallow(
      <AnnotationPublishControl
        group={fakeGroup}
        isDisabled={false}
        isShared={true}
        onCancel={sinon.stub()}
        onSave={sinon.stub()}
        onSetPrivacy={sinon.stub()}
        settings={fakeSettings}
        {...props}
      />
    ).dive(); // Dive needed because this component uses `withServices`
  };

  beforeEach(() => {
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

    AnnotationPublishControl.$imports.$mock({
      '../util/theme': {
        applyTheme: fakeApplyTheme,
      },
    });
  });

  describe('theming', () => {
    it('should apply theme styles', () => {
      const fakeStyle = { foo: 'bar' };
      fakeApplyTheme.returns(fakeStyle);
      const wrapper = createAnnotationPublishControl();
      const btnPrimary = wrapper.find(
        '.annotation-publish-control__btn-primary'
      );

      assert.calledWith(
        fakeApplyTheme,
        ['ctaTextColor', 'ctaBackgroundColor'],
        fakeSettings
      );
      assert.include(btnPrimary.prop('style'), fakeStyle);
    });
  });

  describe('dropdown menu button (form submit button)', () => {
    const btnClass = '.annotation-publish-control__btn-primary';
    context('shared annotation', () => {
      it('should label the button with the group name', () => {
        const wrapper = createAnnotationPublishControl({ isShared: true });

        const btn = wrapper.find(btnClass);
        assert.equal(
          btn.prop('title'),
          `Publish this annotation to ${fakeGroup.name}`
        );
        assert.equal(btn.text(), `Post to ${fakeGroup.name}`);
      });
    });

    context('private annotation', () => {
      it('should label the button with "Only Me"', () => {
        const wrapper = createAnnotationPublishControl({ isShared: false });

        const btn = wrapper.find(btnClass);
        assert.equal(btn.prop('title'), 'Publish this annotation to Only Me');
        assert.equal(btn.text(), 'Post to Only Me');
      });
    });

    it('should disable the button if `isDisabled`', () => {
      const wrapper = createAnnotationPublishControl({ isDisabled: true });

      const btn = wrapper.find(btnClass);
      assert.isOk(btn.prop('disabled'));
    });

    it('should enable the button if not `isDisabled`', () => {
      const wrapper = createAnnotationPublishControl({ isDisabled: false });

      const btn = wrapper.find(btnClass);
      assert.isNotOk(btn.prop('disabled'));
    });

    it('should have a save callback', () => {
      const fakeOnSave = sinon.stub();
      const wrapper = createAnnotationPublishControl({ onSave: fakeOnSave });

      const btn = wrapper.find(btnClass);

      assert.equal(btn.prop('onClick'), fakeOnSave);
    });
  });

  describe('menu', () => {
    describe('share (to group) menu item', () => {
      it('should invoke privacy callback with shared privacy', () => {
        const fakeOnSetPrivacy = sinon.stub();
        const wrapper = createAnnotationPublishControl({
          onSetPrivacy: fakeOnSetPrivacy,
        });
        const shareMenuItem = wrapper.find(MenuItem).first();

        shareMenuItem.prop('onClick')();

        assert.calledWith(fakeOnSetPrivacy, { level: 'shared' });
      });

      it('should have a label that is the name of the group', () => {
        const wrapper = createAnnotationPublishControl();
        const shareMenuItem = wrapper.find(MenuItem).first();

        assert.equal(shareMenuItem.prop('label'), fakeGroup.name);
      });

      context('private group', () => {
        it('should have a group icon', () => {
          const wrapper = createAnnotationPublishControl();
          const shareMenuItem = wrapper.find(MenuItem).first();

          assert.equal(shareMenuItem.prop('icon'), 'groups');
        });
      });
      context('open group', () => {
        beforeEach(() => {
          fakeGroup.type = 'open';
        });

        it('should have a public icon', () => {
          const wrapper = createAnnotationPublishControl();
          const shareMenuItem = wrapper.find(MenuItem).first();

          assert.equal(shareMenuItem.prop('icon'), 'public');
        });
      });
    });

    describe('private (only me) menu item', () => {
      it('should invoke callback with private privacy', () => {
        const fakeOnSetPrivacy = sinon.stub();
        const wrapper = createAnnotationPublishControl({
          onSetPrivacy: fakeOnSetPrivacy,
        });
        const privateMenuItem = wrapper.find(MenuItem).at(1);

        privateMenuItem.prop('onClick')();

        assert.calledWith(fakeOnSetPrivacy, { level: 'private' });
      });
      it('should use a private/lock icon', () => {
        const wrapper = createAnnotationPublishControl();
        const privateMenuItem = wrapper.find(MenuItem).at(1);

        assert.equal(privateMenuItem.prop('icon'), 'lock');
      });
      it('should have an "Only me" label', () => {
        const wrapper = createAnnotationPublishControl();
        const privateMenuItem = wrapper.find(MenuItem).at(1);

        assert.equal(privateMenuItem.prop('label'), 'Only Me');
      });
    });
  });

  describe('cancel button', () => {
    it('should have a cancel callback', () => {
      const fakeOnCancel = sinon.stub();
      const wrapper = createAnnotationPublishControl({
        onCancel: fakeOnCancel,
      });
      const cancelBtn = wrapper.find('.annotation-publish-control__cancel-btn');
      cancelBtn.prop('onClick')();

      assert.calledOnce(fakeOnCancel);
    });
  });
});

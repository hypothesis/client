import { mount } from 'enzyme';
import { createElement } from 'preact';

import Button from '../button';
import { $imports } from '../button';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('Button', () => {
  let fakeOnClick;

  function createComponent(props = {}) {
    return mount(
      <Button
        icon="fakeIcon"
        title="My Action"
        onClick={fakeOnClick}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnClick = sinon.stub();
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('adds active className if `isPressed` is `true`', () => {
    const wrapper = createComponent({ isPressed: true });

    assert.isTrue(wrapper.find('button').hasClass('is-active'));
  });

  it('renders `SvgIcon` for associated icon', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  [true, false].forEach(isExpanded => {
    it('sets `aria-expanded` attribute if `isExpanded` is a boolean', () => {
      const wrapper = createComponent({ isExpanded });
      assert.equal(wrapper.find('button').prop('aria-expanded'), isExpanded);
    });
  });

  it('does not set `aria-expanded` attribute if `isExpanded` is omitted', () => {
    const wrapper = createComponent();
    assert.notProperty(wrapper.find('button').props(), 'aria-expanded');
  });

  [true, false].forEach(isPressed => {
    it('sets `aria-pressed` attribute if `isPressed` is a boolean', () => {
      const wrapper = createComponent({ isPressed });
      assert.equal(wrapper.find('button').prop('aria-pressed'), isPressed);
    });
  });

  it('does not set `aria-pressed` attribute if `isPressed` is omitted', () => {
    const wrapper = createComponent();
    assert.notProperty(wrapper.find('button').props(), 'aria-pressed');
  });

  describe('`title` and `aria-label` attributes', () => {
    it('sets attrs to provided `title` prop', () => {
      const wrapper = createComponent({});
      assert.equal(wrapper.find('button').prop('title'), 'My Action');
      assert.equal(wrapper.find('button').prop('aria-label'), 'My Action');
    });

    it('sets attrs if `title` is different than `buttonText`', () => {
      const wrapper = createComponent({
        buttonText: 'My Label',
        title: 'Click here to do something',
      });

      assert.equal(
        wrapper.find('button').prop('title'),
        'Click here to do something'
      );
      assert.equal(
        wrapper.find('button').prop('aria-label'),
        'Click here to do something'
      );
    });

    it('does not set attrs if no `title` provided and `buttonText` present', () => {
      const wrapper = createComponent({
        buttonText: 'My Label',
        title: undefined,
      });

      assert.notProperty(wrapper.find('button').props(), 'title');
      assert.notProperty(wrapper.find('button').props(), 'aria-label');
    });

    it('does not set attrs if `title` is the same as `buttonText`', () => {
      const wrapper = createComponent({
        buttonText: 'My Label',
        title: 'My Label',
      });

      assert.notProperty(wrapper.find('button').props(), 'title');
      assert.notProperty(wrapper.find('button').props(), 'aria-label');
    });
  });

  it('invokes `onClick` callback when pressed', () => {
    const wrapper = createComponent();
    wrapper.find('button').simulate('click');
    assert.calledOnce(fakeOnClick);
  });

  it('adds additional class name passed in `className` prop', () => {
    const wrapper = createComponent({ className: 'my-class' });

    assert.isTrue(wrapper.hasClass('my-class'));
  });

  it('sets compact style if `useCompactStyle` is set`', () => {
    const wrapper = createComponent({ useCompactStyle: true });

    assert.isTrue(wrapper.find('button').hasClass('button--compact'));
  });

  it('sets input style if `useInputStyle` is set', () => {
    const wrapper = createComponent({ useInputStyle: true });

    assert.isTrue(wrapper.find('button').hasClass('button--input'));
  });

  it('sets primary style if `usePrimaryStyle` is set`', () => {
    const wrapper = createComponent({ usePrimaryStyle: true });

    assert.isTrue(wrapper.find('button').hasClass('button--primary'));
  });

  it('disables the button when `disabled` prop is true', () => {
    const wrapper = createComponent({ disabled: true });
    assert.isTrue(wrapper.find('button[disabled=true]').exists());
  });

  it('shall not disable the button by default', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('button[disabled=false]').exists());
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});

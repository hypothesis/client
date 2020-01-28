import { mount } from 'enzyme';
import { createElement } from 'preact';

import Button from '../button';
import { $imports } from '../button';

import mockImportedComponents from './mock-imported-components';

describe('Button', () => {
  function createComponent(props = {}) {
    return mount(
      <Button icon="fakeIcon" isActive={false} title="My Action" {...props} />
    );
  }

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('adds active className if `isActive` is `true`', () => {
    const wrapper = createComponent({ isActive: true });
    assert.isTrue(wrapper.find('button').hasClass('is-active'));
  });

  it('renders `SvgIcon` for associated icon', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  it('sets ARIA `aria-pressed` attribute if `isActive` and `actionType` is "toggle"', () => {
    const wrapper = createComponent({ isActive: true, actionType: 'toggle' });
    assert.isTrue(wrapper.find('button').prop('aria-pressed'));
    assert.equal(wrapper.find('button').prop('aria-expanded'), undefined);
  });

  it('sets ARIA `aria-expanded` attribute if `isActive` and `actionType` is "group"', () => {
    const wrapper = createComponent({ isActive: true, actionType: 'group' });
    assert.isTrue(wrapper.find('button').prop('aria-expanded'));
    assert.equal(wrapper.find('button').prop('aria-pressed'), undefined);
  });

  it('has no ARIA prop if `actionType` is not provided', () => {
    const wrapper = createComponent({ isActive: true });
    assert.equal(wrapper.find('button').prop('aria-expanded'), undefined);
    assert.equal(wrapper.find('button').prop('aria-pressed'), undefined);
  });

  it('sets `title` to provided `title` prop', () => {
    const wrapper = createComponent({});
    assert.equal(wrapper.find('button').prop('title'), 'My Action');
  });

  it('uses `buttonText` to set `title` attr if `title` missing', () => {
    const wrapper = createComponent({
      buttonText: 'My Label',
      title: undefined,
    });

    assert.equal(wrapper.find('button').prop('title'), 'My Label');
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

  it('maps any unmapped props to the <button> tag', () => {
    const wrapper = createComponent({ 'data-testprop': 'test' });
    assert.equal(wrapper.find('button').prop('data-testprop'), 'test');
  });
});

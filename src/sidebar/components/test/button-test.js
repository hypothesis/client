const { createElement } = require('preact');
const { mount } = require('enzyme');

const Button = require('../button');
const { $imports } = require('../button');
const mockImportedComponents = require('./mock-imported-components');

describe('Button', () => {
  let fakeOnClick;

  function createComponent(props = {}) {
    return mount(
      <Button
        icon="fakeIcon"
        isActive={false}
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

  it('adds active className if `isActive` is `true`', () => {
    const wrapper = createComponent({ isActive: true });

    assert.isTrue(wrapper.find('button').hasClass('is-active'));
  });

  it('renders `SvgIcon` for associated icon', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  it('sets ARIA `aria-pressed` attribute if `isActive`', () => {
    const wrapper = createComponent({ isActive: true });
    assert.isTrue(wrapper.find('button').prop('aria-pressed'));
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
});

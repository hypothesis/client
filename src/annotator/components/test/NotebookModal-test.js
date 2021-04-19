import { act } from 'preact/test-utils';
import { mount } from 'enzyme';

import NotebookModal from '../NotebookModal';
import { EventBus } from '../../util/emitter';

describe('NotebookModal', () => {
  let components;
  let eventBus;
  let emitter;

  const createComponent = config => {
    const component = mount(
      <NotebookModal
        eventBus={eventBus}
        config={{ notebookAppUrl: '/notebook', ...config }}
      />
    );
    components.push(component);
    return component;
  };

  beforeEach(() => {
    components = [];
    eventBus = new EventBus();
    emitter = eventBus.createEmitter();
  });

  afterEach(() => {
    components.forEach(component => component.unmount());
  });

  it('hides modal on first render', () => {
    const wrapper = createComponent();
    const outer = wrapper.find('.Notebook__outer');

    assert.isTrue(outer.hasClass('is-hidden'));
    assert.isFalse(wrapper.find('iframe').exists());
  });

  it('shows modal on "openNotebook" event', () => {
    const wrapper = createComponent();
    let outer = wrapper.find('.Notebook__outer');

    assert.isTrue(outer.hasClass('is-hidden'));
    assert.isFalse(wrapper.find('iframe').exists());

    emitter.publish('openNotebook', 'myGroup');
    wrapper.update();

    outer = wrapper.find('.Notebook__outer');
    assert.isFalse(outer.hasClass('is-hidden'));

    const iframe = wrapper.find('iframe');
    assert.equal(
      iframe.prop('src'),
      `/notebook#config=${encodeURIComponent('{"group":"myGroup"}')}`
    );
  });

  it('makes the document unscrollable on "openNotebook" event', () => {
    createComponent();
    act(() => {
      emitter.publish('openNotebook', 'myGroup');
    });
    assert.equal(document.body.style.overflow, 'hidden');
  });

  it('hides modal on closing', () => {
    const wrapper = createComponent();

    emitter.publish('openNotebook', 'myGroup');
    wrapper.update();

    let outer = wrapper.find('.Notebook__outer');
    assert.isFalse(outer.hasClass('is-hidden'));

    act(() => {
      wrapper.find('LabeledButton').prop('onClick')();
    });
    wrapper.update();

    outer = wrapper.find('.Notebook__outer');

    assert.isTrue(outer.hasClass('is-hidden'));
  });

  it('resets document scrollability on closing the modal', () => {
    const wrapper = createComponent();
    act(() => {
      emitter.publish('openNotebook', 'myGroup');
    });
    assert.equal(document.body.style.overflow, 'hidden');
    act(() => {
      wrapper.find('LabeledButton').prop('onClick')();
    });
    assert.notEqual(document.body.style.overflow, 'hidden');
  });
});

import { act } from 'preact/test-utils';
import { mount } from 'enzyme';

import { addConfigFragment } from '../../../shared/config-fragment';
import { EventBus } from '../../util/emitter';
import NotebookModal, { $imports } from '../NotebookModal';

describe('NotebookModal', () => {
  const notebookURL = 'https://test.hypothes.is/notebook';

  let components;
  let eventBus;
  let emitter;

  const outerSelector = '[data-testid="notebook-outer"]';

  const createComponent = config => {
    const component = mount(
      <NotebookModal
        eventBus={eventBus}
        config={{ notebookAppUrl: notebookURL, ...config }}
      />
    );
    components.push(component);
    return component;
  };

  beforeEach(() => {
    components = [];
    eventBus = new EventBus();
    emitter = eventBus.createEmitter();

    const fakeCreateAppConfig = sinon.spy((appURL, config) => {
      const appConfig = { ...config };
      delete appConfig.notebookAppUrl;
      return appConfig;
    });

    $imports.$mock({
      '../config/app': { createAppConfig: fakeCreateAppConfig },
    });
  });

  afterEach(() => {
    components.forEach(component => component.unmount());
    $imports.$restore();
  });

  it('hides modal on first render', () => {
    const wrapper = createComponent();
    const outer = wrapper.find(outerSelector);

    assert.isFalse(outer.exists());
  });

  it('shows modal on "openNotebook" event', () => {
    const wrapper = createComponent();
    let outer = wrapper.find(outerSelector);

    assert.isFalse(outer.exists());
    assert.isFalse(wrapper.find('iframe').exists());

    emitter.publish('openNotebook', 'myGroup');
    wrapper.update();

    outer = wrapper.find(outerSelector);
    assert.isFalse(outer.hasClass('hidden'));

    const iframe = wrapper.find('iframe');
    assert.equal(
      iframe.prop('src'),
      addConfigFragment(notebookURL, { group: 'myGroup' })
    );
  });

  it('creates a new iframe element on every "openNotebook" event', () => {
    const wrapper = createComponent();

    emitter.publish('openNotebook', '1');
    wrapper.update();

    const iframe1 = wrapper.find('iframe');
    assert.equal(
      iframe1.prop('src'),
      addConfigFragment(notebookURL, { group: '1' })
    );

    emitter.publish('openNotebook', '1');
    wrapper.update();

    const iframe2 = wrapper.find('iframe');
    assert.equal(
      iframe2.prop('src'),
      addConfigFragment(notebookURL, { group: '1' })
    );
    assert.notEqual(iframe1.getDOMNode(), iframe2.getDOMNode());

    emitter.publish('openNotebook', '2');
    wrapper.update();

    const iframe3 = wrapper.find('iframe');
    assert.equal(
      iframe3.prop('src'),
      addConfigFragment(notebookURL, { group: '2' })
    );
    assert.notEqual(iframe1.getDOMNode(), iframe3.getDOMNode());
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

    let outer = wrapper.find(outerSelector);
    assert.isFalse(outer.hasClass('hidden'));

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    wrapper.update();

    outer = wrapper.find(outerSelector);

    assert.isTrue(outer.hasClass('hidden'));
  });

  it('resets document scrollability on closing the modal', () => {
    const wrapper = createComponent();
    act(() => {
      emitter.publish('openNotebook', 'myGroup');
    });
    assert.equal(document.body.style.overflow, 'hidden');
    wrapper.update();
    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    assert.notEqual(document.body.style.overflow, 'hidden');
  });
});

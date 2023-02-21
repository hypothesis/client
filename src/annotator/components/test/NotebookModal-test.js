import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

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

    assert.isFalse(wrapper.find(outerSelector).exists());

    emitter.publish('openNotebook', 'myGroup');
    wrapper.update();

    assert.isTrue(wrapper.find(outerSelector).exists());

    const iframe = wrapper.find('iframe');
    assert.equal(
      iframe.prop('src'),
      addConfigFragment(notebookURL, { group: 'myGroup' })
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

    assert.isTrue(wrapper.find(outerSelector).exists());

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    wrapper.update();

    assert.isFalse(wrapper.find(outerSelector).exists());
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

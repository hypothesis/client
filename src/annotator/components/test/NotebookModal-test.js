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

  const outerSelector = 'dialog[data-testid="notebook-outer"]';

  const createComponent = config => {
    const attachTo = document.createElement('div');
    document.body.appendChild(attachTo);

    const component = mount(
      <NotebookModal
        eventBus={eventBus}
        config={{ notebookAppUrl: notebookURL, ...config }}
      />,
      { attachTo },
    );
    components.push([component, attachTo]);
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
    components.forEach(([component, container]) => {
      component.unmount();
      container.remove();
    });
    $imports.$restore();
  });

  const getCloseButton = wrapper =>
    wrapper.find('IconButton[data-testid="close-button"]');

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
      addConfigFragment(notebookURL, { group: 'myGroup' }),
    );
  });

  it('creates a new iframe element on every "openNotebook" event', () => {
    const wrapper = createComponent();

    emitter.publish('openNotebook', '1');
    wrapper.update();

    const iframe1 = wrapper.find('iframe');
    assert.equal(
      iframe1.prop('src'),
      addConfigFragment(notebookURL, { group: '1' }),
    );

    emitter.publish('openNotebook', '1');
    wrapper.update();

    const iframe2 = wrapper.find('iframe');
    assert.equal(
      iframe2.prop('src'),
      addConfigFragment(notebookURL, { group: '1' }),
    );
    assert.notEqual(iframe1.getDOMNode(), iframe2.getDOMNode());

    emitter.publish('openNotebook', '2');
    wrapper.update();

    const iframe3 = wrapper.find('iframe');
    assert.equal(
      iframe3.prop('src'),
      addConfigFragment(notebookURL, { group: '2' }),
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

  [
    // Close via clicking close button
    wrapper => getCloseButton(wrapper).props().onClick(),

    // Close via "cancel" event, like pressing `Esc` key
    wrapper =>
      wrapper.find('dialog').getDOMNode().dispatchEvent(new Event('cancel')),
  ].forEach(closeDialog => {
    it('opens and closes native dialog', () => {
      const wrapper = createComponent({});
      const isDialogOpen = () => wrapper.find('dialog').getDOMNode().open;

      act(() => emitter.publish('openNotebook', 'myGroup'));
      wrapper.update();
      assert.isTrue(isDialogOpen());

      act(() => closeDialog(wrapper));
      wrapper.update();
      assert.isFalse(isDialogOpen());
    });
  });

  it('resets document scrollability on closing the modal', () => {
    const wrapper = createComponent();
    act(() => {
      emitter.publish('openNotebook', 'myGroup');
    });
    assert.equal(document.body.style.overflow, 'hidden');
    wrapper.update();
    act(() => {
      getCloseButton(wrapper).prop('onClick')();
    });
    assert.notEqual(document.body.style.overflow, 'hidden');
  });
});

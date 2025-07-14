import { mount } from '@hypothesis/frontend-testing';

import {
  $imports,
  useUnsavedChanges,
  hasUnsavedChanges,
} from '../unsaved-changes';

function TestUseUnsavedChanges({ unsaved, fakeWindow }) {
  useUnsavedChanges(unsaved, fakeWindow);
  return <div />;
}

describe('useUnsavedChanges', () => {
  let fakeAnnotationActivity;
  let fakeWindow;

  function dispatchBeforeUnload() {
    const event = new Event('beforeunload', { cancelable: true });
    fakeWindow.dispatchEvent(event);
    return event;
  }

  function createWidget(unsaved) {
    return mount(
      <TestUseUnsavedChanges fakeWindow={fakeWindow} unsaved={unsaved} />,
    );
  }

  beforeEach(() => {
    fakeAnnotationActivity = {
      notifyUnsavedChanges: sinon.stub(),
    };
    const fakeUseService = sinon
      .stub()
      .withArgs('annotationActivity')
      .returns(fakeAnnotationActivity);

    // Use a dummy window to avoid triggering any handlers that respond to
    // "beforeunload" on the real window.
    fakeWindow = new EventTarget();

    $imports.$mock({
      '../../service-context': { useService: fakeUseService },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not increment unsaved-changes count if argument is false', () => {
    createWidget(false);
    assert.isFalse(hasUnsavedChanges());
  });

  it('does not register "beforeunload" handler if argument is false', () => {
    createWidget(false);
    const event = dispatchBeforeUnload();
    assert.isFalse(event.defaultPrevented);
  });

  it('increments unsaved-changes count if argument is true', () => {
    const wrapper = createWidget(true);
    assert.isTrue(hasUnsavedChanges());
    wrapper.unmount();
    assert.isFalse(hasUnsavedChanges());
  });

  it('registers "beforeunload" handler if argument is true', () => {
    const wrapper = createWidget(true);
    const event = dispatchBeforeUnload();
    assert.isTrue(event.defaultPrevented);

    // We don't test `event.returnValue` here because it returns `false` after
    // assignment in Chrome, even though the handler assigns it `true`.

    // Unmount the widget, this should remove the handler.
    wrapper.unmount();
    const event2 = dispatchBeforeUnload();
    assert.isFalse(event2.defaultPrevented);
  });

  it('notifies embedder frame when there are unsaved changes', () => {
    const notifyUnsavedChanges = fakeAnnotationActivity.notifyUnsavedChanges;
    const wrapper = createWidget(false);
    assert.notCalled(notifyUnsavedChanges);

    // Embedder should be notified when unsaved count changes from zero to non-zero.
    wrapper.setProps({ unsaved: true });
    assert.calledOnce(notifyUnsavedChanges);
    assert.calledWith(notifyUnsavedChanges, true);
    notifyUnsavedChanges.resetHistory();

    // Embedder should be notified when unsaved count changes from non-zero to
    // zero via re-render.
    wrapper.setProps({ unsaved: false });
    assert.calledOnce(notifyUnsavedChanges);
    assert.calledWith(notifyUnsavedChanges, false);
    notifyUnsavedChanges.resetHistory();

    // Embedder should be notified when unsaved count changes from non-zero to
    // zero via unmount.
    wrapper.setProps({ unsaved: true });
    assert.calledWith(notifyUnsavedChanges, true);
    notifyUnsavedChanges.resetHistory();
    wrapper.unmount();
    assert.calledWith(notifyUnsavedChanges, false);
  });
});

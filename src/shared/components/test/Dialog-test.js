import { mount } from 'enzyme';
import { createRef } from 'preact';

import Dialog from '../Dialog';
import { checkAccessibility } from '../../../test-util/accessibility';

describe('Dialog', () => {
  it('renders content', () => {
    const wrapper = mount(
      <Dialog>
        <span>content</span>
      </Dialog>
    );
    assert.isTrue(wrapper.contains(<span>content</span>));
  });

  it('adds `contentClass` value to class list', () => {
    const wrapper = mount(
      <Dialog contentClass="foo">
        <span>content</span>
      </Dialog>
    );
    assert.isTrue(wrapper.find('.Dialog__content').hasClass('foo'));
  });

  it('renders buttons', () => {
    const wrapper = mount(
      <Dialog
        buttons={[
          <button key="foo" name="foo" />,
          <button key="bar" name="bar" />,
        ]}
      />
    );
    assert.isTrue(wrapper.contains(<button key="foo" name="foo" />));
    assert.isTrue(wrapper.contains(<button key="bar" name="bar" />));
  });

  it('renders the title', () => {
    const wrapper = mount(<Dialog title="Test dialog" />);
    const header = wrapper.find('h1');
    assert.equal(header.text().indexOf('Test dialog'), 0);
  });

  it('closes when Escape key is pressed', () => {
    const onCancel = sinon.stub();
    const container = document.createElement('div');
    document.body.appendChild(container);
    mount(<Dialog title="Test dialog" onCancel={onCancel} />, {
      attachTo: container,
    });

    const event = new Event('keydown');
    event.key = 'Escape';
    document.body.dispatchEvent(event);
    assert.called(onCancel);
    container.remove();
  });

  it('closes when close button is clicked', () => {
    const onCancel = sinon.stub();
    const wrapper = mount(<Dialog title="Test dialog" onCancel={onCancel} />);

    wrapper.find('.Dialog__cancel-btn').simulate('click');

    assert.called(onCancel);
  });

  it(`defaults cancel button's label to "Cancel"`, () => {
    const wrapper = mount(<Dialog onCancel={sinon.stub()} />);
    assert.equal(wrapper.find('LabeledButton').text().trim(), 'Cancel');
  });

  it('adds a custom label to the cancel button', () => {
    const wrapper = mount(
      <Dialog onCancel={sinon.stub()} cancelLabel="hello" />
    );
    assert.equal(wrapper.find('LabeledButton').text().trim(), 'hello');
  });

  describe('initial focus', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('focuses the `initialFocus` element', () => {
      const inputRef = createRef();

      mount(
        <Dialog initialFocus={inputRef}>
          <input ref={inputRef} />
        </Dialog>,
        { attachTo: container }
      );

      assert.equal(document.activeElement, inputRef.current);
    });

    it('focuses the dialog if `initialFocus` prop is missing', () => {
      const wrapper = mount(
        <Dialog>
          <div>Test</div>
        </Dialog>,
        { attachTo: container }
      );

      assert.equal(
        document.activeElement,
        wrapper.find('[role="dialog"]').getDOMNode()
      );
    });

    it('focuses the dialog if `initialFocus` ref is `null`', () => {
      const wrapper = mount(
        <Dialog initialFocus={{ current: null }}>
          <div>Test</div>
        </Dialog>,
        { attachTo: container }
      );

      assert.equal(
        document.activeElement,
        wrapper.find('[role="dialog"]').getDOMNode()
      );
    });

    it('focuses the dialog if `initialFocus` element is disabled', () => {
      const inputRef = createRef();

      const wrapper = mount(
        <Dialog initialFocus={inputRef}>
          <button ref={inputRef} disabled={true} />
        </Dialog>,
        { attachTo: container }
      );

      assert.equal(
        document.activeElement,
        wrapper.find('[role="dialog"]').getDOMNode()
      );
    });
  });

  it("marks the first `<p>` in the dialog's content as the accessible description", () => {
    const wrapper = mount(
      <Dialog>
        <p>Enter a URL</p>
      </Dialog>
    );
    const content = wrapper.find('[role="dialog"]').getDOMNode();
    const paragraphEl = wrapper.find('p').getDOMNode();

    assert.ok(content.getAttribute('aria-describedby'));
    assert.equal(content.getAttribute('aria-describedby'), paragraphEl.id);
  });

  it("does not set an accessible description if the dialog's content does not have a `<p>`", () => {
    const wrapper = mount(
      <Dialog>
        <button>Click me</button>
      </Dialog>
    );
    const content = wrapper.find('[role="dialog"]').getDOMNode();
    assert.isNull(content.getAttribute('aria-describedby'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      // eslint-disable-next-line react/display-name
      content: () => (
        <Dialog title="Test dialog">
          <div>test</div>
        </Dialog>
      ),
    })
  );
});

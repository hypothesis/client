import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import SearchInput from '../SearchInput';
import { $imports } from '../SearchInput';

describe('SearchInput', () => {
  let fakeIsMacOS;
  let fakeStore;
  let container;
  let wrappers;

  const createSearchInput = (props = {}) => {
    const wrapper = mount(<SearchInput {...props} />, { attachTo: container });
    wrappers.push(wrapper);
    return wrapper;
  };

  function typeQuery(wrapper, query) {
    const input = wrapper.find('input');
    input.getDOMNode().value = query;
    input.simulate('input');
  }

  beforeEach(() => {
    wrappers = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    fakeIsMacOS = sinon.stub().returns(false);
    fakeStore = { isLoading: sinon.stub().returns(false) };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../../shared/user-agent': {
        isMacOS: fakeIsMacOS,
      },
    });
  });

  afterEach(() => {
    wrappers.forEach(wrapper => wrapper.unmount());
    container.remove();
    $imports.$restore();
  });

  it('displays the active query', () => {
    const wrapper = createSearchInput({ query: 'foo' });
    assert.equal(wrapper.find('input').prop('value'), 'foo');
  });

  it('resets input field value to active query when active query changes', () => {
    const wrapper = createSearchInput({ query: 'foo' });

    // Simulate user editing the pending query, but not committing it.
    typeQuery(wrapper, 'pending-query');

    // Check that the pending query is displayed.
    assert.equal(wrapper.find('input').prop('value'), 'pending-query');

    // Simulate active query being reset.
    wrapper.setProps({ query: '' });

    assert.equal(wrapper.find('input').prop('value'), '');
  });

  it('invokes `onSearch` with pending query when form is submitted', () => {
    const onSearch = sinon.stub();
    const wrapper = createSearchInput({ query: 'foo', onSearch });
    typeQuery(wrapper, 'new-query');
    wrapper.find('form').simulate('submit');
    assert.calledWith(onSearch, 'new-query');
  });

  it('does not set an initial empty query when form is submitted', () => {
    // If the first query entered is empty, it will be ignored
    const onSearch = sinon.stub();
    const wrapper = createSearchInput({ onSearch });
    typeQuery(wrapper, '');
    wrapper.find('form').simulate('submit');
    assert.notCalled(onSearch);
  });

  it('sets subsequent empty queries if entered', () => {
    // If there has already been at least one query set, subsequent
    // empty queries will be honored
    const onSearch = sinon.stub();
    const wrapper = createSearchInput({ query: 'foo', onSearch });
    typeQuery(wrapper, '');
    wrapper.find('form').simulate('submit');
    assert.calledWith(onSearch, '');
  });

  it('renders loading indicator when app is in a "loading" state', () => {
    fakeStore.isLoading.returns(true);
    const wrapper = createSearchInput();
    assert.isTrue(wrapper.exists('Spinner'));
  });

  it('doesn\'t render search button when app is in "loading" state', () => {
    fakeStore.isLoading.returns(true);
    const wrapper = createSearchInput();
    assert.isFalse(wrapper.exists('button'));
  });

  it('doesn\'t render loading indicator when app is not in "loading" state', () => {
    fakeStore.isLoading.returns(false);
    const wrapper = createSearchInput();
    assert.isFalse(wrapper.exists('Spinner'));
  });

  it('renders search button when app is not in "loading" state', () => {
    fakeStore.isLoading.returns(false);
    const wrapper = createSearchInput();
    assert.isTrue(wrapper.exists('IconButton'));
  });

  it('focuses search input when button pressed', () => {
    fakeStore.isLoading.returns(false);
    const wrapper = createSearchInput();
    const inputEl = wrapper.find('input').getDOMNode();

    wrapper.find('IconButton').props().onClick();

    assert.equal(document.activeElement, inputEl);
  });

  describe('shortcut key handling', () => {
    it('focuses search input when "/" is pressed outside of the component element', () => {
      const wrapper = createSearchInput();
      const searchInputEl = wrapper.find('input').getDOMNode();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: '/',
        })
      );

      assert.equal(document.activeElement, searchInputEl);
    });

    it('focuses search input for non-Mac OSes when "ctrl-K" is pressed outside of the component element', () => {
      fakeIsMacOS.returns(false);
      const wrapper = createSearchInput();
      const searchInputEl = wrapper.find('input').getDOMNode();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'K',
          ctrlKey: true,
        })
      );

      assert.equal(document.activeElement, searchInputEl);
    });

    it('focuses search input for Mac OS when "Cmd-K" is pressed outside of the component element', () => {
      fakeIsMacOS.returns(true);
      const wrapper = createSearchInput();
      const searchInputEl = wrapper.find('input').getDOMNode();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'K',
          metaKey: true,
        })
      );

      assert.equal(document.activeElement, searchInputEl);
    });

    it('restores previous focus when focused and "Escape" key pressed', () => {
      const button = document.createElement('button');
      button.id = 'a-button';
      container.append(button);

      const wrapper = createSearchInput();

      const inputEl = wrapper.find('input').getDOMNode();
      const buttonEl = document.querySelector('#a-button');
      buttonEl.focus();

      buttonEl.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: '/',
        })
      );

      assert.equal(
        document.activeElement,
        inputEl,
        'focus is moved from button to input'
      );

      inputEl.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        })
      );

      assert.equal(
        document.activeElement,
        buttonEl,
        'focus has been restored to the button'
      );
    });

    ['textarea', 'input'].forEach(elementName => {
      it('does not steal focus when "/" pressed if user is in an input field', () => {
        const input = document.createElement(elementName);
        input.id = 'an-input';
        container.append(input);

        createSearchInput();

        const inputEl = document.querySelector('#an-input');

        inputEl.focus();

        assert.equal(document.activeElement, inputEl);

        inputEl.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: '/',
          })
        );

        assert.equal(
          document.activeElement,
          inputEl,
          'focus has not been moved to search input'
        );
      });
    });

    it('focuses search input if user is in an input field and presses "Ctrl-k"', () => {
      fakeIsMacOS.returns(false);
      const input = document.createElement('input');
      input.id = 'an-input';
      container.append(input);

      const wrapper = createSearchInput();

      const inputEl = document.querySelector('#an-input');
      const searchInputEl = wrapper
        .find('[data-testid="search-input"]')
        .at(0)
        .getDOMNode();

      inputEl.focus();

      assert.equal(document.activeElement, inputEl);

      inputEl.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'k',
          ctrlKey: true,
        })
      );

      assert.equal(
        document.activeElement,
        searchInputEl,
        'focus has been moved to search input'
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createSearchInput(),
      },
      {
        name: 'loading state',
        content: () => {
          fakeStore.isLoading.returns(true);
          return createSearchInput();
        },
      },
    ])
  );
});

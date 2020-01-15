import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import TagEditor from '../tag-editor';
import { $imports } from '../tag-editor';

import mockImportedComponents from './mock-imported-components';

describe('TagEditor', function() {
  let container;
  let fakeTags = ['tag1', 'tag2'];
  let fakeTagsService;
  let fakeServiceUrl;
  let fakeOnEditTags;

  function createComponent(props) {
    return mount(
      <TagEditor
        // props
        onEditTags={fakeOnEditTags}
        tagList={fakeTags}
        // service props
        serviceUrl={fakeServiceUrl}
        tags={fakeTagsService}
        {...props}
      />,
      { attachTo: container }
    );
  }

  // Simulates a selection event from datalist
  function selectOption(wrapper, item) {
    act(() => {
      wrapper
        .find('Datalist')
        .props()
        .onSelectItem(item);
    });
  }

  // Simulates pressing Enter
  function selectOptionViaEnter(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'Enter' });
  }
  // Simulates typing ","
  function selectOptionViaDelimiter(wrapper) {
    wrapper.find('input').simulate('keydown', { key: ',' });
  }
  // Simulates typing the down arrow
  function navigateDown(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'ArrowDown' });
  }
  // Simulates typing the up arrow
  function navigateUp(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'ArrowUp' });
  }
  // Simulates a typing text
  function typeInput(wrapper) {
    wrapper.find('input').simulate('input', { inputType: 'insertText' });
  }

  beforeEach(function() {
    container = document.createElement('div');
    document.body.appendChild(container);

    fakeOnEditTags = sinon.stub();
    fakeServiceUrl = sinon.stub().returns('http://serviceurl.com');
    fakeTagsService = {
      filter: sinon.stub().returns(['tag4', 'tag3']),
      store: sinon.stub(),
    };
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('adds appropriate tag values to the elements', () => {
    const wrapper = createComponent();
    wrapper.find('li').forEach((tag, i) => {
      assert.isTrue(tag.hasClass('tag-editor__item'));
      assert.equal(tag.text(), fakeTags[i]);
      assert.equal(tag.prop('aria-label'), `Tag: ${fakeTags[i]}`);
    });
  });

  it('generates an ordered datalist containing the array values returned from fakeTagsService.filter ', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'non-empty';
    typeInput(wrapper);
    assert.equal(wrapper.find('Datalist').prop('list')[0], 'tag3');
    assert.equal(wrapper.find('Datalist').prop('list')[1], 'tag4');
  });

  it('passes the text value to filter() after receiving input', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    typeInput(wrapper);
    assert.isTrue(fakeTagsService.filter.calledOnce);
    assert.isTrue(fakeTagsService.filter.calledWith('tag3'));
  });

  describe('suggestions open / close', () => {
    it('close the suggestions when selecting a tag from datalist', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty'; // to open list
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('open'), true);
      selectOption(wrapper, 'tag4');
      wrapper.update();
      assert.equal(wrapper.find('Datalist').prop('open'), false);
    });

    it('close the suggestions when deleting input', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('list').length, 2);
      wrapper.update();
      assert.equal(wrapper.find('Datalist').prop('open'), true);
      wrapper.find('input').instance().value = ''; // clear input
      wrapper
        .find('input')
        .simulate('input', { inputType: 'deleteContentBackward' });
      assert.equal(wrapper.find('Datalist').prop('open'), false);
    });

    it('does not close the suggestions when deleting only part of the input', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('list').length, 2);
      assert.equal(wrapper.find('Datalist').prop('open'), true);
      wrapper.find('input').instance().value = 't'; // non-empty input remains
      wrapper
        .find('input')
        .simulate('input', { inputType: 'deleteContentBackward' });
      assert.equal(wrapper.find('Datalist').prop('open'), true);
    });

    it('opens the suggestions on focus if input is not empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      assert.equal(wrapper.find('Datalist').prop('open'), false);
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('Datalist').prop('open'), true);
    });

    it('does not open the suggestions on focus if input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('Datalist').prop('open'), false);
    });

    it('does not open the suggestions on focus if input is only white space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = ' ';
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('Datalist').prop('open'), false);
    });

    it('closes the suggestions when focus is removed from the input', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('open'), true);
      document.body.dispatchEvent(new Event('focus'));
      wrapper.update();
      assert.equal(wrapper.find('Datalist').prop('open'), false);
    });

    it('does not render duplicate suggestions', () => {
      // `tag3` supplied in the `tagList` will be a duplicate value relative
      // with the fakeTagsService.filter result above.
      const wrapper = createComponent({
        editMode: true,
        tagList: ['tag1', 'tag2', 'tag3'],
      });
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('list').length, 1);
      assert.equal(wrapper.find('Datalist').prop('list')[0], 'tag4');
    });
  });

  describe('when adding tags', () => {
    /**
     * Helper function to assert that a tag was correctly added
     */
    const assertAddTagsSuccess = (wrapper, tagList) => {
      // saves the suggested tags to the service
      assert.isTrue(
        fakeTagsService.store.calledWith(tagList.map(tag => ({ text: tag })))
      );
      // called the onEditTags callback prop
      assert.isTrue(fakeOnEditTags.calledWith({ tags: tagList }));
      // hides the suggestions
      assert.equal(wrapper.find('Datalist').prop('open'), false);
      // assert the input value is cleared out
      assert.equal(wrapper.find('input').instance().value, '');
      // input element should have focus
      assert.equal(document.activeElement.nodeName, 'INPUT');
    };
    /**
     * Helper function to assert that a tag was correctly not added
     */
    const assertAddTagsFail = () => {
      assert.isTrue(fakeTagsService.store.notCalled);
      assert.isTrue(fakeOnEditTags.notCalled);
    };

    it('adds a tag from the input field', () => {
      const wrapper = createComponent();
      selectOption(wrapper, 'tag3');
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('adds a tag from the input field via keydown event', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOptionViaEnter(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('adds a tag from the input field when typing "," delimiter', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOptionViaDelimiter(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('should not add a tag if the input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if the input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if the input is blank space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '  ';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if its a duplicate of one already in the list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag1';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });
  });

  describe('when removing tags', () => {
    it('removes `tag1` when clicking its delete button', () => {
      const wrapper = createComponent(); // note: initial tagList is ['tag1', 'tag2']
      assert.equal(wrapper.find('.tag-editor__edit').length, 2);
      wrapper
        .find('button')
        .at(0) // delete 'tag1'
        .simulate('click');

      // saves the suggested tags to the service (only 'tag2' should be passed)
      assert.isTrue(fakeTagsService.store.calledWith([{ text: 'tag2' }]));
      // called the onEditTags callback prop  (only 'tag2' should be passed)
      assert.isTrue(fakeOnEditTags.calledWith({ tags: ['tag2'] }));
    });
  });

  describe('navigating suggestions via keyboard', () => {
    it('should set the initial activeItem value to -1 when opening suggestions', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('open'), true);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), -1);
    });
    it('should increment the activeItem when pressing down circularly', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // 2 suggestions: ['tag3', 'tag4'];
      navigateDown(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), 0);
      navigateDown(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), 1);
      navigateDown(wrapper);
      // back to unselected
      assert.equal(wrapper.find('Datalist').prop('activeItem'), -1);
    });

    it('should decrement the activeItem when pressing up circularly', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // 2 suggestions: ['tag3', 'tag4'];
      navigateUp(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), 1);
      navigateUp(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), 0);
      navigateUp(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), -1);
    });

    it('should set activeItem to -1 when clearing the suggestions', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      navigateDown(wrapper);
      // change to non-default value
      assert.equal(wrapper.find('Datalist').prop('activeItem'), 0);
      // clear suggestions
      wrapper.find('input').instance().value = '';
      typeInput(wrapper);
      assert.equal(wrapper.find('Datalist').prop('activeItem'), -1);
    });
  });
});

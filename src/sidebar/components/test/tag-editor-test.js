'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const mockImportedComponents = require('./mock-imported-components');
const TagEditor = require('../tag-editor');

describe('TagEditor', function() {
  let fakeTags = ['tag1', 'tag2'];
  let fakeTagsService;
  let fakeServiceUrl;
  let fakeOnEditTags;

  function createComponent(props) {
    return mount(
      <TagEditor
        // props
        annotation={{
          id: 'annotation_id',
        }}
        onEditTags={fakeOnEditTags}
        tagList={fakeTags}
        // service props
        serviceUrl={fakeServiceUrl}
        tags={fakeTagsService}
        {...props}
      />
    );
  }

  beforeEach(function() {
    fakeOnEditTags = sinon.stub();
    fakeServiceUrl = sinon.stub().returns('http://serviceurl.com');
    fakeTagsService = {
      filter: sinon.stub().returns(['tag3', 'tag4']),
      store: sinon.stub(),
    };

    TagEditor.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    TagEditor.$imports.$restore();
  });

  it('adds appropriate tag values to the elements', () => {
    const wrapper = createComponent();
    wrapper.find('li').forEach((tag, i) => {
      assert.isTrue(tag.hasClass('tag-editor__tag-item'));
      assert.equal(tag.text(), fakeTags[i]);
      assert.equal(tag.prop('aria-label'), `Tag: ${fakeTags[i]}`);
    });
  });

  it('creates the component with a unique id', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper.find('input').prop('list'),
      'tag-editor-datalist-annotation_id'
    );
  });

  it('calls fakeTagsService.filter with the value from the input field', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    // simulate `keyup` to populate suggestions list
    wrapper.find('input').simulate('keyup', { key: 'any' });
    assert.isTrue(fakeTagsService.filter.calledWith('tag3'));
  });

  it('generates a datalist set equal to the array value returned from fakeTagsService.filter ', () => {
    const wrapper = createComponent();
    // simulate `keyup` to populate suggestions list
    wrapper.find('input').simulate('keyup', { key: 'any' });

    assert.equal(
      wrapper
        .find('datalist option')
        .at(0)
        .prop('value'),
      'tag3'
    );
    assert.equal(
      wrapper
        .find('datalist option')
        .at(1)
        .prop('value'),
      'tag4'
    );
  });

  it('clears the suggestions when adding a new tag', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    // simulate `keyup` to populate suggestions list
    wrapper.find('input').simulate('keyup', { key: 'any' });
    assert.equal(wrapper.find('datalist option').length, 2);
    wrapper.find('input').simulate('keyup'); // no key supplied
    assert.equal(wrapper.find('datalist option').length, 0);

    assert.isTrue(
      fakeTagsService.store.calledWith([
        { text: 'tag1' },
        { text: 'tag2' },
        { text: 'tag3' },
      ])
    );
  });

  it('does not render duplicate suggestions', () => {
    // `tag3` supplied in the `tagList` will be a duplicate value relative
    // with the fakeTagsService.filter result above.
    const wrapper = createComponent({
      editMode: true,
      tagList: ['tag1', 'tag2', 'tag3'],
    });
    // simulate `keyup` to populate suggestions list
    wrapper.find('input').simulate('keyup', { key: 'any' });
    assert.equal(wrapper.find('datalist option').length, 1);
    assert.equal(
      wrapper
        .find('datalist option')
        .at(0)
        .prop('value'),
      'tag4'
    );
  });

  context('when adding tags', () => {
    /**
     * Helper function to assert that a tag was correctly added
     */
    const addTagsSuccess = (wrapper, tagList) => {
      // saves the suggested tags to the service
      assert.isTrue(
        fakeTagsService.store.calledWith(tagList.map(tag => ({ text: tag })))
      );
      // called the onEditTags callback prop
      assert.isTrue(fakeOnEditTags.calledWith({ tags: tagList }));
      // clears out the suggestions
      assert.equal(wrapper.find('datalist option').length, 0);
      // assert the input value is cleared out
      assert.equal(wrapper.find('input').instance().value, '');
      // note: focus not tested
    };
    /**
     * Helper function to assert that a tag was correctly not added
     */
    const addTagsFail = () => {
      assert.isTrue(fakeTagsService.store.notCalled);
      assert.isTrue(fakeOnEditTags.notCalled);
    };

    it('adds a tag from the input field', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      wrapper.find('input').simulate('keyup'); // simulates a selection
      addTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('populate the datalist, then adds a tag from the input field', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      // simulate `keyup` to populate suggestions list
      wrapper.find('input').simulate('keyup', { key: 'any' });
      assert.equal(wrapper.find('datalist option').length, 2);

      wrapper.find('input').simulate('keyup'); // simulates a selection
      addTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('clears out the <datalist> element after adding a tag', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      // simulate `keyup` to populate suggestions list
      wrapper.find('input').simulate('keyup', { key: 'any' });
      assert.equal(wrapper.find('datalist option').length, 2);

      wrapper.find('input').simulate('keyup'); // simulates a selection
      assert.isFalse(wrapper.find('datalist').exists());
    });

    it('should not add a tag if the input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';

      wrapper.find('input').simulate('keyup'); // simulates a selection
      addTagsFail();
    });

    it('should not add a tag if the input is blank space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '  ';
      wrapper.find('input').simulate('keyup'); // simulates a selection
      addTagsFail();
    });

    it('should not add a tag if its a duplicate of one already in the list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag1';
      wrapper.find('input').simulate('keyup'); // simulates a selection
      addTagsFail();
    });

    it('adds a tag via keypress `Enter`', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      wrapper.find('input').simulate('keypress', { key: 'Enter' });
      addTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('adds a tag via keypress `,`', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      wrapper.find('input').simulate('keypress', { key: ',' });
      addTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('does not add a tag when key is not `,` or  `Enter`', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      wrapper.find('input').simulate('keypress', { key: 'e' });
      addTagsFail();
    });
  });

  context('when removing tags', () => {
    /**
     * Helper function to assert that a tag was correctly added
     */
    const removeTagsSuccess = tagList => {
      // saves the suggested tags to the service
      assert.isTrue(
        fakeTagsService.store.calledWith(tagList.map(tag => ({ text: tag })))
      );
      // called the onEditTags callback prop
      assert.isTrue(fakeOnEditTags.calledWith({ tags: tagList }));
    };

    it('removes `tag1` when clicking its delete button', () => {
      const wrapper = createComponent();
      assert.equal(wrapper.find('.tag-editor__edit').length, 2);
      wrapper
        .find('button')
        .at(0)
        .simulate('click');
      removeTagsSuccess(['tag2']);
    });
  });
});

'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const mockImportedComponents = require('./mock-imported-components');
const TagEditor2 = require('../tag-editor2');

describe('TagEditor2', function() {
  let fakeTagsService;
  let fakeServiceUrl;
  let fakeOnEditTags;

  function createComponent(props) {
    return mount(
      <TagEditor2
        // props
        id={'annotation_id'}
        editMode={false}
        isThirdParty={false}
        onEditTags={fakeOnEditTags}
        tagList={['tag1', 'tag2']}
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

    TagEditor2.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    TagEditor2.$imports.$restore();
  });

  context('when editMode is false', function() {
    it('adds appropriate class names and tag values to the elements', () => {
      const wrapper = createComponent();
      assert.equal(
        wrapper
          .find('a.tag-editor__link')
          .at(0)
          .text(),
        'tag1'
      );
      assert.equal(
        wrapper
          .find('a.tag-editor__link')
          .at(1)
          .text(),
        'tag2'
      );
    });

    it('adds appropriate aria values to the elements', () => {
      const wrapper = createComponent();
      assert.equal(
        wrapper
          .find('.tag-editor__tag-item a')
          .at(0)
          .prop('aria-label'),
        'Tag: tag1'
      );
      assert.equal(
        wrapper
          .find('.tag-editor__tag-item a')
          .at(1)
          .prop('aria-label'),
        'Tag: tag2'
      );
    });

    it('renders the href when isThirdParty is false', () => {
      const wrapper = createComponent();
      assert.equal(
        wrapper
          .find('a.tag-editor__link')
          .at(0)
          .prop('href'),
        'http://serviceurl.com'
      );
      assert.equal(
        wrapper
          .find('a.tag-editor__link')
          .at(1)
          .prop('href'),
        'http://serviceurl.com'
      );

      assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag1' });
      assert.calledWith(fakeServiceUrl, 'search.tag', { tag: 'tag2' });

      it('does not render the href when isThirdParty is true', () => {
        const wrapper = createComponent({ isThirdParty: true });
        assert.equal(
          wrapper
            .find('a.tag-editor__link')
            .at(0)
            .prop('href'),
          undefined
        );
        assert.equal(
          wrapper
            .find('a.tag-editor__link')
            .at(1)
            .prop('href'),
          undefined
        );

        assert.notCalled(fakeServiceUrl);
      });
    });
  });

  context('when editMode is true', function() {
    it('adds appropriate class names and tag values to the elements', () => {
      const wrapper = createComponent({ editMode: true });
      assert.equal(
        wrapper
          .find('.tag-editor__edit')
          .at(0)
          .text(),
        'tag1'
      );
      assert.equal(
        wrapper
          .find('.tag-editor__edit')
          .at(1)
          .text(),
        'tag2'
      );
    });

    it('adds appropriate aria values to the elements', () => {
      const wrapper = createComponent({ editMode: true });
      assert.equal(
        wrapper
          .find('.tag-editor__tag-item')
          .at(0)
          .prop('aria-label'),
        'Tag: tag1'
      );
      assert.equal(
        wrapper
          .find('.tag-editor__tag-item')
          .at(1)
          .prop('aria-label'),
        'Tag: tag2'
      );
    });

    it('creates the component with a unique id', () => {
      const wrapper = createComponent({ editMode: true });
      assert.equal(
        wrapper.find('input').prop('list'),
        'tag-editor-datalist-annotation_id'
      );
    });

    it('calls fakeTagsService.filter with the value from the input field', () => {
      const wrapper = createComponent({ editMode: true });
      wrapper.find('input').instance().value = 'tag3';
      // simulate `keyup` to populate suggestions list
      wrapper.find('input').simulate('keyup', { key: 'any' });
      assert.isTrue(fakeTagsService.filter.calledWith('tag3'));
    });

    it('generates a datalist set equal to the array value returned from fakeTagsService.filter ', () => {
      const wrapper = createComponent({ editMode: true });
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
      const wrapper = createComponent({ editMode: true });
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
      const addTagsSavedSuccess = (wrapper, tagList) => {
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
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag3';

        wrapper.find('input').simulate('keyup'); // simulates a selection
        addTagsSavedSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      });

      it('populate the datalist, then adds a tag from the input field', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag3';

        // simulate `keyup` to populate suggestions list
        wrapper.find('input').simulate('keyup', { key: 'any' });
        assert.equal(wrapper.find('datalist option').length, 2);

        wrapper.find('input').simulate('keyup'); // simulates a selection
        addTagsSavedSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      });

      it('should not add a tag if the input is empty', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = '';

        wrapper.find('input').simulate('keyup'); // simulates a selection
        addTagsFail();
      });

      it('should not add a tag if the input is blank space', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = '  ';
        wrapper.find('input').simulate('keyup'); // simulates a selection
        addTagsFail();
      });

      it('should not add a tag if its a duplicate of one already in the list', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag1';
        wrapper.find('input').simulate('keyup'); // simulates a selection
        addTagsFail();
      });

      it('adds a tag via keypress `Enter`', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag3';

        wrapper.find('input').simulate('keypress', { key: 'Enter' });
        addTagsSavedSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      });

      it('adds a tag via keypress `,`', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag3';

        wrapper.find('input').simulate('keypress', { key: ',' });
        addTagsSavedSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      });

      it('does not add a tag when key is not `,` or  `Enter`', () => {
        const wrapper = createComponent({ editMode: true });
        wrapper.find('input').instance().value = 'tag3';

        wrapper.find('input').simulate('keypress', { key: 'e' });
        addTagsFail();
      });
    });

    context('when deleting tags', () => {
      /**
       * Helper function to assert that a tag was correctly added
       */
      const deleteTagsSavedSuccess = tagList => {
        // saves the suggested tags to the service
        assert.isTrue(
          fakeTagsService.store.calledWith(tagList.map(tag => ({ text: tag })))
        );
        // called the onEditTags callback prop
        assert.isTrue(fakeOnEditTags.calledWith({ tags: tagList }));
      };

      it('deletes `tag1` when clicking its delete button', () => {
        const wrapper = createComponent({ editMode: true });
        assert.equal(wrapper.find('.tag-editor__edit').length, 2);
        wrapper
          .find('button')
          .at(0)
          .simulate('click');
        deleteTagsSavedSuccess(['tag2']);
      });
    });
  });
});

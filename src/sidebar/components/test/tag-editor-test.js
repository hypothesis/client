import { mount } from 'enzyme';
import { createElement } from 'preact';

import TagEditor from '../tag-editor';
import { $imports } from '../tag-editor';

import mockImportedComponents from './mock-imported-components';

describe('TagEditor', function() {
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
      />
    );
  }

  // Simulates a selection event from datalist
  function selectOption(wrapper) {
    wrapper.find('input').simulate('input', { inputType: undefined });
  }
  // Simulates a selection event from datalist. This is the
  // only event that fires in in Safari. In Chrome, both the `keyup`
  // and `input` events fire, but only the first one adds the tag.
  function selectOptionViaKeyUp(wrapper) {
    wrapper.find('input').simulate('keyup', { key: 'Enter' });
  }

  // Simulates a typing input event
  function typeInput(wrapper) {
    wrapper.find('input').simulate('input', { inputType: 'insertText' });
  }

  beforeEach(function() {
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
      assert.isTrue(tag.hasClass('tag-editor__tag-item'));
      assert.equal(tag.text(), fakeTags[i]);
      assert.equal(tag.prop('aria-label'), `Tag: ${fakeTags[i]}`);
    });
  });

  it("creates a `list` prop on the input that matches the datalist's `id`", () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper.find('input').prop('list'),
      wrapper.find('datalist').prop('id')
    );
  });

  it('creates multiple TagEditors with unique datalist `id`s', () => {
    const wrapper1 = createComponent();
    const wrapper2 = createComponent();
    assert.notEqual(
      wrapper1.find('datalist').prop('id'),
      wrapper2.find('datalist').prop('id')
    );
  });

  it('generates a ordered datalist containing the array values returned from fakeTagsService.filter ', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'non-empty';
    wrapper.find('input').simulate('input', { inputType: 'insertText' });

    // fakeTagsService.filter returns ['tag4', 'tag3'], but
    // datalist shall be ordered as ['tag3', 'tag4']
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

  [
    {
      text: ' in Chrome and Safari',
      eventPayload: { inputType: undefined },
    },
    {
      text: ' in Firefox',
      eventPayload: { inputType: 'insertReplacementText' },
    },
  ].forEach(test => {
    it(`clears the suggestions when selecting a tag from datalist ${test.text}`, () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      assert.equal(wrapper.find('datalist option').length, 2);
      wrapper.find('input').simulate('input', test.eventPayload); // simulates a selection
      assert.equal(wrapper.find('datalist option').length, 0);

      assert.isTrue(
        fakeTagsService.store.calledWith([
          { text: 'tag1' },
          { text: 'tag2' },
          { text: 'tag3' },
        ])
      );
    });
  });

  it('clears the suggestions when deleting input', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    typeInput(wrapper);
    assert.equal(wrapper.find('datalist option').length, 2);
    wrapper.find('input').instance().value = '';
    wrapper
      .find('input')
      .simulate('input', { inputType: 'deleteContentBackward' });
    assert.equal(wrapper.find('datalist option').length, 0);
  });

  it('does not clear the suggestions when deleting only part of the input', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    typeInput(wrapper);
    assert.equal(wrapper.find('datalist option').length, 2);
    wrapper.find('input').instance().value = 't'; // non-empty input remains
    wrapper
      .find('input')
      .simulate('input', { inputType: 'deleteContentBackward' });
    assert.notEqual(wrapper.find('datalist option').length, 0);
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
    const assertAddTagsSuccess = (wrapper, tagList) => {
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
    const assertAddTagsFail = () => {
      assert.isTrue(fakeTagsService.store.notCalled);
      assert.isTrue(fakeOnEditTags.notCalled);
    };

    it('adds a tag from the input field', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOption(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('adds a tag from the input field via keyup event', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOptionViaKeyUp(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('populate the datalist, then adds a tag from the input field', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';

      typeInput(wrapper);
      assert.equal(wrapper.find('datalist option').length, 2);

      selectOption(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('clears out the <option> elements after adding a tag', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';

      typeInput(wrapper);
      assert.equal(wrapper.find('datalist option').length, 2);

      selectOption(wrapper);
      assert.equal(wrapper.find('datalist option').length, 0);
    });

    it('should not add a tag if the input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';

      selectOption(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if the input is blank space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '  ';
      selectOption(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if its a duplicate of one already in the list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag1';
      selectOption(wrapper);
      assertAddTagsFail();
    });

    [
      {
        key: 'Enter',
        text: 'adds a tag via keypress `Enter`',
        run: wrapper => {
          assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
        },
      },
      {
        key: ',',
        text: 'adds a tag via keypress `,`',
        run: wrapper => {
          assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
        },
      },
      {
        key: 'e',
        text: 'does not add a tag when key is not `,` or  `Enter`',
        run: () => {
          assertAddTagsFail();
        },
      },
    ].forEach(test => {
      it(test.text, () => {
        const wrapper = createComponent();
        wrapper.find('input').instance().value = 'tag3';
        wrapper.find('input').simulate('keypress', { key: test.key });
        test.run(wrapper);
      });
    });
  });

  context('when removing tags', () => {
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

  describe('filter on text input based on user agent', () => {
    let fakeNavigator;
    beforeEach(function() {
      fakeNavigator = sinon.stub(navigator, 'userAgent');
    });

    afterEach(function() {
      fakeNavigator.restore();
    });

    it('calls filter when changing input with a limit of 20 when browser is Chrome', () => {
      fakeNavigator.get(() => 'Chrome/1.0');
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag';
      typeInput(wrapper);

      assert.isTrue(fakeTagsService.filter.calledTwice);
      assert.isTrue(fakeTagsService.filter.calledWith('tag', 20));
    });

    it('does not call filter when changing input when browser is not Chrome', () => {
      fakeNavigator.get(() => '');
      const wrapper = createComponent();

      wrapper.find('input').instance().value = 'tag';
      typeInput(wrapper);

      assert.isTrue(fakeTagsService.filter.calledOnce);
      assert.isTrue(fakeTagsService.filter.calledWith(''));
    });
  });
});

'use strict';

const draftsService = require('../drafts');

const fixtures = {
  draftWithText: {
    isPrivate: false,
    text: 'some text',
    tags: [],
  },
  draftWithTags: {
    isPrivate: false,
    text: '',
    tags: ['atag'],
  },
  emptyDraft: {
    isPrivate: false,
    text: '',
    tags: [],
  },
};

describe('drafts', function () {
  let drafts;

  beforeEach(function () {
    drafts = draftsService();
  });

  describe('#getIfNotEmpty', function () {
    it('returns the draft if it has tags', function () {
      const model = {id: 'foo'};
      drafts.update(model, fixtures.draftWithTags);
      assert.deepEqual(drafts.getIfNotEmpty(model), fixtures.draftWithTags);
    });

    it('returns the draft if it has text', function () {
      const model = {id: 'foo'};
      drafts.update(model, fixtures.draftWithText);
      assert.deepEqual(drafts.getIfNotEmpty(model), fixtures.draftWithText);
    });

    it('returns null if the text and tags are empty', function () {
      const model = {id: 'foo'};
      drafts.update(model, fixtures.emptyDraft);
      assert.isNull(drafts.getIfNotEmpty(model));
    });
  });

  describe('#update', function () {
    it('should save changes', function () {
      const model = {id: 'foo'};
      assert.notOk(drafts.get(model));
      drafts.update(model, {isPrivate:true, tags:['foo'], text:'edit'});
      assert.deepEqual(
        drafts.get(model),
        {isPrivate: true, tags: ['foo'], text: 'edit'});
    });

    it('should replace existing drafts', function () {
      const model = {id: 'foo'};
      drafts.update(model, {isPrivate:true, tags:['foo'], text:'foo'});
      drafts.update(model, {isPrivate:true, tags:['foo'], text:'bar'});
      assert.equal(drafts.get(model).text, 'bar');
    });

    it('should replace existing drafts with the same ID', function () {
      const modelA = {id: 'foo'};
      const modelB = {id: 'foo'};
      drafts.update(modelA, {isPrivate:true, tags:['foo'], text:'foo'});
      drafts.update(modelB, {isPrivate:true, tags:['foo'], text:'bar'});
      assert.equal(drafts.get(modelA).text, 'bar');
    });

    it('should replace drafts with the same tag', function () {
      const modelA = {$tag: 'foo'};
      const modelB = {$tag: 'foo'};
      drafts.update(modelA, {isPrivate:true, tags:['foo'], text:'foo'});
      drafts.update(modelB, {isPrivate:true, tags:['foo'], text:'bar'});
      assert.equal(drafts.get(modelA).text, 'bar');
    });
  });

  describe('#remove', function () {
    it('should remove drafts', function () {
      const model = {id: 'foo'};
      drafts.update(model, {text: 'bar'});
      drafts.remove(model);
      assert.notOk(drafts.get(model));
    });
  });

  describe('#unsaved', function () {
    it('should return drafts for unsaved annotations', function () {
      const model = {$tag: 'local-tag', id: undefined};
      drafts.update(model, {text: 'bar'});
      assert.deepEqual(drafts.unsaved(), [model]);
    });

    it('should not return drafts for saved annotations', function () {
      const model = {id: 'foo'};
      drafts.update(model, {text: 'baz'});
      assert.deepEqual(drafts.unsaved(), []);
    });
  });
});

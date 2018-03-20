'use strict';

var links = require('../links');

var init   = links.init;
var update = links.update.UPDATE_LINKS;
var action = links.actions.updateLinks;

describe('sidebar.reducers.links', function() {
  describe('#init()', function() {
    it('returns a null links object', function() {
      assert.deepEqual(init(), {links: null});
    });
  });

  describe('#update.UPDATE_LINKS()', function() {
    it('returns the given newLinks as the links object', function() {
      assert.deepEqual(
        update('CURRENT_STATE', {newLinks: 'NEW_LINKS'}),
        {links: 'NEW_LINKS'});
    });
  });

  describe('#actions.updateLinks()', function() {
    it('returns an UPDATE_LINKS action object for the given newLinks', function() {
      assert.deepEqual(
        action('NEW_LINKS'),
        { type: 'UPDATE_LINKS', newLinks: 'NEW_LINKS' });
    });
  });
});

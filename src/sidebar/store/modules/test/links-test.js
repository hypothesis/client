import links from '../links';

const init = links.init;
const update = links.update.UPDATE_LINKS;
const action = links.actions.updateLinks;

describe('sidebar/store/modules/links', function () {
  describe('#init()', function () {
    it('returns a null links object', function () {
      assert.deepEqual(init(), null);
    });
  });

  describe('#update.UPDATE_LINKS()', function () {
    it('returns the given newLinks as the links object', function () {
      assert.deepEqual(
        update('CURRENT_STATE', { newLinks: { NEW_LINK: 'http://new_link' } }),
        { NEW_LINK: 'http://new_link' }
      );
    });
  });

  describe('#actions.updateLinks()', function () {
    it('returns an UPDATE_LINKS action object for the given newLinks', function () {
      assert.deepEqual(action({ NEW_LINK: 'http://new_link' }), {
        type: 'UPDATE_LINKS',
        newLinks: { NEW_LINK: 'http://new_link' },
      });
    });
  });
});

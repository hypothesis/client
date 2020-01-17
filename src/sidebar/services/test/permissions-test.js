import Permissions from '../permissions';

const userid = 'acct:flash@gord.on';

describe('permissions', function() {
  let fakeStore;
  let permissions;

  beforeEach(function() {
    fakeStore = {
      getDefault: sinon.stub().returns(null),
      setDefault: sinon.stub(),
    };
    permissions = new Permissions(fakeStore);
  });

  describe('#private', function() {
    it('only allows the user to read the annotation', function() {
      assert.deepEqual(permissions.private(userid), {
        read: [userid],
        update: [userid],
        delete: [userid],
      });
    });
  });

  describe('#shared', function() {
    it('allows the group to read the annotation', function() {
      assert.deepEqual(permissions.shared(userid, 'gid'), {
        read: ['group:gid'],
        update: [userid],
        delete: [userid],
      });
    });
  });

  describe('#setDefault', function() {
    it('saves the default permissions in the store', function() {
      permissions.setDefault('private');
      assert.calledWith(fakeStore.setDefault, 'annotationPrivacy', 'private');
    });
  });

  describe('#isShared', function() {
    it('returns true if a group can read the annotation', function() {
      const perms = permissions.shared(userid, 'gid');
      assert.isTrue(permissions.isShared(perms));
    });

    it('returns false if only specific users can read the annotation', function() {
      const perms = permissions.private(userid);
      assert.isFalse(permissions.isShared(perms));
    });
  });

  describe('#permits', function() {
    it('returns true if the user can perform the action', function() {
      const perms = permissions.private(userid);
      assert.isTrue(permissions.permits(perms, 'update', userid));
      assert.isTrue(permissions.permits(perms, 'delete', userid));
    });

    it('returns false if the user cannot perform the action', function() {
      const perms = permissions.private('acct:not.flash@gord.on');
      assert.isFalse(permissions.permits(perms, 'update', userid));
      assert.isFalse(permissions.permits(perms, 'delete', userid));
    });
  });
});

'use strict';

var random = require('../random');

describe('sidebar.util.random', () => {
  describe('#generateHexString', () => {
    [2,4,8,16].forEach((len) => {
      it(`returns a ${len} digit hex string`, () => {
        var re = new RegExp(`^[0-9a-fA-F]{${len}}$`);
        var str = random.generateHexString(len);
        assert.isTrue(re.test(str));
      });
    });
  });
});

import { isIE11, isMacOS } from '../user-agent';

describe('shared/user-agent', () => {
  describe('isIE11', () => {
    it('returns true when the user agent is IE 11', () => {
      assert.isTrue(
        isIE11('Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko')
      );
    });

    it('returns false when the user agent is not IE 11', () => {
      assert.isFalse(
        isIE11(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36 Edg/80.0.361.109'
        )
      );
    });
  });

  describe('isMacOS', () => {
    it('returns true when the user agent is a Mac', () => {
      assert.isTrue(
        isMacOS(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
        )
      );
    });

    it('returns false when the user agent is not a Mac', () => {
      assert.isFalse(
        isMacOS(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36 Edg/80.0.361.109'
        )
      );
    });
  });
});

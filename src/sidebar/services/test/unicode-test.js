'use strict';

var unicode = require('../unicode')();

describe('unicode', () => {
  describe('#fold', () => {
    it('removes hungarian marks', () => {
      var text = 'Fürge rőt róka túlszökik zsíros étkű kutyán';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = 'Furge rot roka tulszokik zsiros etku kutyan';

      assert.equal(decoded, expected);
    });

    it('removes greek marks', () => {
      var text = 'Καλημέρα κόσμε';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = 'Καλημερα κοσμε';

      assert.equal(decoded, expected);
    });

    it('removes japanese marks', () => {
      var text = 'カタカナコンバータ';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = 'カタカナコンハータ';

      assert.equal(decoded, expected);
    });

    it('removes marathi marks', () => {
      var text = 'काचं शक्नोम्यत्तुम';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = 'कच शकनमयततम';

      assert.equal(decoded, expected);
    });

    it('removes thai marks', () => {
      var text = 'ฉันกินกระจกได้ แต่มันไม่ทำให้ฉันเจ็บ';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = 'ฉนกนกระจกได แตมนไมทาใหฉนเจบ';

      assert.equal(decoded, expected);
    });

    it('removes all marks', () => {
      var text = '̀ ́ ̂ ̃ ̄ ̅ ̆ ̇ ̈ ̉ ̊ ̋ ̌ ̍ ̎ ̏ ̐ ̑ ̒ ̓ ̔ ̕ ̖ ̗ ̘ ̙ ̚ ̛ ̜ ̝ ̞ ̟ ̠ ̡ ̢ ̣ ̤ ̥ ̦ ̧ ̨ ̩ ̪ ̫ ̬ ̭ ̮ ̯ ̰ ̱ ̲ ̳ ̴ ̵ ̶ ̷ ̸ ̹ ̺ ̻ ̼ ̽ ̾ ̿ ̀ ́ ͂ ̓ ̈́ ͅ ͠ ͡"';
      var decoded = unicode.fold(unicode.normalize(text));
      var expected = '                                                                       "';

      assert.equal(decoded, expected);
    });
  });
});

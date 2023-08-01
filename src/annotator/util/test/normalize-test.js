import { translateOffsets } from '../normalize';

const isNotSpace = str => /\S/.test(str);

describe('annotator/util/normalize', () => {
  describe('translateOffsets', () => {
    [
      // Strings with no ignored chars
      {
        inStr: 'abcd',
        outStr: 'abcd',
        inMatch: 'abcd',
        outMatch: 'abcd',
      },
      // Strings with some ignored chars
      {
        inStr: '   ab    cd  ',
        outStr: ' a   b  c   d ',
        inMatch: 'ab    cd',
        outMatch: 'a   b  c   d',
      },
      {
        inStr: ' foo   bar\nbaz',
        outStr: 'foob  arbaz',
        inMatch: 'bar',
        outMatch: 'b  ar',
      },
    ].forEach(({ inStr, outStr, inMatch, outMatch }, index) => {
      it(`returns translated offsets (${index})`, () => {
        const start = inStr.indexOf(inMatch);
        assert.notEqual(start, -1, 'Input substring not found');
        const end = start + inMatch.length;

        const expectedStart = outStr.indexOf(outMatch);
        assert.notEqual(expectedStart, -1, 'Output substring not found');
        const expectedEnd = expectedStart + outMatch.length;

        const [outStart, outEnd] = translateOffsets(
          inStr,
          outStr,
          start,
          end,
          isNotSpace,
        );

        assert.equal(outStart, expectedStart, 'Incorrect start offset');
        assert.equal(outEnd, expectedEnd, 'Incorrect end offset');
      });
    });

    it('returns offsets at end of string if input contains only ignored chars', () => {
      const inStr = '     ';
      const outStr = inStr;
      const [outStart, outEnd] = translateOffsets(
        inStr,
        outStr,
        0,
        5,
        isNotSpace,
      );
      assert.equal(outStart, 5);
      assert.equal(outEnd, 5);
    });

    it('handles start offsets < 0', () => {
      const inStr = 'abcd';
      const outStr = '  a      bcd';
      const start = -3;
      const end = inStr.length;
      const [outStart, outEnd] = translateOffsets(
        inStr,
        outStr,
        start,
        end,
        isNotSpace,
      );
      assert.equal(outStart, outStr.indexOf('a'));
      assert.equal(outEnd, outStr.indexOf('d') + 1);
    });

    it('handles end offsets greater than string length', () => {
      const inStr = 'abcd';
      const outStr = '  a      bcd';
      const start = inStr.indexOf('c');
      const end = inStr.length + 5;
      const [outStart, outEnd] = translateOffsets(
        inStr,
        outStr,
        start,
        end,
        isNotSpace,
      );
      assert.equal(outStart, outStr.indexOf('c'));
      assert.equal(outEnd, outStr.indexOf('d') + 1);
    });

    it('returns equal offsets if start/end input offsets are equal', () => {
      const inStr = 'abcd';
      const outStr = 'a b c d';
      const start = inStr.indexOf('c');

      const [outStart, outEnd] = translateOffsets(
        inStr,
        outStr,
        start,
        start,
        isNotSpace,
      );

      assert.equal(outStart, outStr.indexOf('c'));
      assert.equal(outEnd, outStart);
    });

    it('does not return offsets beyond output string length', () => {
      const inStr = 'foo bar baz';
      const start = inStr.indexOf('bar');
      const end = start + 'bar'.length;

      const outStrs = ['', 'foo   b', 'fooba'];
      for (let outStr of outStrs) {
        const [outStart, outEnd] = translateOffsets(
          inStr,
          outStr,
          start,
          end,
          isNotSpace,
        );
        const outSubStr = outStr.slice(outStart, outEnd);
        assert.equal(outSubStr, inStr.slice(start, start + outSubStr.length));
        assert.isAtMost(outStart, outStr.length);
        assert.isAtMost(outEnd, outStr.length);
      }
    });
  });
});

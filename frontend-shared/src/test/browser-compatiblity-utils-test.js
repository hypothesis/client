import { normalizeKeyName } from '../browser-compatibility-utils';

describe('shared/browser-compatibility-utils', () => {
  describe('normalizeKeyName', () => {
    [
      {
        from: 'Left',
        to: 'ArrowLeft',
      },
      {
        from: 'Up',
        to: 'ArrowUp',
      },
      {
        from: 'Down',
        to: 'ArrowDown',
      },
      {
        from: 'Right',
        to: 'ArrowRight',
      },
      {
        from: 'Spacebar',
        to: ' ',
      },
      {
        from: 'Del',
        to: 'Delete',
      },
    ].forEach(test => {
      it(`changes the key value '${test.from}' to '${test.to}'`, () => {
        assert.equal(normalizeKeyName(test.from), test.to);
      });
    });
  });
});

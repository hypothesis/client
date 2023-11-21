import { trimAndDedent } from '../trim-and-dedent';

describe('trimAndDedent', () => {
  [
    ['Foo', 'Foo'],
    ['   Foo', 'Foo'],
    [
      `First line
  Second line
    Third line`,
      `First line
  Second line
    Third line`,
    ],
    [
      `
      
        Hello, Jane!
          Indented line
        Goodbye, John!
      
      `,
      `Hello, Jane!
  Indented line
Goodbye, John!`,
    ],
  ].forEach(([str, expectedResult]) => {
    it('normalizes strings with multiple lines', () => {
      const result = trimAndDedent(str);
      assert.equal(result, expectedResult);
    });
  });
});

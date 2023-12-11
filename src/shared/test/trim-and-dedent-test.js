import { trimAndDedent } from '../trim-and-dedent';

describe('trimAndDedent', () => {
  [
    [() => trimAndDedent`Foo`, 'Foo'],
    [() => trimAndDedent`   Foo`, 'Foo'],
    [
      () => trimAndDedent`First line
  Second line
    Third line`,
      `First line
  Second line
    Third line`,
    ],
    [
      () => trimAndDedent`
      
        Hello, Jane!
          Indented line
        Goodbye, John!
      
      `,
      `Hello, Jane!
  Indented line
Goodbye, John!`,
    ],
    [
      () => {
        const firstVar = `                                 very indented`;
        const secondVar = `
        multiple
lines
with no indentation
        `;

        return trimAndDedent`
      
            Hello, Jane!
            ${firstVar}
              Indented line
            Goodbye, John!
            ${secondVar}
        
        `;
      },
      `Hello, Jane!
                                 very indented
  Indented line
Goodbye, John!

        multiple
lines
with no indentation
        `,
    ],
  ].forEach(([getResult, expectedResult]) => {
    it('normalizes strings with multiple lines', () => {
      assert.equal(getResult(), expectedResult);
    });
  });
});

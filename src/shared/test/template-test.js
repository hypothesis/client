import { renderTemplate } from '../template';

describe('renderTemplate', () => {
  [
    {
      template: 'Hello, {{ name }}!',
      data: { name: 'John' },
      expectedResult: 'Hello, John!',
    },
    {
      template: 'Hello, {{name}}!',
      data: { name: 'John' },
      expectedResult: 'Hello, John!',
    },
    {
      template: '{{ greeting}}, {{ name   }}!',
      data: { greeting: 'Hello', name: 'Jane' },
      expectedResult: 'Hello, Jane!',
    },
    {
      template: 'Hello, {{ name }}!',
      data: {},
      expectedResult: 'Hello, {{ name }}!',
    },
    {
      template: `
      
        Hello, {{ name }}!
          Indented line
        Goodbye, {{ secondName }}!
      
      `,
      data: { name: 'Jane', secondName: 'John' },
      expectedResult: `Hello, Jane!
  Indented line
Goodbye, John!`,
    },
  ].forEach(({ template, data, expectedResult }) => {
    it('should replace variables in the template with corresponding data', () => {
      const result = renderTemplate(template, data);
      assert.equal(result, expectedResult);
    });
  });
});

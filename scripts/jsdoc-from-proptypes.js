'use strict';

/**
 * Utility to generate JSDoc types from prop-types definitions.
 *
 * Usage:
 *
 *   node scripts/jsdoc-from-proptypes.js <src>
 *
 *   Where `<src>` is a JS file defining a Preact UI component.
 *
 * The output is a JSDoc `@typedef` definition that can be used as a starting
 * point for JSDoc. The output will need to be improved manually:
 *
 * - Comments should be line-wrapped / adjusted for readability (TODO:
 *   Do this as part of the script)
 *
 * -  `prop-types` types are often very generic (eg. `propTypes.object`,
 *    `propTypes.array`, `propTypes.func`). Help human readers and machine
 *    checking by updating these with more specific types.
 *
 * - `prop-types` comments often state information that is obvious given a
 *   a more specific JSDoc type. These should be removed.
 *
 * - `prop-types` props may not correctly specify whether a prop is optional or
 *   required. Make sure the JSDoc type specifies this correctly.
 */

const fs = require('fs');

const parser = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const t = require('@babel/types');

const typeFromPropName = {
  annotation: 'Annotation',
  group: 'Group',
  thread: 'Thread',
};

function jsdocTypeFromPropTypesType(memberExpression) {
  if (!t.isIdentifier(memberExpression.property)) {
    return 'Object';
  }

  switch (memberExpression.property.name) {
    case 'array':
      return 'Object[]';
    case 'bool':
      return 'boolean';
    case 'func':
      return '() => any';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
  }

  return 'Object';
}

function isPropTypesIdentifier(node) {
  return t.isIdentifier(node) && node.name === 'propTypes';
}

function jsdocComment(lines) {
  return ['/**', ...lines.map(line => ' * ' + line), ' */'].join('\n');
}

/**
 * Extract UI component props information from the right-hand side of a
 * `ComponentName.propTypes = { ... }` expression and return an equivalent
 * JSDoc `@typedef` comment.
 *
 * @param {string} componentName
 * @param {object} An `ObjectExpression` AST node
 */
function jsdocTypedefFromPropTypes(componentName, objectExpression) {
  const props = [];

  // Extract property names, comments and types from object literal keys.
  objectExpression.properties.forEach(objectProperty => {
    const name = objectProperty.key.name;
    let comment;

    // Extract comment above the prop-type definition.
    const leadingComments = objectProperty.leadingComments;
    if (Array.isArray(leadingComments) && leadingComments.length > 0) {
      comment = leadingComments[0].value;
      comment = comment
        .split('\n')
        .map(line => line.trim().replace(/^\*/, '').trim())
        .join(' ')
        .trim();
    }

    let type = 'Object';
    let isOptional = true;

    // Attempt to map the `propTypes.<expression>` property value to a JSDoc type.
    if (t.isMemberExpression(objectProperty.value)) {
      const propTypeExpr = objectProperty.value;
      if (isPropTypesIdentifier(propTypeExpr.object)) {
        // Parse `propTypes.<expr>`
        type = jsdocTypeFromPropTypesType(propTypeExpr);
      } else if (
        t.isMemberExpression(propTypeExpr.object) &&
        isPropTypesIdentifier(propTypeExpr.object.object)
      ) {
        // Parse `propTypes.<expr1>.<expr2>`
        type = jsdocTypeFromPropTypesType(propTypeExpr.object);
        if (
          t.isIdentifier(propTypeExpr.property) &&
          propTypeExpr.property.name === 'isRequired'
        ) {
          isOptional = false;
        }
      }
    }

    // If a specific type could not be determined from the `propTypes.<expression>`
    // expression, attempt to guess based on the prop name.
    if (type === 'Object' && name in typeFromPropName) {
      type = typeFromPropName[name];
    }

    props.push({ name, type, comment, isOptional });
  });

  // Generate the JSDoc typedef.
  const formatJSDocProp = ({ name, type, comment, isOptional }) => {
    let expr = `@prop {${type}} `;
    if (isOptional) {
      expr += '[';
    }
    expr += name;
    if (isOptional) {
      expr += ']';
    }

    if (comment) {
      expr += ' - ' + comment;
    }

    return expr;
  };

  // Generate JSDoc typedef from props.
  const commentLines = [
    `@typedef ${componentName}Props`,
    ...props.map(formatJSDocProp),
  ];

  return jsdocComment(commentLines);
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath).toString();

  const ast = parser.parse(code, {
    plugins: ['jsx'],
    sourceType: 'module',
  });

  traverse(ast, {
    AssignmentExpression(path) {
      // Look for `<identifier>.propTypes = { ... }` expressions.
      const isPropTypesAssignment =
        t.isMemberExpression(path.node.left) &&
        t.isIdentifier(path.node.left.object) &&
        t.isIdentifier(path.node.left.property) &&
        path.node.left.property.name === 'propTypes';

      if (isPropTypesAssignment && t.isObjectExpression(path.node.right)) {
        const componentName = path.node.left.object.name;
        const jsdoc = jsdocTypedefFromPropTypes(componentName, path.node.right);
        console.log(jsdoc);
      }
    },
  });
}

// Process all the files on the command line after the script name.
process.argv.slice(2).map(processFile);

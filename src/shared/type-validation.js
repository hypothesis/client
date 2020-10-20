/**
 * @typedef {(any)=>any} ValidatorFunction
 */

/**
 * @typedef ValidatorProperties
 * @prop {(any)=>any} [isRequired]
 * @prop {(any)=>any} [oneOf]
 * @prop {(any)=>any} [ofType]
 */

/**
 * @typedef {ValidatorFunction & ValidatorProperties} Validator
 */

/**
 * @typedef ValidationError
 * @prop {string} key
 * @prop {string} error
 */

/**
 * Validate the following `data` against the following `schema`. Returns true
 * if the data is valid, otherwise returns an array of ValidationErrors representing
 * error messages pertaining to the data.
 *
 * Note: Erroneous data values not part of the provided schema are ignored, but a
 * future improvement could be to also check for such values and produce warnings.
 *
 * example:
 *
 * const schema = {
 *   a: validation.isString,
 *   b: validation.isString.isRequired,
 *   c: {
 *       d: validation.isInteger,
 *       e: validation.isArray.ofType(validation.isInteger).isRequired,
 *       f: validation.oneOf([
 *            validation.isFunction,
 *            validation.isString,
 *          ]).isRequired
 *   }
 * }
 *
 * let result = validateData(schema, sampleData);
 *
 * @param {Object} schema
 * @param {Object} data
 * @param {string} [prefix]
 * @return {true|ValidationError[]}
 */
function validateData(schema, data, prefix = '') {
  const results = [];
  Object.keys(schema).forEach(key => {
    const schemaValue = schema[key];
    const dataValue = data ? data[key] : undefined;
    const newPrefix = prefix ? `${prefix}.${key}` : key;

    if (typeof schemaValue === 'object') {
      if (dataValue !== undefined) {
        // only follow this branch if there is matching data
        let result = validateData(schemaValue, dataValue, newPrefix);
        if (result !== true) {
          results.push(...result);
        }
      }
    } else {
      const result = schemaValue(dataValue);
      if (result !== true) {
        results.push({
          key: newPrefix,
          error: result,
        });
      }
    }
  });
  return results.length ? results : true;
}

/**
 * @type {Validator} shim
 */
function baseShim(shim) {
  return value => {
    if (value === undefined) {
      return true;
    } else {
      return shim(value);
    }
  };
}

/**
 * @type {Validator} shim
 */
function addRequiredCondition(shim) {
  shim.isRequired = value => {
    if (value === undefined) {
      return 'value is required but missing';
    }
    return shim(value);
  };
}

/**
 * @param {Validator[]} types
 */
function oneOfTypeShim(types) {
  const shim = baseShim(value => {
    for (let i = 0; i < types.length; i++) {
      if (types[i](value) === true) {
        return true;
      }
    }
    return 'value failed to match one of the the allowed types';
  });
  addRequiredCondition(shim);
  return shim;
}

/**
 * @param {any} value
 */
function isStringShim(value) {
  return baseShim(value => {
    if (typeof value === 'string') {
      return true;
    }
    return 'value is not a string';
  })(value);
}

/**
 * @type {(list: any[]) => Validator}
 */
isStringShim.oneOf = list => {
  const shim = baseShim(value => {
    const isString = isStringShim(value);
    if (isString === true) {
      if (list.indexOf(value) >= 0) {
        return true;
      }
      return `value does not match accepted values: [${list}]`;
    }
    return isString;
  });
  addRequiredCondition(shim);
  return shim;
};

addRequiredCondition(isStringShim);

/**
 * @param {any} value
 */
const isBooleanShim = baseShim(value => {
  if (typeof value === 'boolean') {
    return true;
  }
  return 'value is not a boolean';
});

addRequiredCondition(isBooleanShim);

/**
 * @param {any} value
 */
function isNumericShim(value) {
  return baseShim(value => {
    if (typeof value === 'number') {
      return true;
    }
    return 'value is not a number';
  })(value);
}

/**
 * @type {(lower: number ,upper: number) => Validator}
 */
isNumericShim.limit = (lower, upper) => {
  const shim = baseShim(value => {
    const isNumeric = isNumericShim(value);
    if (isNumeric === true) {
      if (value >= lower && value <= upper) {
        return true;
      } else {
        return `value falls outside of range (${lower}, ${upper})`;
      }
    }
    return isNumeric;
  });
  addRequiredCondition(shim);
  return shim;
};

addRequiredCondition(isNumericShim);

/**
 * @param {any} value
 */
function isIntegerShim(value) {
  return baseShim(value => {
    if (Number.isInteger(value)) {
      return true;
    }
    return 'value is not an integer';
  })(value);
}

/**
 * @type {(lower: number ,upper: number) => Validator}
 */
isIntegerShim.limit = (lower, upper) => {
  const shim = baseShim(value => {
    const isInteger = isIntegerShim(value);
    if (isInteger === true) {
      if (value >= lower && value <= upper) {
        return true;
      } else {
        return `value falls outside of range (${lower}, ${upper})`;
      }
    }
    return isInteger;
  });
  addRequiredCondition(shim);
  return shim;
};

addRequiredCondition(isIntegerShim);

/**
 * @param {any} value
 */
const isFunctionShim = baseShim(value => {
  if (typeof value === 'function') {
    return true;
  }
  return 'value is not a function';
});

addRequiredCondition(isFunctionShim);

/**
 * @param {any} value
 */
function isArrayShim(value) {
  return baseShim(value => {
    if (Array.isArray(value)) {
      return true;
    }
    return 'value is not an array';
  })(value);
}

/**
 * Restrict the array to a particular type.
 *  - Only the first element in the array is checked.
 *  - An empty array is still valid with this condition.
 * @type {(type: Validator) => Validator}
 */
isArrayShim.ofType = type => {
  const shim = baseShim(value => {
    const isArray = isArrayShim(value);
    if (isArray === true) {
      if (value.length) {
        return type(value[0]); // just check the first slot
      }
    }
    return isArray;
  });
  addRequiredCondition(shim);
  return shim;
};

addRequiredCondition(isArrayShim);

/**
 * @param {any} value
 */
function isObjectShim(value) {
  return baseShim(value => {
    // ensure null and array types are rejected
    if (value && value.constructor === {}.constructor) {
      return true;
    }
    return 'value is not an object';
  })(value);
}

/**
 * @type {(shape: Object) => Validator}
 */
isObjectShim.ofShape = shape => {
  const shim = baseShim(value => {
    const isObject = isObjectShim(value);
    if (isObject === true) {
      return validateData(shape, value);
    }
    return isObject;
  });
  addRequiredCondition(shim);
  return shim;
};

addRequiredCondition(isObjectShim);

const validators = {
  // validators
  isString: isStringShim,
  isBoolean: isBooleanShim,
  isNumeric: isNumericShim,
  isInteger: isIntegerShim,
  isFunction: isFunctionShim,
  isArray: isArrayShim,
  isObject: isObjectShim,
  oneOfType: oneOfTypeShim,

  // validation runner
  validateData: validateData,
};

export default validators;

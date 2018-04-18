(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
module.exports = parents

function parents(node, filter) {
  var out = []

  filter = filter || noop

  do {
    out.push(node)
    node = node.parentNode
  } while(node && node.tagName && filter(node))

  return out.slice(1)
}

function noop(n) {
  return true
}

},{}],2:[function(require,module,exports){
/*!
  Copyright (c) 2016 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg)) {
				classes.push(classNames.apply(null, arg));
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', [], function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],3:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'undefined' !== typeof document && 'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,window)

},{}],4:[function(require,module,exports){
'use strict';

var keys = require('object-keys');
var foreach = require('foreach');
var hasSymbols = typeof Symbol === 'function' && typeof Symbol() === 'symbol';

var toStr = Object.prototype.toString;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		Object.defineProperty(obj, 'x', { enumerable: false, value: obj });
        /* eslint-disable no-unused-vars, no-restricted-syntax */
        for (var _ in obj) { return false; }
        /* eslint-enable no-unused-vars, no-restricted-syntax */
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = Object.defineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		Object.defineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = keys(map);
	if (hasSymbols) {
		props = props.concat(Object.getOwnPropertySymbols(map));
	}
	foreach(props, function (name) {
		defineProperty(object, name, map[name], predicates[name]);
	});
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;

},{"foreach":36,"object-keys":5}],5:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var slice = Array.prototype.slice;
var isArgs = require('./isArguments');
var isEnumerable = Object.prototype.propertyIsEnumerable;
var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];
var equalsConstructorPrototype = function (o) {
	var ctor = o.constructor;
	return ctor && ctor.prototype === o;
};
var excludedKeys = {
	$console: true,
	$external: true,
	$frame: true,
	$frameElement: true,
	$frames: true,
	$innerHeight: true,
	$innerWidth: true,
	$outerHeight: true,
	$outerWidth: true,
	$pageXOffset: true,
	$pageYOffset: true,
	$parent: true,
	$scrollLeft: true,
	$scrollTop: true,
	$scrollX: true,
	$scrollY: true,
	$self: true,
	$webkitIndexedDB: true,
	$webkitStorageInfo: true,
	$window: true
};
var hasAutomationEqualityBug = (function () {
	/* global window */
	if (typeof window === 'undefined') { return false; }
	for (var k in window) {
		try {
			if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
				try {
					equalsConstructorPrototype(window[k]);
				} catch (e) {
					return true;
				}
			}
		} catch (e) {
			return true;
		}
	}
	return false;
}());
var equalsConstructorPrototypeIfNotBuggy = function (o) {
	/* global window */
	if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
		return equalsConstructorPrototype(o);
	}
	try {
		return equalsConstructorPrototype(o);
	} catch (e) {
		return false;
	}
};

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":6}],6:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],7:[function(require,module,exports){
'use strict'

/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// The following export code was added by @ForbesLindesay
module.exports = diff_match_patch;
module.exports['diff_match_patch'] = diff_match_patch;
module.exports['DIFF_DELETE'] = DIFF_DELETE;
module.exports['DIFF_INSERT'] = DIFF_INSERT;
module.exports['DIFF_EQUAL'] = DIFF_EQUAL;

},{}],8:[function(require,module,exports){
// https://html.spec.whatwg.org/multipage/infrastructure.html#document-base-url
module.exports = (function () {
  var baseURI = document.baseURI;

  if (!baseURI) {
    var baseEls = document.getElementsByTagName('base');
    for (var i = 0 ; i < baseEls.length ; i++) {
      if (!!baseEls[i].href) {
        baseURI = baseEls[i].href;
        break;
      }
    }
  }

  return (baseURI || document.documentURI);
})();

},{}],9:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'module'], factory);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    factory(exports, module);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, mod);
    global.FragmentAnchor = mod.exports;
  }
})(this, function (exports, module) {
  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var FragmentAnchor = (function () {
    function FragmentAnchor(root, id) {
      _classCallCheck(this, FragmentAnchor);

      if (root === undefined) {
        throw new Error('missing required parameter "root"');
      }
      if (id === undefined) {
        throw new Error('missing required parameter "id"');
      }

      this.root = root;
      this.id = id;
    }

    _createClass(FragmentAnchor, [{
      key: 'toRange',
      value: function toRange() {
        var el = this.root.querySelector('#' + this.id);
        if (el == null) {
          throw new Error('no element found with id "' + this.id + '"');
        }

        var range = this.root.ownerDocument.createRange();
        range.selectNodeContents(el);

        return range;
      }
    }, {
      key: 'toSelector',
      value: function toSelector() {
        var el = this.root.querySelector('#' + this.id);
        if (el == null) {
          throw new Error('no element found with id "' + this.id + '"');
        }

        var conformsTo = 'https://tools.ietf.org/html/rfc3236';
        if (el instanceof SVGElement) {
          conformsTo = 'http://www.w3.org/TR/SVG/';
        }

        return {
          type: 'FragmentSelector',
          value: this.id,
          conformsTo: conformsTo
        };
      }
    }], [{
      key: 'fromRange',
      value: function fromRange(root, range) {
        if (root === undefined) {
          throw new Error('missing required parameter "root"');
        }
        if (range === undefined) {
          throw new Error('missing required parameter "range"');
        }

        var el = range.commonAncestorContainer;
        while (el != null && !el.id) {
          if (root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
            el = el.parentElement;
          } else {
            throw new Error('no fragment identifier found');
          }
        }

        return new FragmentAnchor(root, el.id);
      }
    }, {
      key: 'fromSelector',
      value: function fromSelector(root) {
        var selector = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        return new FragmentAnchor(root, selector.value);
      }
    }]);

    return FragmentAnchor;
  })();

  module.exports = FragmentAnchor;
});

},{}],10:[function(require,module,exports){
module.exports = require('./lib')

},{"./lib":11}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromRange = fromRange;
exports.toRange = toRange;

var _domNodeIterator = require('dom-node-iterator');

var _domNodeIterator2 = _interopRequireDefault(_domNodeIterator);

var _domSeek = require('dom-seek');

var _domSeek2 = _interopRequireDefault(_domSeek);

var _rangeToString = require('./range-to-string');

var _rangeToString2 = _interopRequireDefault(_rangeToString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SHOW_TEXT = 4;

function fromRange(root, range) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (range === undefined) {
    throw new Error('missing required parameter "range"');
  }

  var document = root.ownerDocument;
  var prefix = document.createRange();

  var startNode = range.startContainer;
  var startOffset = range.startOffset;

  prefix.setStart(root, 0);
  prefix.setEnd(startNode, startOffset);

  var start = (0, _rangeToString2.default)(prefix).length;
  var end = start + (0, _rangeToString2.default)(range).length;

  return {
    start: start,
    end: end
  };
}

function toRange(root) {
  var selector = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }

  var document = root.ownerDocument;
  var range = document.createRange();
  var iter = (0, _domNodeIterator2.default)(root, SHOW_TEXT);

  var start = selector.start || 0;
  var end = selector.end || start;
  var count = (0, _domSeek2.default)(iter, start);
  var remainder = start - count;

  if (iter.pointerBeforeReferenceNode) {
    range.setStart(iter.referenceNode, remainder);
  } else {
    range.setStart(iter.nextNode(), remainder);
    iter.previousNode();
  }

  var length = end - start + remainder;
  count = (0, _domSeek2.default)(iter, length);
  remainder = length - count;

  if (iter.pointerBeforeReferenceNode) {
    range.setEnd(iter.referenceNode, remainder);
  } else {
    range.setEnd(iter.nextNode(), remainder);
  }

  return range;
}

},{"./range-to-string":12,"dom-node-iterator":16,"dom-seek":25}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rangeToString;
/* global Node */

/**
 * Return the next node after `node` in a tree order traversal of the document.
 */
function nextNode(node, skipChildren) {
  if (!skipChildren && node.firstChild) {
    return node.firstChild;
  }

  do {
    if (node.nextSibling) {
      return node.nextSibling;
    }
    node = node.parentNode;
  } while (node);

  /* istanbul ignore next */
  return node;
}

function firstNode(range) {
  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    var node = range.startContainer.childNodes[range.startOffset];
    return node || nextNode(range.startContainer, true /* skip children */);
  }
  return range.startContainer;
}

function firstNodeAfter(range) {
  if (range.endContainer.nodeType === Node.ELEMENT_NODE) {
    var node = range.endContainer.childNodes[range.endOffset];
    return node || nextNode(range.endContainer, true /* skip children */);
  }
  return nextNode(range.endContainer);
}

function forEachNodeInRange(range, cb) {
  var node = firstNode(range);
  var pastEnd = firstNodeAfter(range);
  while (node !== pastEnd) {
    cb(node);
    node = nextNode(node);
  }
}

/**
 * A ponyfill for Range.toString().
 * Spec: https://dom.spec.whatwg.org/#dom-range-stringifier
 *
 * Works around the buggy Range.toString() implementation in IE and Edge.
 * See https://github.com/tilgovi/dom-anchor-text-position/issues/4
 */
function rangeToString(range) {
  // This is a fairly direct translation of the Range.toString() implementation
  // in Blink.
  var text = '';
  forEachNodeInRange(range, function (node) {
    if (node.nodeType !== Node.TEXT_NODE) {
      return;
    }
    var start = node === range.startContainer ? range.startOffset : 0;
    var end = node === range.endContainer ? range.endOffset : node.textContent.length;
    text += node.textContent.slice(start, end);
  });
  return text;
}

},{}],13:[function(require,module,exports){
module.exports = require('./lib');

},{"./lib":14}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromRange = fromRange;
exports.fromTextPosition = fromTextPosition;
exports.toRange = toRange;
exports.toTextPosition = toTextPosition;

var _diffMatchPatch = require('diff-match-patch');

var _diffMatchPatch2 = _interopRequireDefault(_diffMatchPatch);

var _domAnchorTextPosition = require('dom-anchor-text-position');

var textPosition = _interopRequireWildcard(_domAnchorTextPosition);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// The DiffMatchPatch bitap has a hard 32-character pattern length limit.
var SLICE_LENGTH = 32;
var SLICE_RE = new RegExp('(.|[\r\n]){1,' + String(SLICE_LENGTH) + '}', 'g');
var CONTEXT_LENGTH = SLICE_LENGTH;

function fromRange(root, range) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (range === undefined) {
    throw new Error('missing required parameter "range"');
  }

  var position = textPosition.fromRange(root, range);
  return fromTextPosition(root, position);
}

function fromTextPosition(root, selector) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (selector === undefined) {
    throw new Error('missing required parameter "selector"');
  }

  var start = selector.start;

  if (start === undefined) {
    throw new Error('selector missing required property "start"');
  }
  if (start < 0) {
    throw new Error('property "start" must be a non-negative integer');
  }

  var end = selector.end;

  if (end === undefined) {
    throw new Error('selector missing required property "end"');
  }
  if (end < 0) {
    throw new Error('property "end" must be a non-negative integer');
  }

  var exact = root.textContent.substr(start, end - start);

  var prefixStart = Math.max(0, start - CONTEXT_LENGTH);
  var prefix = root.textContent.substr(prefixStart, start - prefixStart);

  var suffixEnd = Math.min(root.textContent.length, end + CONTEXT_LENGTH);
  var suffix = root.textContent.substr(end, suffixEnd - end);

  return { exact: exact, prefix: prefix, suffix: suffix };
}

function toRange(root, selector) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var position = toTextPosition(root, selector, options);
  if (position === null) {
    return null;
  } else {
    return textPosition.toRange(root, position);
  }
}

function toTextPosition(root, selector) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (selector === undefined) {
    throw new Error('missing required parameter "selector"');
  }

  var exact = selector.exact;

  if (exact === undefined) {
    throw new Error('selector missing required property "exact"');
  }

  var prefix = selector.prefix,
      suffix = selector.suffix;
  var hint = options.hint;

  var dmp = new _diffMatchPatch2.default();

  dmp.Match_Distance = root.textContent.length * 2;

  // Work around a hard limit of the DiffMatchPatch bitap implementation.
  // The search pattern must be no more than SLICE_LENGTH characters.
  var slices = exact.match(SLICE_RE);
  var loc = hint === undefined ? root.textContent.length / 2 | 0 : hint;
  var start = Number.POSITIVE_INFINITY;
  var end = Number.NEGATIVE_INFINITY;
  var result = -1;
  var havePrefix = prefix !== undefined;
  var haveSuffix = suffix !== undefined;
  var foundPrefix = false;

  // If the prefix is known then search for that first.
  if (havePrefix) {
    result = dmp.match_main(root.textContent, prefix, loc);
    if (result > -1) {
      loc = result + prefix.length;
      foundPrefix = true;
    }
  }

  // If we have a suffix, and the prefix wasn't found, then search for it.
  if (haveSuffix && !foundPrefix) {
    result = dmp.match_main(root.textContent, suffix, loc + exact.length);
    if (result > -1) {
      loc = result - exact.length;
    }
  }

  // Search for the first slice.
  var firstSlice = slices.shift();
  result = dmp.match_main(root.textContent, firstSlice, loc);
  if (result > -1) {
    start = result;
    loc = end = start + firstSlice.length;
  } else {
    return null;
  }

  // Create a fold function that will reduce slices to positional extents.
  var foldSlices = function foldSlices(acc, slice) {
    if (!acc) {
      // A search for an earlier slice of the pattern failed to match.
      return null;
    }

    var result = dmp.match_main(root.textContent, slice, acc.loc);
    if (result === -1) {
      return null;
    }

    // The next slice should follow this one closely.
    acc.loc = result + slice.length;

    // Expand the start and end to a quote that includes all the slices.
    acc.start = Math.min(acc.start, result);
    acc.end = Math.max(acc.end, result + slice.length);

    return acc;
  };

  // Use the fold function to establish the full quote extents.
  // Expect the slices to be close to one another.
  // This distance is deliberately generous for now.
  dmp.Match_Distance = 64;
  var acc = slices.reduce(foldSlices, { start: start, end: end, loc: loc });
  if (!acc) {
    return null;
  }

  return { start: acc.start, end: acc.end };
}

},{"diff-match-patch":7,"dom-anchor-text-position":10}],15:[function(require,module,exports){
module.exports = require('./lib/implementation')['default'];

},{"./lib/implementation":19}],16:[function(require,module,exports){
module.exports = require('./lib')['default'];
module.exports.getPolyfill = require('./polyfill');
module.exports.implementation = require('./implementation');
module.exports.shim = require('./shim');

},{"./implementation":15,"./lib":20,"./polyfill":23,"./shim":24}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports['default'] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var doc = root.nodeType == 9 || root.ownerDocument;
  var iter = doc.createNodeIterator(root, whatToShow, filter, false);
  return new NodeIterator(iter, root, whatToShow, filter);
}

var NodeIterator = function () {
  function NodeIterator(iter, root, whatToShow, filter) {
    _classCallCheck(this, NodeIterator);

    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.referenceNode = root;
    this.pointerBeforeReferenceNode = true;
    this._iter = iter;
  }

  NodeIterator.prototype.nextNode = function nextNode() {
    var result = this._iter.nextNode();
    this.pointerBeforeReferenceNode = false;
    if (result === null) return null;
    this.referenceNode = result;
    return this.referenceNode;
  };

  NodeIterator.prototype.previousNode = function previousNode() {
    var result = this._iter.previousNode();
    this.pointerBeforeReferenceNode = true;
    if (result === null) return null;
    this.referenceNode = result;
    return this.referenceNode;
  };

  NodeIterator.prototype.toString = function toString() {
    return '[object NodeIterator]';
  };

  return NodeIterator;
}();

},{}],18:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var doc = root.ownerDocument;
  return doc.createNodeIterator.call(doc, root, whatToShow, filter);
}

},{}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports['default'] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  return new NodeIterator(root, whatToShow, filter);
}

var NodeIterator = function () {
  function NodeIterator(root, whatToShow, filter) {
    _classCallCheck(this, NodeIterator);

    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.referenceNode = root;
    this.pointerBeforeReferenceNode = true;
    this._filter = function (node) {
      return filter ? filter(node) === 1 : true;
    };
    this._show = function (node) {
      return whatToShow >> node.nodeType - 1 & 1 === 1;
    };
  }

  NodeIterator.prototype.nextNode = function nextNode() {
    var before = this.pointerBeforeReferenceNode;
    this.pointerBeforeReferenceNode = false;

    var node = this.referenceNode;
    if (before && this._show(node) && this._filter(node)) return node;

    do {
      if (node.firstChild) {
        node = node.firstChild;
        continue;
      }

      do {
        if (node === this.root) return null;
        if (node.nextSibling) break;
        node = node.parentNode;
      } while (node);

      node = node.nextSibling;
    } while (!this._show(node) || !this._filter(node));

    this.referenceNode = node;
    this.pointerBeforeReferenceNode = false;
    return node;
  };

  NodeIterator.prototype.previousNode = function previousNode() {
    var before = this.pointerBeforeReferenceNode;
    this.pointerBeforeReferenceNode = true;

    var node = this.referenceNode;
    if (!before && this._show(node) && this._filter(node)) return node;

    do {
      if (node === this.root) return null;

      if (node.previousSibling) {
        node = node.previousSibling;
        while (node.lastChild) {
          node = node.lastChild;
        }continue;
      }

      node = node.parentNode;
    } while (!this._show(node) || !this._filter(node));

    this.referenceNode = node;
    this.pointerBeforeReferenceNode = true;
    return node;
  };

  NodeIterator.prototype.toString = function toString() {
    return '[object NodeIterator]';
  };

  return NodeIterator;
}();

},{}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _polyfill = require('./polyfill');

var _polyfill2 = _interopRequireDefault(_polyfill);

var _implementation = require('./implementation');

var _implementation2 = _interopRequireDefault(_implementation);

var _shim = require('./shim');

var _shim2 = _interopRequireDefault(_shim);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var polyfill = (0, _polyfill2['default'])();
polyfill.implementation = _implementation2['default'];
polyfill.shim = _shim2['default'];

exports['default'] = polyfill;

},{"./implementation":19,"./polyfill":21,"./shim":22}],21:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = getPolyfill;

var _adapter = require('./adapter');

var _adapter2 = _interopRequireDefault(_adapter);

var _builtin = require('./builtin');

var _builtin2 = _interopRequireDefault(_builtin);

var _implementation = require('./implementation');

var _implementation2 = _interopRequireDefault(_implementation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function getPolyfill() {
  try {
    var doc = typeof document === 'undefined' ? {} : document;
    var iter = (0, _builtin2['default'])(doc, 0xFFFFFFFF, null, false);
    if (iter.referenceNode === doc) return _builtin2['default'];
    return _adapter2['default'];
  } catch (_) {
    return _implementation2['default'];
  }
} /*global document*/

},{"./adapter":17,"./builtin":18,"./implementation":19}],22:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = shim;

var _builtin = require('./builtin');

var _builtin2 = _interopRequireDefault(_builtin);

var _polyfill = require('./polyfill');

var _polyfill2 = _interopRequireDefault(_polyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*global document*/
function shim() {
  var doc = typeof document === 'undefined' ? {} : document;
  var polyfill = (0, _polyfill2['default'])();
  if (polyfill !== _builtin2['default']) doc.createNodeIterator = polyfill;
  return polyfill;
}

},{"./builtin":18,"./polyfill":21}],23:[function(require,module,exports){
module.exports = require('./lib/polyfill')['default'];

},{"./lib/polyfill":21}],24:[function(require,module,exports){
module.exports = require('./lib/shim')['default'];

},{"./lib/shim":22}],25:[function(require,module,exports){
module.exports = require('./lib')['default'];

},{"./lib":26}],26:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = seek;

var _ancestors = require('ancestors');

var _ancestors2 = _interopRequireDefault(_ancestors);

var _indexOf = require('index-of');

var _indexOf2 = _interopRequireDefault(_indexOf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var E_SHOW = 'Argument 1 of seek must use filter NodeFilter.SHOW_TEXT.';
var E_WHERE = 'Argument 2 of seek must be a number or a Text Node.';

var SHOW_TEXT = 4;
var TEXT_NODE = 3;

function seek(iter, where) {
  if (iter.whatToShow !== SHOW_TEXT) {
    throw new Error(E_SHOW);
  }

  var count = 0;
  var node = iter.referenceNode;
  var predicates = null;

  if (isNumber(where)) {
    predicates = {
      forward: function forward() {
        return count < where;
      },
      backward: function backward() {
        return count > where;
      }
    };
  } else if (isText(where)) {
    var forward = before(node, where) ? function () {
      return false;
    } : function () {
      return node !== where;
    };
    var backward = function backward() {
      return node != where || !iter.pointerBeforeReferenceNode;
    };
    predicates = { forward: forward, backward: backward };
  } else {
    throw new Error(E_WHERE);
  }

  while (predicates.forward() && (node = iter.nextNode()) !== null) {
    count += node.nodeValue.length;
  }

  while (predicates.backward() && (node = iter.previousNode()) !== null) {
    count -= node.nodeValue.length;
  }

  return count;
}

function isNumber(n) {
  return !isNaN(parseInt(n)) && isFinite(n);
}

function isText(node) {
  return node.nodeType === TEXT_NODE;
}

function before(ref, node) {
  if (ref === node) return false;

  var common = null;
  var left = [ref].concat((0, _ancestors2['default'])(ref)).reverse();
  var right = [node].concat((0, _ancestors2['default'])(node)).reverse();

  while (left[0] === right[0]) {
    common = left.shift();
    right.shift();
  }

  left = left[0];
  right = right[0];

  var l = (0, _indexOf2['default'])(common.childNodes, left);
  var r = (0, _indexOf2['default'])(common.childNodes, right);

  return l > r;
}

},{"ancestors":1,"index-of":41}],27:[function(require,module,exports){
'use strict';

var $isNaN = require('./helpers/isNaN');
var $isFinite = require('./helpers/isFinite');

var sign = require('./helpers/sign');
var mod = require('./helpers/mod');

var IsCallable = require('is-callable');
var toPrimitive = require('es-to-primitive/es5');

var has = require('has');

// https://es5.github.io/#x9
var ES5 = {
	ToPrimitive: toPrimitive,

	ToBoolean: function ToBoolean(value) {
		return !!value;
	},
	ToNumber: function ToNumber(value) {
		return Number(value);
	},
	ToInteger: function ToInteger(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number)) { return 0; }
		if (number === 0 || !$isFinite(number)) { return number; }
		return sign(number) * Math.floor(Math.abs(number));
	},
	ToInt32: function ToInt32(x) {
		return this.ToNumber(x) >> 0;
	},
	ToUint32: function ToUint32(x) {
		return this.ToNumber(x) >>> 0;
	},
	ToUint16: function ToUint16(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
		var posInt = sign(number) * Math.floor(Math.abs(number));
		return mod(posInt, 0x10000);
	},
	ToString: function ToString(value) {
		return String(value);
	},
	ToObject: function ToObject(value) {
		this.CheckObjectCoercible(value);
		return Object(value);
	},
	CheckObjectCoercible: function CheckObjectCoercible(value, optMessage) {
		/* jshint eqnull:true */
		if (value == null) {
			throw new TypeError(optMessage || 'Cannot call method on ' + value);
		}
		return value;
	},
	IsCallable: IsCallable,
	SameValue: function SameValue(x, y) {
		if (x === y) { // 0 === -0, but they are not identical.
			if (x === 0) { return 1 / x === 1 / y; }
			return true;
		}
		return $isNaN(x) && $isNaN(y);
	},

	// http://www.ecma-international.org/ecma-262/5.1/#sec-8
	Type: function Type(x) {
		if (x === null) {
			return 'Null';
		}
		if (typeof x === 'undefined') {
			return 'Undefined';
		}
		if (typeof x === 'function' || typeof x === 'object') {
			return 'Object';
		}
		if (typeof x === 'number') {
			return 'Number';
		}
		if (typeof x === 'boolean') {
			return 'Boolean';
		}
		if (typeof x === 'string') {
			return 'String';
		}
	},

	// http://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
	IsPropertyDescriptor: function IsPropertyDescriptor(Desc) {
		if (this.Type(Desc) !== 'Object') {
			return false;
		}
		var allowed = {
			'[[Configurable]]': true,
			'[[Enumerable]]': true,
			'[[Get]]': true,
			'[[Set]]': true,
			'[[Value]]': true,
			'[[Writable]]': true
		};
		// jscs:disable
		for (var key in Desc) { // eslint-disable-line
			if (has(Desc, key) && !allowed[key]) {
				return false;
			}
		}
		// jscs:enable
		var isData = has(Desc, '[[Value]]');
		var IsAccessor = has(Desc, '[[Get]]') || has(Desc, '[[Set]]');
		if (isData && IsAccessor) {
			throw new TypeError('Property Descriptors may not be both accessor and data descriptors');
		}
		return true;
	},

	// http://ecma-international.org/ecma-262/5.1/#sec-8.10.1
	IsAccessorDescriptor: function IsAccessorDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!this.IsPropertyDescriptor(Desc)) {
			throw new TypeError('Desc must be a Property Descriptor');
		}

		if (!has(Desc, '[[Get]]') && !has(Desc, '[[Set]]')) {
			return false;
		}

		return true;
	},

	// http://ecma-international.org/ecma-262/5.1/#sec-8.10.2
	IsDataDescriptor: function IsDataDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!this.IsPropertyDescriptor(Desc)) {
			throw new TypeError('Desc must be a Property Descriptor');
		}

		if (!has(Desc, '[[Value]]') && !has(Desc, '[[Writable]]')) {
			return false;
		}

		return true;
	},

	// http://ecma-international.org/ecma-262/5.1/#sec-8.10.3
	IsGenericDescriptor: function IsGenericDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!this.IsPropertyDescriptor(Desc)) {
			throw new TypeError('Desc must be a Property Descriptor');
		}

		if (!this.IsAccessorDescriptor(Desc) && !this.IsDataDescriptor(Desc)) {
			return true;
		}

		return false;
	},

	// http://ecma-international.org/ecma-262/5.1/#sec-8.10.4
	FromPropertyDescriptor: function FromPropertyDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return Desc;
		}

		if (!this.IsPropertyDescriptor(Desc)) {
			throw new TypeError('Desc must be a Property Descriptor');
		}

		if (this.IsDataDescriptor(Desc)) {
			return {
				value: Desc['[[Value]]'],
				writable: !!Desc['[[Writable]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else if (this.IsAccessorDescriptor(Desc)) {
			return {
				get: Desc['[[Get]]'],
				set: Desc['[[Set]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else {
			throw new TypeError('FromPropertyDescriptor must be called with a fully populated Property Descriptor');
		}
	},

	// http://ecma-international.org/ecma-262/5.1/#sec-8.10.5
	ToPropertyDescriptor: function ToPropertyDescriptor(Obj) {
		if (this.Type(Obj) !== 'Object') {
			throw new TypeError('ToPropertyDescriptor requires an object');
		}

		var desc = {};
		if (has(Obj, 'enumerable')) {
			desc['[[Enumerable]]'] = this.ToBoolean(Obj.enumerable);
		}
		if (has(Obj, 'configurable')) {
			desc['[[Configurable]]'] = this.ToBoolean(Obj.configurable);
		}
		if (has(Obj, 'value')) {
			desc['[[Value]]'] = Obj.value;
		}
		if (has(Obj, 'writable')) {
			desc['[[Writable]]'] = this.ToBoolean(Obj.writable);
		}
		if (has(Obj, 'get')) {
			var getter = Obj.get;
			if (typeof getter !== 'undefined' && !this.IsCallable(getter)) {
				throw new TypeError('getter must be a function');
			}
			desc['[[Get]]'] = getter;
		}
		if (has(Obj, 'set')) {
			var setter = Obj.set;
			if (typeof setter !== 'undefined' && !this.IsCallable(setter)) {
				throw new TypeError('setter must be a function');
			}
			desc['[[Set]]'] = setter;
		}

		if ((has(desc, '[[Get]]') || has(desc, '[[Set]]')) && (has(desc, '[[Value]]') || has(desc, '[[Writable]]'))) {
			throw new TypeError('Invalid property descriptor. Cannot both specify accessors and a value or writable attribute');
		}
		return desc;
	}
};

module.exports = ES5;

},{"./helpers/isFinite":28,"./helpers/isNaN":29,"./helpers/mod":30,"./helpers/sign":31,"es-to-primitive/es5":32,"has":40,"is-callable":42}],28:[function(require,module,exports){
var $isNaN = Number.isNaN || function (a) { return a !== a; };

module.exports = Number.isFinite || function (x) { return typeof x === 'number' && !$isNaN(x) && x !== Infinity && x !== -Infinity; };

},{}],29:[function(require,module,exports){
module.exports = Number.isNaN || function isNaN(a) {
	return a !== a;
};

},{}],30:[function(require,module,exports){
module.exports = function mod(number, modulo) {
	var remain = number % modulo;
	return Math.floor(remain >= 0 ? remain : remain + modulo);
};

},{}],31:[function(require,module,exports){
module.exports = function sign(number) {
	return number >= 0 ? 1 : -1;
};

},{}],32:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

var isPrimitive = require('./helpers/isPrimitive');

var isCallable = require('is-callable');

// https://es5.github.io/#x8.12
var ES5internalSlots = {
	'[[DefaultValue]]': function (O, hint) {
		var actualHint = hint || (toStr.call(O) === '[object Date]' ? String : Number);

		if (actualHint === String || actualHint === Number) {
			var methods = actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
			var value, i;
			for (i = 0; i < methods.length; ++i) {
				if (isCallable(O[methods[i]])) {
					value = O[methods[i]]();
					if (isPrimitive(value)) {
						return value;
					}
				}
			}
			throw new TypeError('No default value');
		}
		throw new TypeError('invalid [[DefaultValue]] hint supplied');
	}
};

// https://es5.github.io/#x9
module.exports = function ToPrimitive(input, PreferredType) {
	if (isPrimitive(input)) {
		return input;
	}
	return ES5internalSlots['[[DefaultValue]]'](input, PreferredType);
};

},{"./helpers/isPrimitive":33,"is-callable":42}],33:[function(require,module,exports){
module.exports = function isPrimitive(value) {
	return value === null || (typeof value !== 'function' && typeof value !== 'object');
};

},{}],34:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var undefined;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],35:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":43}],36:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],37:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],38:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":37}],39:[function(require,module,exports){
(function (global){
; var __browserify_shim_require__=require;(function browserifyShim(module, exports, require, define, browserify_shim__define__module__export__) {
/*! Hammer.JS - v2.0.7 - 2016-04-22
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
(function(window, document, exportName, undefined) {
  'use strict';

var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
var TEST_ELEMENT = document.createElement('div');

var TYPE_FUNCTION = 'function';

var round = Math.round;
var abs = Math.abs;
var now = Date.now;

/**
 * set a timeout with a given scope
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Object} context
 * @returns {number}
 */
function setTimeoutContext(fn, timeout, context) {
    return setTimeout(bindFn(fn, context), timeout);
}

/**
 * if the argument is an array, we want to execute the fn on each entry
 * if it aint an array we don't want to do a thing.
 * this is used by all the methods that accept a single and array argument.
 * @param {*|Array} arg
 * @param {String} fn
 * @param {Object} [context]
 * @returns {Boolean}
 */
function invokeArrayArg(arg, fn, context) {
    if (Array.isArray(arg)) {
        each(arg, context[fn], context);
        return true;
    }
    return false;
}

/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i;

    if (!obj) {
        return;
    }

    if (obj.forEach) {
        obj.forEach(iterator, context);
    } else if (obj.length !== undefined) {
        i = 0;
        while (i < obj.length) {
            iterator.call(context, obj[i], i, obj);
            i++;
        }
    } else {
        for (i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
        }
    }
}

/**
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
function deprecate(method, name, message) {
    var deprecationMessage = 'DEPRECATED METHOD: ' + name + '\n' + message + ' AT \n';
    return function() {
        var e = new Error('get-stack-trace');
        var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
            .replace(/^\s+at\s+/gm, '')
            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

        var log = window.console && (window.console.warn || window.console.log);
        if (log) {
            log.call(window.console, deprecationMessage, stack);
        }
        return method.apply(this, arguments);
    };
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign;
if (typeof Object.assign !== 'function') {
    assign = function assign(target) {
        if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }
        return output;
    };
} else {
    assign = Object.assign;
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */
var extend = deprecate(function extend(dest, src, merge) {
    var keys = Object.keys(src);
    var i = 0;
    while (i < keys.length) {
        if (!merge || (merge && dest[keys[i]] === undefined)) {
            dest[keys[i]] = src[keys[i]];
        }
        i++;
    }
    return dest;
}, 'extend', 'Use `assign`.');

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
var merge = deprecate(function merge(dest, src) {
    return extend(dest, src, true);
}, 'merge', 'Use `assign`.');

/**
 * simple class inheritance
 * @param {Function} child
 * @param {Function} base
 * @param {Object} [properties]
 */
function inherit(child, base, properties) {
    var baseP = base.prototype,
        childP;

    childP = child.prototype = Object.create(baseP);
    childP.constructor = child;
    childP._super = baseP;

    if (properties) {
        assign(childP, properties);
    }
}

/**
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function boundFn() {
        return fn.apply(context, arguments);
    };
}

/**
 * let a boolean value also be a function that must return a boolean
 * this first item in args will be used as the context
 * @param {Boolean|Function} val
 * @param {Array} [args]
 * @returns {Boolean}
 */
function boolOrFn(val, args) {
    if (typeof val == TYPE_FUNCTION) {
        return val.apply(args ? args[0] || undefined : undefined, args);
    }
    return val;
}

/**
 * use the val2 when val1 is undefined
 * @param {*} val1
 * @param {*} val2
 * @returns {*}
 */
function ifUndefined(val1, val2) {
    return (val1 === undefined) ? val2 : val1;
}

/**
 * addEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function addEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.removeEventListener(type, handler, false);
    });
}

/**
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent(node, parent) {
    while (node) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

/**
 * small indexOf wrapper
 * @param {String} str
 * @param {String} find
 * @returns {Boolean} found
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}

/**
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

/**
 * find if a array contains the object using indexOf or a simple polyFill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
    if (src.indexOf && !findByKey) {
        return src.indexOf(find);
    } else {
        var i = 0;
        while (i < src.length) {
            if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                return i;
            }
            i++;
        }
        return -1;
    }
}

/**
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
}

/**
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */
function uniqueArray(src, key, sort) {
    var results = [];
    var values = [];
    var i = 0;

    while (i < src.length) {
        var val = key ? src[i][key] : src[i];
        if (inArray(values, val) < 0) {
            results.push(src[i]);
        }
        values[i] = val;
        i++;
    }

    if (sort) {
        if (!key) {
            results = results.sort();
        } else {
            results = results.sort(function sortUniqueArray(a, b) {
                return a[key] > b[key];
            });
        }
    }

    return results;
}

/**
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixed(obj, property) {
    var prefix, prop;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    var i = 0;
    while (i < VENDOR_PREFIXES.length) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if (prop in obj) {
            return prop;
        }
        i++;
    }
    return undefined;
}

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

/**
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
function getWindowForElement(element) {
    var doc = element.ownerDocument || element;
    return (doc.defaultView || doc.parentWindow || window);
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';

var COMPUTE_INTERVAL = 25;

var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;

var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;

var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if (boolOrFn(manager.options.enable, [manager])) {
            self.handler(ev);
        }
    };

    this.init();

}

Input.prototype = {
    /**
     * should handle the inputEvent data and trigger the callback
     * @virtual
     */
    handler: function() { },

    /**
     * bind the events
     */
    init: function() {
        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    },

    /**
     * unbind the events
     */
    destroy: function() {
        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    }
};

/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

    if (inputClass) {
        Type = inputClass;
    } else if (SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if (SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if (!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

    input.isFirst = !!isFirst;
    input.isFinal = !!isFinal;

    if (isFirst) {
        manager.session = {};
    }

    // source event is the normalized value of the domEvents
    // like 'touchstart, mouseup, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    // emit secret event
    manager.emit('hammer.input', input);

    manager.recognize(input);
    manager.session.prevInput = input;
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
function computeInputData(manager, input) {
    var session = manager.session;
    var pointers = input.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if (!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if (pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if (pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

    var center = input.center = getCenter(pointers);
    input.timeStamp = now();
    input.deltaTime = input.timeStamp - firstInput.timeStamp;

    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);

    computeDeltaXY(session, input);
    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

    var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
    input.overallVelocityX = overallVelocity.x;
    input.overallVelocityY = overallVelocity.y;
    input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

    computeIntervalInputData(session, input);

    // find the correct target
    var target = manager.element;
    if (hasParent(input.srcEvent.target, target)) {
        target = input.srcEvent.target;
    }
    input.target = target;
}

function computeDeltaXY(session, input) {
    var center = input.center;
    var offset = session.offsetDelta || {};
    var prevDelta = session.prevDelta || {};
    var prevInput = session.prevInput || {};

    if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
        prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
        };

        offset = session.offsetDelta = {
            x: center.x,
            y: center.y
        };
    }

    input.deltaX = prevDelta.x + (center.x - offset.x);
    input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var last = session.lastInterval || input,
        deltaTime = input.timeStamp - last.timeStamp,
        velocity, velocityX, velocityY, direction;

    if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
        var deltaX = input.deltaX - last.deltaX;
        var deltaY = input.deltaY - last.deltaY;

        var v = getVelocity(deltaTime, deltaX, deltaY);
        velocityX = v.x;
        velocityY = v.y;
        velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
        direction = getDirection(deltaX, deltaY);

        session.lastInterval = input;
    } else {
        // use latest velocity info if it doesn't overtake a minimum period
        velocity = last.velocity;
        velocityX = last.velocityX;
        velocityY = last.velocityY;
        direction = last.direction;
    }

    input.velocity = velocity;
    input.velocityX = velocityX;
    input.velocityY = velocityY;
    input.direction = direction;
}

/**
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(input) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    var i = 0;
    while (i < input.pointers.length) {
        pointers[i] = {
            clientX: round(input.pointers[i].clientX),
            clientY: round(input.pointers[i].clientY)
        };
        i++;
    }

    return {
        timeStamp: now(),
        pointers: pointers,
        center: getCenter(pointers),
        deltaX: input.deltaX,
        deltaY: input.deltaY
    };
}

/**
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    var pointersLength = pointers.length;

    // no need to loop when only one touch
    if (pointersLength === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = 0, y = 0, i = 0;
    while (i < pointersLength) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
        i++;
    }

    return {
        x: round(x / pointersLength),
        y: round(y / pointersLength)
    };
}

/**
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} x
 * @param {Number} y
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, x, y) {
    return {
        x: x / deltaTime || 0,
        y: y / deltaTime || 0
    };
}

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
function getDirection(x, y) {
    if (x === y) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];

    return Math.sqrt((x * x) + (y * y));
}

/**
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
function getAngle(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        if (eventType & INPUT_MOVE && ev.which !== 1) {
            eventType = INPUT_END;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_END) {
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    }
});

var POINTER_INPUT_MAP = {
    pointerdown: INPUT_START,
    pointermove: INPUT_MOVE,
    pointerup: INPUT_END,
    pointercancel: INPUT_CANCEL,
    pointerout: INPUT_CANCEL
};

// in IE10 the pointer types is defined as an enum
var IE10_POINTER_TYPE_ENUM = {
    2: INPUT_TYPE_TOUCH,
    3: INPUT_TYPE_PEN,
    4: INPUT_TYPE_MOUSE,
    5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
};

var POINTER_ELEMENT_EVENTS = 'pointerdown';
var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

// IE10 has prefixed support, and case-sensitive
if (window.MSPointerEvent && !window.PointerEvent) {
    POINTER_ELEMENT_EVENTS = 'MSPointerDown';
    POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}

/**
 * Pointer events input
 * @constructor
 * @extends Input
 */
function PointerEventInput() {
    this.evEl = POINTER_ELEMENT_EVENTS;
    this.evWin = POINTER_WINDOW_EVENTS;

    Input.apply(this, arguments);

    this.store = (this.manager.session.pointerEvents = []);
}

inherit(PointerEventInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function PEhandler(ev) {
        var store = this.store;
        var removePointer = false;

        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
        var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

        var isTouch = (pointerType == INPUT_TYPE_TOUCH);

        // get index of the event in the store
        var storeIndex = inArray(store, ev.pointerId, 'pointerId');

        // start and mouse must be down
        if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
            if (storeIndex < 0) {
                store.push(ev);
                storeIndex = store.length - 1;
            }
        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
        }

        // it not found, so the pointer hasn't been down (so it's probably a hover)
        if (storeIndex < 0) {
            return;
        }

        // update the event in the store
        store[storeIndex] = ev;

        this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType: pointerType,
            srcEvent: ev
        });

        if (removePointer) {
            // remove from the store
            store.splice(storeIndex, 1);
        }
    }
});

var SINGLE_TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 * @extends Input
 */
function SingleTouchInput() {
    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    this.started = false;

    Input.apply(this, arguments);
}

inherit(SingleTouchInput, Input, {
    handler: function TEhandler(ev) {
        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

        // should we handle the touch events?
        if (type === INPUT_START) {
            this.started = true;
        }

        if (!this.started) {
            return;
        }

        var touches = normalizeSingleTouches.call(this, ev, type);

        // when done, reset the started state
        if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
            this.started = false;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function normalizeSingleTouches(ev, type) {
    var all = toArray(ev.touches);
    var changed = toArray(ev.changedTouches);

    if (type & (INPUT_END | INPUT_CANCEL)) {
        all = uniqueArray(all.concat(changed), 'identifier', true);
    }

    return [all, changed];
}

var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */
function TouchInput() {
    this.evTarget = TOUCH_TARGET_EVENTS;
    this.targetIds = {};

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    handler: function MTEhandler(ev) {
        var type = TOUCH_INPUT_MAP[ev.type];
        var touches = getTouches.call(this, ev, type);
        if (!touches) {
            return;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function getTouches(ev, type) {
    var allTouches = toArray(ev.touches);
    var targetIds = this.targetIds;

    // when there is only one touch, the process can be simplified
    if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
        targetIds[allTouches[0].identifier] = true;
        return [allTouches, allTouches];
    }

    var i,
        targetTouches,
        changedTouches = toArray(ev.changedTouches),
        changedTargetTouches = [],
        target = this.target;

    // get target touches from touches
    targetTouches = allTouches.filter(function(touch) {
        return hasParent(touch.target, target);
    });

    // collect touches
    if (type === INPUT_START) {
        i = 0;
        while (i < targetTouches.length) {
            targetIds[targetTouches[i].identifier] = true;
            i++;
        }
    }

    // filter changed touches to only contain touches that exist in the collected target ids
    i = 0;
    while (i < changedTouches.length) {
        if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
        }

        // cleanup removed touches
        if (type & (INPUT_END | INPUT_CANCEL)) {
            delete targetIds[changedTouches[i].identifier];
        }
        i++;
    }

    if (!changedTargetTouches.length) {
        return;
    }

    return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
        changedTargetTouches
    ];
}

/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

var DEDUP_TIMEOUT = 2500;
var DEDUP_DISTANCE = 25;

function TouchMouseInput() {
    Input.apply(this, arguments);

    var handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, handler);
    this.mouse = new MouseInput(this.manager, handler);

    this.primaryTouch = null;
    this.lastTouches = [];
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function TMEhandler(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
            return;
        }

        // when we're in a touch event, record touches to  de-dupe synthetic mouse event
        if (isTouch) {
            recordTouches.call(this, inputEvent, inputData);
        } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
            return;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function destroy() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});

function recordTouches(eventType, eventData) {
    if (eventType & INPUT_START) {
        this.primaryTouch = eventData.changedPointers[0].identifier;
        setLastTouch.call(this, eventData);
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
        setLastTouch.call(this, eventData);
    }
}

function setLastTouch(eventData) {
    var touch = eventData.changedPointers[0];

    if (touch.identifier === this.primaryTouch) {
        var lastTouch = {x: touch.clientX, y: touch.clientY};
        this.lastTouches.push(lastTouch);
        var lts = this.lastTouches;
        var removeLastTouch = function() {
            var i = lts.indexOf(lastTouch);
            if (i > -1) {
                lts.splice(i, 1);
            }
        };
        setTimeout(removeLastTouch, DEDUP_TIMEOUT);
    }
}

function isSyntheticEvent(eventData) {
    var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
    for (var i = 0; i < this.lastTouches.length; i++) {
        var t = this.lastTouches[i];
        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
            return true;
        }
    }
    return false;
}

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

/**
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    /**
     * set the touchAction value on the element or enable the polyfill
     * @param {String} value
     */
    set: function(value) {
        // find out the touch-action by the event handlers
        if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
        }

        if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = value.toLowerCase().trim();
    },

    /**
     * just re-set the touchAction value
     */
    update: function() {
        this.set(this.manager.options.touchAction);
    },

    /**
     * compute the value for the touchAction property based on the recognizer's settings
     * @returns {String} value
     */
    compute: function() {
        var actions = [];
        each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
                actions = actions.concat(recognizer.getTouchAction());
            }
        });
        return cleanTouchActions(actions.join(' '));
    },

    /**
     * this method is called on each input cycle and provides the preventing of the browser behavior
     * @param {Object} input
     */
    preventDefaults: function(input) {
        var srcEvent = input.srcEvent;
        var direction = input.offsetDirection;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

        if (hasNone) {
            //do not prevent defaults if this is a tap gesture

            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;

            if (isTapPointer && isTapMovement && isTapTouchTime) {
                return;
            }
        }

        if (hasPanX && hasPanY) {
            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
            return;
        }

        if (hasNone ||
            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
            (hasPanX && direction & DIRECTION_VERTICAL)) {
            return this.preventSrc(srcEvent);
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    preventSrc: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};

/**
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
function cleanTouchActions(actions) {
    // none
    if (inStr(actions, TOUCH_ACTION_NONE)) {
        return TOUCH_ACTION_NONE;
    }

    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

    // if both pan-x and pan-y are set (different recognizers
    // for different directions, e.g. horizontal pan but vertical swipe?)
    // we need none (as otherwise with pan-x pan-y combined none of these
    // recognizers will work, since the browser would handle all panning
    if (hasPanX && hasPanY) {
        return TOUCH_ACTION_NONE;
    }

    // pan-x OR pan-y
    if (hasPanX || hasPanY) {
        return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
    }

    // manipulation
    if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
        return TOUCH_ACTION_MANIPULATION;
    }

    return TOUCH_ACTION_AUTO;
}

function getTouchActionProps() {
    if (!NATIVE_TOUCH_ACTION) {
        return false;
    }
    var touchMap = {};
    var cssSupports = window.CSS && window.CSS.supports;
    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

        // If css.supports is not supported but there is native touch-action assume it supports
        // all values. This is the case for IE 10 and 11.
        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
    });
    return touchMap;
}

/**
 * Recognizer flow explained; *
 * All recognizers have the initial state of POSSIBLE when a input session starts.
 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
 * Example session for mouse-input: mousedown -> mousemove -> mouseup
 *
 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
 * which determines with state it should be.
 *
 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
 * POSSIBLE to give it another change on the next cycle.
 *
 *               Possible
 *                  |
 *            +-----+---------------+
 *            |                     |
 *      +-----+-----+               |
 *      |           |               |
 *   Failed      Cancelled          |
 *                          +-------+------+
 *                          |              |
 *                      Recognized       Began
 *                                         |
 *                                      Changed
 *                                         |
 *                                  Ended/Recognized
 */
var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * Every recognizer needs to extend from this class.
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.options = assign({}, this.defaults, options || {});

    this.id = uniqueId();

    this.manager = null;

    // default is enable true
    this.options.enable = ifUndefined(this.options.enable, true);

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = [];
}

Recognizer.prototype = {
    /**
     * @virtual
     * @type {Object}
     */
    defaults: {},

    /**
     * set options
     * @param {Object} options
     * @return {Recognizer}
     */
    set: function(options) {
        assign(this.options, options);

        // also update the touchAction, in case something changed about the directions/enabled state
        this.manager && this.manager.touchAction.update();
        return this;
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
            return this;
        }

        var simultaneous = this.simultaneous;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (!simultaneous[otherRecognizer.id]) {
            simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link. it doesnt remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        delete this.simultaneous[otherRecognizer.id];
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
            return this;
        }

        var requireFail = this.requireFail;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (inArray(requireFail, otherRecognizer) === -1) {
            requireFail.push(otherRecognizer);
            otherRecognizer.requireFailure(this);
        }
        return this;
    },

    /**
     * drop the requireFailure link. it does not remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if (index > -1) {
            this.requireFail.splice(index, 1);
        }
        return this;
    },

    /**
     * has require failures boolean
     * @returns {boolean}
     */
    hasRequireFailures: function() {
        return this.requireFail.length > 0;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * You should use `tryEmit` instead of `emit` directly to check
     * that all the needed recognizers has failed before emitting.
     * @param {Object} input
     */
    emit: function(input) {
        var self = this;
        var state = this.state;

        function emit(event) {
            self.manager.emit(event, input);
        }

        // 'panstart' and 'panmove'
        if (state < STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }

        emit(self.options.event); // simple 'eventName' events

        if (input.additionalEvent) { // additional event(panleft, panright, pinchin, pinchout...)
            emit(input.additionalEvent);
        }

        // panend and pancancel
        if (state >= STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }
    },

    /**
     * Check that all the require failure recognizers has failed,
     * if true, it emits a gesture event,
     * otherwise, setup the state to FAILED.
     * @param {Object} input
     */
    tryEmit: function(input) {
        if (this.canEmit()) {
            return this.emit(input);
        }
        // it's failing anyway
        this.state = STATE_FAILED;
    },

    /**
     * can we emit?
     * @returns {boolean}
     */
    canEmit: function() {
        var i = 0;
        while (i < this.requireFail.length) {
            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
                return false;
            }
            i++;
        }
        return true;
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        // make a new copy of the inputData
        // so we can change the inputData without messing up the other recognizers
        var inputDataClone = assign({}, inputData);

        // is is enabled and allow recognizing?
        if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        this.state = this.process(inputDataClone);

        // the recognizer has recognized a gesture
        // so trigger an event
        if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.tryEmit(inputDataClone);
        }
    },

    /**
     * return the state of the recognizer
     * the actual recognizing happens in this method
     * @virtual
     * @param {Object} inputData
     * @returns {Const} STATE
     */
    process: function(inputData) { }, // jshint ignore:line

    /**
     * return the preferred touch-action
     * @virtual
     * @returns {Array}
     */
    getTouchAction: function() { },

    /**
     * called when the gesture isn't allowed to recognize
     * like when another is being recognized or it is disabled
     * @virtual
     */
    reset: function() { }
};

/**
 * get a usable string, used as event postfix
 * @param {Const} state
 * @returns {String} state
 */
function stateStr(state) {
    if (state & STATE_CANCELLED) {
        return 'cancel';
    } else if (state & STATE_ENDED) {
        return 'end';
    } else if (state & STATE_CHANGED) {
        return 'move';
    } else if (state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}

/**
 * direction cons to string
 * @param {Const} direction
 * @returns {String}
 */
function directionStr(direction) {
    if (direction == DIRECTION_DOWN) {
        return 'down';
    } else if (direction == DIRECTION_UP) {
        return 'up';
    } else if (direction == DIRECTION_LEFT) {
        return 'left';
    } else if (direction == DIRECTION_RIGHT) {
        return 'right';
    }
    return '';
}

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if (manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}

/**
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof AttrRecognizer
     */
    defaults: {
        /**
         * @type {Number}
         * @default 1
         */
        pointers: 1
    },

    /**
     * Used to check if it the recognizer receives valid input, like input.distance > 10.
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if (isRecognized || isValid) {
            if (eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if (!(state & STATE_BEGAN)) {
                return STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});

/**
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PanRecognizer
     */
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    getTouchAction: function() {
        var direction = this.options.direction;
        var actions = [];
        if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
        }
        if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
        }
        return actions;
    },

    directionTest: function(input) {
        var options = this.options;
        var hasMoved = true;
        var distance = input.distance;
        var direction = input.direction;
        var x = input.deltaX;
        var y = input.deltaY;

        // lock to axis?
        if (!(direction & options.direction)) {
            if (options.direction & DIRECTION_HORIZONTAL) {
                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                hasMoved = x != this.pX;
                distance = Math.abs(input.deltaX);
            } else {
                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                hasMoved = y != this.pY;
                distance = Math.abs(input.deltaY);
            }
        }
        input.direction = direction;
        return hasMoved && distance > options.threshold && direction & options.direction;
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input) &&
            (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
    },

    emit: function(input) {

        this.pX = input.deltaX;
        this.pY = input.deltaY;

        var direction = directionStr(input.direction);

        if (direction) {
            input.additionalEvent = this.options.event + direction;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        if (input.scale !== 1) {
            var inOut = input.scale < 1 ? 'in' : 'out';
            input.additionalEvent = this.options.event + inOut;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PressRecognizer
     */
    defaults: {
        event: 'press',
        pointers: 1,
        time: 251, // minimal time of the pointer to be pressed
        threshold: 9 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;
        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if (input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeoutContext(function() {
                this.state = STATE_RECOGNIZED;
                this.tryEmit();
            }, options.time, this);
        } else if (input.eventType & INPUT_END) {
            return STATE_RECOGNIZED;
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function(input) {
        if (this.state !== STATE_RECOGNIZED) {
            return;
        }

        if (input && (input.eventType & INPUT_END)) {
            this.manager.emit(this.options.event + 'up', input);
        } else {
            this._input.timeStamp = now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof RotateRecognizer
     */
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});

/**
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof SwipeRecognizer
     */
    defaults: {
        event: 'swipe',
        threshold: 10,
        velocity: 0.3,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    getTouchAction: function() {
        return PanRecognizer.prototype.getTouchAction.call(this);
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var velocity;

        if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.overallVelocity;
        } else if (direction & DIRECTION_HORIZONTAL) {
            velocity = input.overallVelocityX;
        } else if (direction & DIRECTION_VERTICAL) {
            velocity = input.overallVelocityY;
        }

        return this._super.attrTest.call(this, input) &&
            direction & input.offsetDirection &&
            input.distance > this.options.threshold &&
            input.maxPointers == this.options.pointers &&
            abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
    },

    emit: function(input) {
        var direction = directionStr(input.offsetDirection);
        if (direction) {
            this.manager.emit(this.options.event + direction, input);
        }

        this.manager.emit(this.options.event, input);
    }
});

/**
 * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */
function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        threshold: 9, // a minimal movement is ok, but keep it low
        posThreshold: 10 // a multi-tap can be a bit off the initial position
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTouchTime = input.deltaTime < options.time;

        this.reset();

        if ((input.eventType & INPUT_START) && (this.count === 0)) {
            return this.failTimeout();
        }

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (validMovement && validTouchTime && validPointers) {
            if (input.eventType != INPUT_END) {
                return this.failTimeout();
            }

            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if (!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            this._input = input;

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
                // no failing requirements, immediately trigger the tap event
                // or wait as long as the multitap interval to trigger
                if (!this.hasRequireFailures()) {
                    return STATE_RECOGNIZED;
                } else {
                    this._timer = setTimeoutContext(function() {
                        this.state = STATE_RECOGNIZED;
                        this.tryEmit();
                    }, options.interval, this);
                    return STATE_BEGAN;
                }
            }
        }
        return STATE_FAILED;
    },

    failTimeout: function() {
        this._timer = setTimeoutContext(function() {
            this.state = STATE_FAILED;
        }, this.options.interval, this);
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Simple way to create a manager with a default set of recognizers.
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
    return new Manager(element, options);
}

/**
 * @const {string}
 */
Hammer.VERSION = '2.0.7';

/**
 * default settings
 * @namespace
 */
Hammer.defaults = {
    /**
     * set if DOM events are being triggered.
     * But this is slower and unused by simple implementations, so disabled by default.
     * @type {Boolean}
     * @default false
     */
    domEvents: false,

    /**
     * The value for the touchAction property/fallback.
     * When set to `compute` it will magically set the correct value based on the added recognizers.
     * @type {String}
     * @default compute
     */
    touchAction: TOUCH_ACTION_COMPUTE,

    /**
     * @type {Boolean}
     * @default true
     */
    enable: true,

    /**
     * EXPERIMENTAL FEATURE -- can be removed/changed
     * Change the parent input target element.
     * If Null, then it is being set the to main element.
     * @type {Null|EventTarget}
     * @default null
     */
    inputTarget: null,

    /**
     * force an input class
     * @type {Null|Function}
     * @default null
     */
    inputClass: null,

    /**
     * Default recognizer setup when calling `Hammer()`
     * When creating a new Manager these will be skipped.
     * @type {Array}
     */
    preset: [
        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
        [RotateRecognizer, {enable: false}],
        [PinchRecognizer, {enable: false}, ['rotate']],
        [SwipeRecognizer, {direction: DIRECTION_HORIZONTAL}],
        [PanRecognizer, {direction: DIRECTION_HORIZONTAL}, ['swipe']],
        [TapRecognizer],
        [TapRecognizer, {event: 'doubletap', taps: 2}, ['tap']],
        [PressRecognizer]
    ],

    /**
     * Some CSS properties can be used to improve the working of Hammer.
     * Add them to this method and they will be set when creating a new Manager.
     * @namespace
     */
    cssProps: {
        /**
         * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userSelect: 'none',

        /**
         * Disable the Windows Phone grippers when pressing an element.
         * @type {String}
         * @default 'none'
         */
        touchSelect: 'none',

        /**
         * Disables the default callout shown when you touch and hold a touch target.
         * On iOS, when you touch and hold a touch target such as a link, Safari displays
         * a callout containing information about the link. This property allows you to disable that callout.
         * @type {String}
         * @default 'none'
         */
        touchCallout: 'none',

        /**
         * Specifies whether zooming is enabled. Used by IE10>
         * @type {String}
         * @default 'none'
         */
        contentZooming: 'none',

        /**
         * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userDrag: 'none',

        /**
         * Overrides the highlight color shown when the user taps a link or a JavaScript
         * clickable element in iOS. This property obeys the alpha value, if specified.
         * @type {String}
         * @default 'rgba(0,0,0,0)'
         */
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

var STOP = 1;
var FORCED_STOP = 2;

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, function(item) {
        var recognizer = this.add(new (item[0])(item[1]));
        item[2] && recognizer.recognizeWith(item[2]);
        item[3] && recognizer.requireFailure(item[3]);
    }, this);
}

Manager.prototype = {
    /**
     * set options
     * @param {Object} options
     * @returns {Manager}
     */
    set: function(options) {
        assign(this.options, options);

        // Options that need a little more setup
        if (options.touchAction) {
            this.touchAction.update();
        }
        if (options.inputTarget) {
            // Clean up existing event listeners and reinitialize
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
        }
        return this;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired.
     * When forced, the recognizer cycle is stopped immediately.
     * @param {Boolean} [force]
     */
    stop: function(force) {
        this.session.stopped = force ? FORCED_STOP : STOP;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function on every movement of the pointers (touches)
     * it walks through all the recognizers and tries to detect the gesture that is being made
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        var session = this.session;
        if (session.stopped) {
            return;
        }

        // run the touch-action polyfill
        this.touchAction.preventDefaults(inputData);

        var recognizer;
        var recognizers = this.recognizers;

        // this holds the recognizer that is being recognized.
        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
        // if no recognizer is detecting a thing, it is set to `null`
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is recognized
        // or when we're in a new session
        if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        var i = 0;
        while (i < recognizers.length) {
            recognizer = recognizers[i];

            // find out if we are allowed try to recognize the input for this one.
            // 1.   allow if the session is NOT forced stopped (see the .stop() method)
            // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
            //      that is being recognized.
            // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
            //      this can be setup with the `recognizeWith()` method on the recognizer.
            if (session.stopped !== FORCED_STOP && ( // 1
                    !curRecognizer || recognizer == curRecognizer || // 2
                    recognizer.canRecognizeWith(curRecognizer))) { // 3
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
            // current active recognizer. but only if we don't already have an active recognizer
            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
            i++;
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if (recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * existing recognizers with the same event name will be removed
     * @param {Recognizer} recognizer
     * @returns {Recognizer|Manager}
     */
    add: function(recognizer) {
        if (invokeArrayArg(recognizer, 'add', this)) {
            return this;
        }

        // remove existing
        var existing = this.get(recognizer.options.event);
        if (existing) {
            this.remove(existing);
        }

        this.recognizers.push(recognizer);
        recognizer.manager = this;

        this.touchAction.update();
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Manager}
     */
    remove: function(recognizer) {
        if (invokeArrayArg(recognizer, 'remove', this)) {
            return this;
        }

        recognizer = this.get(recognizer);

        // let's make sure this recognizer exists
        if (recognizer) {
            var recognizers = this.recognizers;
            var index = inArray(recognizers, recognizer);

            if (index !== -1) {
                recognizers.splice(index, 1);
                this.touchAction.update();
            }
        }

        return this;
    },

    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        if (events === undefined) {
            return;
        }
        if (handler === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        if (events === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if (!handler) {
                delete handlers[event];
            } else {
                handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit: function(event, data) {
        // we also want to trigger dom events
        if (this.options.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event] && this.handlers[event].slice();
        if (!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        var i = 0;
        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    },

    /**
     * destroy the manager and unbinds all events
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.element && toggleCssProps(this, false);

        this.handlers = {};
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
};

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    if (!element.style) {
        return;
    }
    var prop;
    each(manager.options.cssProps, function(value, name) {
        prop = prefixed(element.style, name);
        if (add) {
            manager.oldCssProps[prop] = element.style[prop];
            element.style[prop] = value;
        } else {
            element.style[prop] = manager.oldCssProps[prop] || '';
        }
    });
    if (!add) {
        manager.oldCssProps = {};
    }
}

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}

assign(Hammer, {
    INPUT_START: INPUT_START,
    INPUT_MOVE: INPUT_MOVE,
    INPUT_END: INPUT_END,
    INPUT_CANCEL: INPUT_CANCEL,

    STATE_POSSIBLE: STATE_POSSIBLE,
    STATE_BEGAN: STATE_BEGAN,
    STATE_CHANGED: STATE_CHANGED,
    STATE_ENDED: STATE_ENDED,
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    STATE_CANCELLED: STATE_CANCELLED,
    STATE_FAILED: STATE_FAILED,

    DIRECTION_NONE: DIRECTION_NONE,
    DIRECTION_LEFT: DIRECTION_LEFT,
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    DIRECTION_UP: DIRECTION_UP,
    DIRECTION_DOWN: DIRECTION_DOWN,
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    DIRECTION_ALL: DIRECTION_ALL,

    Manager: Manager,
    Input: Input,
    TouchAction: TouchAction,

    TouchInput: TouchInput,
    MouseInput: MouseInput,
    PointerEventInput: PointerEventInput,
    TouchMouseInput: TouchMouseInput,
    SingleTouchInput: SingleTouchInput,

    Recognizer: Recognizer,
    AttrRecognizer: AttrRecognizer,
    Tap: TapRecognizer,
    Pan: PanRecognizer,
    Swipe: SwipeRecognizer,
    Pinch: PinchRecognizer,
    Rotate: RotateRecognizer,
    Press: PressRecognizer,

    on: addEventListeners,
    off: removeEventListeners,
    each: each,
    merge: merge,
    extend: extend,
    assign: assign,
    inherit: inherit,
    bindFn: bindFn,
    prefixed: prefixed
});

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.
var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
} else {
    window[exportName] = Hammer;
}

})(window, document, 'Hammer');

; browserify_shim__define__module__export__(typeof Hammer != "undefined" ? Hammer : window.Hammer);

}).call(global, undefined, undefined, undefined, undefined, function defineExport(ex) { module.exports = ex; });

}).call(this,window)

},{}],40:[function(require,module,exports){
var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":38}],41:[function(require,module,exports){
/*!
 * index-of <https://github.com/jonschlinkert/index-of>
 *
 * Copyright (c) 2014-2015 Jon Schlinkert.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function indexOf(arr, ele, start) {
  start = start || 0;
  var idx = -1;

  if (arr == null) return idx;
  var len = arr.length;
  var i = start < 0
    ? (len + start)
    : start;

  if (i >= arr.length) {
    return -1;
  }

  while (i < len) {
    if (arr[i] === ele) {
      return i;
    }
    i++;
  }

  return -1;
};

},{}],42:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;

var constructorRegex = /^\s*class /;
var isES6ClassFn = function isES6ClassFn(value) {
	try {
		var fnStr = fnToStr.call(value);
		var singleStripped = fnStr.replace(/\/\/.*\n/g, '');
		var multiStripped = singleStripped.replace(/\/\*[.\s\S]*\*\//g, '');
		var spaceStripped = multiStripped.replace(/\n/mg, ' ').replace(/ {2}/g, ' ');
		return constructorRegex.test(spaceStripped);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionObject(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isCallable(value) {
	if (!value) { return false; }
	if (typeof value !== 'function' && typeof value !== 'object') { return false; }
	if (hasToStringTag) { return tryFunctionObject(value); }
	if (isES6ClassFn(value)) { return false; }
	var strClass = toStr.call(value);
	return strClass === fnClass || strClass === genClass;
};

},{}],43:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],44:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = debounce;

}).call(this,window)

},{}],45:[function(require,module,exports){
//     (c) 2012-2016 Airbnb, Inc.
//
//     polyglot.js may be freely distributed under the terms of the BSD
//     license. For all licensing information, details, and documention:
//     http://airbnb.github.com/polyglot.js
//
//
// Polyglot.js is an I18n helper library written in JavaScript, made to
// work both in the browser and in Node. It provides a simple solution for
// interpolation and pluralization, based off of Airbnb's
// experience adding I18n functionality to its Backbone.js and Node apps.
//
// Polylglot is agnostic to your translation backend. It doesn't perform any
// translation; it simply gives you a way to manage translated phrases from
// your client- or server-side JavaScript application.
//

'use strict';

var forEach = require('for-each');
var warning = require('warning');
var has = require('has');
var trim = require('string.prototype.trim');

var warn = function warn(message) {
  warning(false, message);
};

var replace = String.prototype.replace;
var split = String.prototype.split;

// #### Pluralization methods
// The string that separates the different phrase possibilities.
var delimeter = '||||';

// Mapping from pluralization group plural logic.
var pluralTypes = {
  arabic: function (n) {
    // http://www.arabeyes.org/Plural_Forms
    if (n < 3) { return n; }
    if (n % 100 >= 3 && n % 100 <= 10) return 3;
    return n % 100 >= 11 ? 4 : 5;
  },
  chinese: function () { return 0; },
  german: function (n) { return n !== 1 ? 1 : 0; },
  french: function (n) { return n > 1 ? 1 : 0; },
  russian: function (n) {
    if (n % 10 === 1 && n % 100 !== 11) { return 0; }
    return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
  },
  czech: function (n) {
    if (n === 1) { return 0; }
    return (n >= 2 && n <= 4) ? 1 : 2;
  },
  polish: function (n) {
    if (n === 1) { return 0; }
    return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
  },
  icelandic: function (n) { return (n % 10 !== 1 || n % 100 === 11) ? 1 : 0; }
};

// Mapping from pluralization group to individual locales.
var pluralTypeToLanguages = {
  arabic: ['ar'],
  chinese: ['fa', 'id', 'ja', 'ko', 'lo', 'ms', 'th', 'tr', 'zh'],
  german: ['da', 'de', 'en', 'es', 'fi', 'el', 'he', 'hu', 'it', 'nl', 'no', 'pt', 'sv'],
  french: ['fr', 'tl', 'pt-br'],
  russian: ['hr', 'ru', 'lt'],
  czech: ['cs', 'sk'],
  polish: ['pl'],
  icelandic: ['is']
};

function langToTypeMap(mapping) {
  var ret = {};
  forEach(mapping, function (langs, type) {
    forEach(langs, function (lang) {
      ret[lang] = type;
    });
  });
  return ret;
}

function pluralTypeName(locale) {
  var langToPluralType = langToTypeMap(pluralTypeToLanguages);
  return langToPluralType[locale]
    || langToPluralType[split.call(locale, /-/, 1)[0]]
    || langToPluralType.en;
}

function pluralTypeIndex(locale, count) {
  return pluralTypes[pluralTypeName(locale)](count);
}

var dollarRegex = /\$/g;
var dollarBillsYall = '$$';
var tokenRegex = /%\{(.*?)\}/g;

// ### transformPhrase(phrase, substitutions, locale)
//
// Takes a phrase string and transforms it by choosing the correct
// plural form and interpolating it.
//
//     transformPhrase('Hello, %{name}!', {name: 'Spike'});
//     // "Hello, Spike!"
//
// The correct plural form is selected if substitutions.smart_count
// is set. You can pass in a number instead of an Object as `substitutions`
// as a shortcut for `smart_count`.
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 1}, 'en');
//     // "1 new message"
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 2}, 'en');
//     // "2 new messages"
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', 5, 'en');
//     // "5 new messages"
//
// You should pass in a third argument, the locale, to specify the correct plural type.
// It defaults to `'en'` with 2 plural forms.
function transformPhrase(phrase, substitutions, locale) {
  if (typeof phrase !== 'string') {
    throw new TypeError('Polyglot.transformPhrase expects argument #1 to be string');
  }

  if (substitutions == null) {
    return phrase;
  }

  var result = phrase;

  // allow number as a pluralization shortcut
  var options = typeof substitutions === 'number' ? { smart_count: substitutions } : substitutions;

  // Select plural form: based on a phrase text that contains `n`
  // plural forms separated by `delimeter`, a `locale`, and a `substitutions.smart_count`,
  // choose the correct plural form. This is only done if `count` is set.
  if (options.smart_count != null && result) {
    var texts = split.call(result, delimeter);
    result = trim(texts[pluralTypeIndex(locale || 'en', options.smart_count)] || texts[0]);
  }

  // Interpolate: Creates a `RegExp` object for each interpolation placeholder.
  result = replace.call(result, tokenRegex, function (expression, argument) {
    if (!has(options, argument) || options[argument] == null) { return expression; }
    // Ensure replacement value is escaped to prevent special $-prefixed regex replace tokens.
    return replace.call(options[argument], dollarRegex, dollarBillsYall);
  });

  return result;
}

// ### Polyglot class constructor
function Polyglot(options) {
  var opts = options || {};
  this.phrases = {};
  this.extend(opts.phrases || {});
  this.currentLocale = opts.locale || 'en';
  var allowMissing = opts.allowMissing ? transformPhrase : null;
  this.onMissingKey = typeof opts.onMissingKey === 'function' ? opts.onMissingKey : allowMissing;
  this.warn = opts.warn || warn;
}

// ### polyglot.locale([locale])
//
// Get or set locale. Internally, Polyglot only uses locale for pluralization.
Polyglot.prototype.locale = function (newLocale) {
  if (newLocale) this.currentLocale = newLocale;
  return this.currentLocale;
};

// ### polyglot.extend(phrases)
//
// Use `extend` to tell Polyglot how to translate a given key.
//
//     polyglot.extend({
//       "hello": "Hello",
//       "hello_name": "Hello, %{name}"
//     });
//
// The key can be any string.  Feel free to call `extend` multiple times;
// it will override any phrases with the same key, but leave existing phrases
// untouched.
//
// It is also possible to pass nested phrase objects, which get flattened
// into an object with the nested keys concatenated using dot notation.
//
//     polyglot.extend({
//       "nav": {
//         "hello": "Hello",
//         "hello_name": "Hello, %{name}",
//         "sidebar": {
//           "welcome": "Welcome"
//         }
//       }
//     });
//
//     console.log(polyglot.phrases);
//     // {
//     //   'nav.hello': 'Hello',
//     //   'nav.hello_name': 'Hello, %{name}',
//     //   'nav.sidebar.welcome': 'Welcome'
//     // }
//
// `extend` accepts an optional second argument, `prefix`, which can be used
// to prefix every key in the phrases object with some string, using dot
// notation.
//
//     polyglot.extend({
//       "hello": "Hello",
//       "hello_name": "Hello, %{name}"
//     }, "nav");
//
//     console.log(polyglot.phrases);
//     // {
//     //   'nav.hello': 'Hello',
//     //   'nav.hello_name': 'Hello, %{name}'
//     // }
//
// This feature is used internally to support nested phrase objects.
Polyglot.prototype.extend = function (morePhrases, prefix) {
  forEach(morePhrases, function (phrase, key) {
    var prefixedKey = prefix ? prefix + '.' + key : key;
    if (typeof phrase === 'object') {
      this.extend(phrase, prefixedKey);
    } else {
      this.phrases[prefixedKey] = phrase;
    }
  }, this);
};

// ### polyglot.unset(phrases)
// Use `unset` to selectively remove keys from a polyglot instance.
//
//     polyglot.unset("some_key");
//     polyglot.unset({
//       "hello": "Hello",
//       "hello_name": "Hello, %{name}"
//     });
//
// The unset method can take either a string (for the key), or an object hash with
// the keys that you would like to unset.
Polyglot.prototype.unset = function (morePhrases, prefix) {
  if (typeof morePhrases === 'string') {
    delete this.phrases[morePhrases];
  } else {
    forEach(morePhrases, function (phrase, key) {
      var prefixedKey = prefix ? prefix + '.' + key : key;
      if (typeof phrase === 'object') {
        this.unset(phrase, prefixedKey);
      } else {
        delete this.phrases[prefixedKey];
      }
    }, this);
  }
};

// ### polyglot.clear()
//
// Clears all phrases. Useful for special cases, such as freeing
// up memory if you have lots of phrases but no longer need to
// perform any translation. Also used internally by `replace`.
Polyglot.prototype.clear = function () {
  this.phrases = {};
};

// ### polyglot.replace(phrases)
//
// Completely replace the existing phrases with a new set of phrases.
// Normally, just use `extend` to add more phrases, but under certain
// circumstances, you may want to make sure no old phrases are lying around.
Polyglot.prototype.replace = function (newPhrases) {
  this.clear();
  this.extend(newPhrases);
};


// ### polyglot.t(key, options)
//
// The most-used method. Provide a key, and `t` will return the
// phrase.
//
//     polyglot.t("hello");
//     => "Hello"
//
// The phrase value is provided first by a call to `polyglot.extend()` or
// `polyglot.replace()`.
//
// Pass in an object as the second argument to perform interpolation.
//
//     polyglot.t("hello_name", {name: "Spike"});
//     => "Hello, Spike"
//
// If you like, you can provide a default value in case the phrase is missing.
// Use the special option key "_" to specify a default.
//
//     polyglot.t("i_like_to_write_in_language", {
//       _: "I like to write in %{language}.",
//       language: "JavaScript"
//     });
//     => "I like to write in JavaScript."
//
Polyglot.prototype.t = function (key, options) {
  var phrase, result;
  var opts = options == null ? {} : options;
  if (typeof this.phrases[key] === 'string') {
    phrase = this.phrases[key];
  } else if (typeof opts._ === 'string') {
    phrase = opts._;
  } else if (this.onMissingKey) {
    var onMissingKey = this.onMissingKey;
    result = onMissingKey(key, opts, this.currentLocale);
  } else {
    this.warn('Missing translation for key: "' + key + '"');
    result = key;
  }
  if (typeof phrase === 'string') {
    result = transformPhrase(phrase, opts, this.currentLocale);
  }
  return result;
};


// ### polyglot.has(key)
//
// Check if polyglot has a translation for given key
Polyglot.prototype.has = function (key) {
  return has(this.phrases, key);
};

// export transformPhrase
Polyglot.transformPhrase = transformPhrase;

module.exports = Polyglot;

},{"for-each":35,"has":40,"string.prototype.trim":51,"warning":54}],46:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],47:[function(require,module,exports){
(function (global){
var now = require('performance-now')
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function(object) {
  if (!object) {
    object = root;
  }
  object.requestAnimationFrame = raf
  object.cancelAnimationFrame = caf
}

}).call(this,window)

},{"performance-now":48}],48:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);



}).call(this,require('_process'))

},{"_process":46}],49:[function(require,module,exports){
var COMPLETE = 'complete',
    CANCELED = 'canceled';

function raf(task){
    if('requestAnimationFrame' in window){
        return window.requestAnimationFrame(task);
    }

    setTimeout(task, 16);
}

function setElementScroll(element, x, y){
    if(element.self === element){
        element.scrollTo(x, y);
    }else{
        element.scrollLeft = x;
        element.scrollTop = y;
    }
}

function getTargetScrollLocation(target, parent, align){
    var targetPosition = target.getBoundingClientRect(),
        parentPosition,
        x,
        y,
        differenceX,
        differenceY,
        targetWidth,
        targetHeight,
        leftAlign = align && align.left != null ? align.left : 0.5,
        topAlign = align && align.top != null ? align.top : 0.5,
        leftOffset = align && align.leftOffset != null ? align.leftOffset : 0,
        topOffset = align && align.topOffset != null ? align.topOffset : 0,
        leftScalar = leftAlign,
        topScalar = topAlign;

    if(parent.self === parent){
        targetWidth = Math.min(targetPosition.width, parent.innerWidth);
        targetHeight = Math.min(targetPosition.height, parent.innerHeight);
        x = targetPosition.left + parent.pageXOffset - parent.innerWidth * leftScalar + targetWidth * leftScalar;
        y = targetPosition.top + parent.pageYOffset - parent.innerHeight * topScalar + targetHeight * topScalar;
        x -= leftOffset;
        y -= topOffset;
        differenceX = x - parent.pageXOffset;
        differenceY = y - parent.pageYOffset;
    }else{
        targetWidth = targetPosition.width;
        targetHeight = targetPosition.height;
        parentPosition = parent.getBoundingClientRect();
        var offsetLeft = targetPosition.left - (parentPosition.left - parent.scrollLeft);
        var offsetTop = targetPosition.top - (parentPosition.top - parent.scrollTop);
        x = offsetLeft + (targetWidth * leftScalar) - parent.clientWidth * leftScalar;
        y = offsetTop + (targetHeight * topScalar) - parent.clientHeight * topScalar;
        x = Math.max(Math.min(x, parent.scrollWidth - parent.clientWidth), 0);
        y = Math.max(Math.min(y, parent.scrollHeight - parent.clientHeight), 0);
        x -= leftOffset;
        y -= topOffset;
        differenceX = x - parent.scrollLeft;
        differenceY = y - parent.scrollTop;
    }

    return {
        x: x,
        y: y,
        differenceX: differenceX,
        differenceY: differenceY
    };
}

function animate(parent){
    var scrollSettings = parent._scrollSettings;
    if(!scrollSettings){
        return;
    }

    var location = getTargetScrollLocation(scrollSettings.target, parent, scrollSettings.align),
        time = Date.now() - scrollSettings.startTime,
        timeValue = Math.min(1 / scrollSettings.time * time, 1);

    if(
        time > scrollSettings.time &&
        scrollSettings.endIterations > 3
    ){
        setElementScroll(parent, location.x, location.y);
        parent._scrollSettings = null;
        return scrollSettings.end(COMPLETE);
    }

    scrollSettings.endIterations++;

    var easeValue = 1 - scrollSettings.ease(timeValue);

    setElementScroll(parent,
        location.x - location.differenceX * easeValue,
        location.y - location.differenceY * easeValue
    );

    // At the end of animation, loop synchronously
    // to try and hit the taget location.
    if(time >= scrollSettings.time){
        return animate(parent);
    }

    raf(animate.bind(null, parent));
}
function transitionScrollTo(target, parent, settings, callback){
    var idle = !parent._scrollSettings,
        lastSettings = parent._scrollSettings,
        now = Date.now(),
        endHandler;

    if(lastSettings){
        lastSettings.end(CANCELED);
    }

    function end(endType){
        parent._scrollSettings = null;
        if(parent.parentElement && parent.parentElement._scrollSettings){
            parent.parentElement._scrollSettings.end(endType);
        }
        callback(endType);
        parent.removeEventListener('touchstart', endHandler, { passive: true });
    }

    parent._scrollSettings = {
        startTime: lastSettings ? lastSettings.startTime : Date.now(),
        endIterations: 0,
        target: target,
        time: settings.time + (lastSettings ? now - lastSettings.startTime : 0),
        ease: settings.ease,
        align: settings.align,
        end: end
    };

    endHandler = end.bind(null, CANCELED);
    parent.addEventListener('touchstart', endHandler, { passive: true });

    if(idle){
        animate(parent);
    }
}

function defaultIsScrollable(element){
    return (
        'pageXOffset' in element ||
        (
            element.scrollHeight !== element.clientHeight ||
            element.scrollWidth !== element.clientWidth
        ) &&
        getComputedStyle(element).overflow !== 'hidden'
    );
}

function defaultValidTarget(){
    return true;
}

module.exports = function(target, settings, callback){
    if(!target){
        return;
    }

    if(typeof settings === 'function'){
        callback = settings;
        settings = null;
    }

    if(!settings){
        settings = {};
    }

    settings.time = isNaN(settings.time) ? 1000 : settings.time;
    settings.ease = settings.ease || function(v){return 1 - Math.pow(1 - v, v / 2);};

    var parent = target.parentElement,
        parents = 0;

    function done(endType){
        parents--;
        if(!parents){
            callback && callback(endType);
        }
    }

    var validTarget = settings.validTarget || defaultValidTarget;
    var isScrollable = settings.isScrollable;

    while(parent){
        if(validTarget(parent, parents) && (isScrollable ? isScrollable(parent, defaultIsScrollable) : defaultIsScrollable(parent))){
            parents++;
            transitionScrollTo(target, parent, settings, done);
        }

        parent = parent.parentElement;

        if(!parent){
            return;
        }

        if(parent.tagName === 'BODY'){
            parent = parent.ownerDocument;
            parent = parent.defaultView || parent.ownerWindow;
        }
    }
};

},{}],50:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var ES = require('es-abstract/es5');
var replace = bind.call(Function.call, String.prototype.replace);

var leftWhitespace = /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/;
var rightWhitespace = /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/;

module.exports = function trim() {
	var S = ES.ToString(ES.CheckObjectCoercible(this));
	return replace(replace(S, leftWhitespace, ''), rightWhitespace, '');
};

},{"es-abstract/es5":27,"function-bind":38}],51:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var define = require('define-properties');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var boundTrim = bind.call(Function.call, getPolyfill());

define(boundTrim, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = boundTrim;

},{"./implementation":50,"./polyfill":52,"./shim":53,"define-properties":4,"function-bind":38}],52:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

var zeroWidthSpace = '\u200b';

module.exports = function getPolyfill() {
	if (String.prototype.trim && zeroWidthSpace.trim() === zeroWidthSpace) {
		return String.prototype.trim;
	}
	return implementation;
};

},{"./implementation":50}],53:[function(require,module,exports){
'use strict';

var define = require('define-properties');
var getPolyfill = require('./polyfill');

module.exports = function shimStringTrim() {
	var polyfill = getPolyfill();
	define(String.prototype, { trim: polyfill }, { trim: function () { return String.prototype.trim !== polyfill; } });
	return polyfill;
};

},{"./polyfill":52,"define-properties":4}],54:[function(require,module,exports){
(function (process){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = function() {};

if (process.env.NODE_ENV !== 'production') {
  warning = function(condition, format, args) {
    var len = arguments.length;
    args = new Array(len > 2 ? len - 2 : 0);
    for (var key = 2; key < len; key++) {
      args[key - 2] = arguments[key];
    }
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || (/^[s\W]*$/).test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' +
        format.replace(/%s/g, function() {
          return args[argIndex++];
        });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

module.exports = warning;

}).call(this,require('_process'))

},{"_process":46}],55:[function(require,module,exports){
module.exports = require("./zen-observable.js").Observable;

},{"./zen-observable.js":56}],56:[function(require,module,exports){
'use strict'; (function(fn, name) { if (typeof exports !== 'undefined') fn(exports, module); else if (typeof self !== 'undefined') fn(name === '*' ? self : (name ? self[name] = {} : {})); })(function(exports, module) { // === Symbol Support ===

function hasSymbol(name) {

    return typeof Symbol === "function" && Boolean(Symbol[name]);
}

function getSymbol(name) {

    return hasSymbol(name) ? Symbol[name] : "@@" + name;
}

// === Abstract Operations ===

function getMethod(obj, key) {

    var value = obj[key];

    if (value == null)
        return undefined;

    if (typeof value !== "function")
        throw new TypeError(value + " is not a function");

    return value;
}

function getSpecies(ctor) {

    var symbol = getSymbol("species");
    return symbol ? ctor[symbol] : ctor;
}

function addMethods(target, methods) {

    Object.keys(methods).forEach(function(k) {

        var desc = Object.getOwnPropertyDescriptor(methods, k);
        desc.enumerable = false;
        Object.defineProperty(target, k, desc);
    });
}

function cleanupSubscription(subscription) {

    // Assert:  observer._observer is undefined

    var cleanup = subscription._cleanup;

    if (!cleanup)
        return;

    // Drop the reference to the cleanup function so that we won't call it
    // more than once
    subscription._cleanup = undefined;

    // Call the cleanup function
    cleanup();
}

function subscriptionClosed(subscription) {

    return subscription._observer === undefined;
}

function closeSubscription(subscription) {

    if (subscriptionClosed(subscription))
        return;

    subscription._observer = undefined;
    cleanupSubscription(subscription);
}

function cleanupFromSubscription(subscription) {
    return function(_) { subscription.unsubscribe() };
}

function Subscription(observer, subscriber) {

    // Assert: subscriber is callable

    // The observer must be an object
    if (Object(observer) !== observer)
        throw new TypeError("Observer must be an object");

    this._cleanup = undefined;
    this._observer = observer;

    var start = getMethod(observer, "start");

    if (start)
        start.call(observer, this);

    if (subscriptionClosed(this))
        return;

    observer = new SubscriptionObserver(this);

    try {

        // Call the subscriber function
        var cleanup$0 = subscriber.call(undefined, observer);

        // The return value must be undefined, null, a subscription object, or a function
        if (cleanup$0 != null) {

            if (typeof cleanup$0.unsubscribe === "function")
                cleanup$0 = cleanupFromSubscription(cleanup$0);
            else if (typeof cleanup$0 !== "function")
                throw new TypeError(cleanup$0 + " is not a function");

            this._cleanup = cleanup$0;
        }

    } catch (e) {

        // If an error occurs during startup, then attempt to send the error
        // to the observer
        observer.error(e);
        return;
    }

    // If the stream is already finished, then perform cleanup
    if (subscriptionClosed(this))
        cleanupSubscription(this);
}

addMethods(Subscription.prototype = {}, {
    get closed() { return subscriptionClosed(this) },
    unsubscribe: function() { closeSubscription(this) },
});

function SubscriptionObserver(subscription) {
    this._subscription = subscription;
}

addMethods(SubscriptionObserver.prototype = {}, {

    get closed() { return subscriptionClosed(this._subscription) },

    next: function(value) {

        var subscription = this._subscription;

        // If the stream if closed, then return undefined
        if (subscriptionClosed(subscription))
            return undefined;

        var observer = subscription._observer;

        try {

            var m$0 = getMethod(observer, "next");

            // If the observer doesn't support "next", then return undefined
            if (!m$0)
                return undefined;

            // Send the next value to the sink
            return m$0.call(observer, value);

        } catch (e) {

            // If the observer throws, then close the stream and rethrow the error
            try { closeSubscription(subscription) }
            finally { throw e }
        }
    },

    error: function(value) {

        var subscription = this._subscription;

        // If the stream is closed, throw the error to the caller
        if (subscriptionClosed(subscription))
            throw value;

        var observer = subscription._observer;
        subscription._observer = undefined;

        try {

            var m$1 = getMethod(observer, "error");

            // If the sink does not support "error", then throw the error to the caller
            if (!m$1)
                throw value;

            value = m$1.call(observer, value);

        } catch (e) {

            try { cleanupSubscription(subscription) }
            finally { throw e }
        }

        cleanupSubscription(subscription);
        return value;
    },

    complete: function(value) {

        var subscription = this._subscription;

        // If the stream is closed, then return undefined
        if (subscriptionClosed(subscription))
            return undefined;

        var observer = subscription._observer;
        subscription._observer = undefined;

        try {

            var m$2 = getMethod(observer, "complete");

            // If the sink does not support "complete", then return undefined
            value = m$2 ? m$2.call(observer, value) : undefined;

        } catch (e) {

            try { cleanupSubscription(subscription) }
            finally { throw e }
        }

        cleanupSubscription(subscription);
        return value;
    },

});

function Observable(subscriber) {

    // The stream subscriber must be a function
    if (typeof subscriber !== "function")
        throw new TypeError("Observable initializer must be a function");

    this._subscriber = subscriber;
}

addMethods(Observable.prototype, {

    subscribe: function(observer) { for (var args = [], __$0 = 1; __$0 < arguments.length; ++__$0) args.push(arguments[__$0]); 

        if (typeof observer === 'function') {

            observer = {
                next: observer,
                error: args[0],
                complete: args[1],
            };
        }

        return new Subscription(observer, this._subscriber);
    },

    forEach: function(fn) { var __this = this; 

        return new Promise(function(resolve, reject) {

            if (typeof fn !== "function")
                return Promise.reject(new TypeError(fn + " is not a function"));

            __this.subscribe({

                _subscription: null,

                start: function(subscription) {

                    if (Object(subscription) !== subscription)
                        throw new TypeError(subscription + " is not an object");

                    this._subscription = subscription;
                },

                next: function(value) {

                    var subscription = this._subscription;

                    if (subscription.closed)
                        return;

                    try {

                        return fn(value);

                    } catch (err) {

                        reject(err);
                        subscription.unsubscribe();
                    }
                },

                error: reject,
                complete: resolve,
            });

        });
    },

    map: function(fn) { var __this = this; 

        if (typeof fn !== "function")
            throw new TypeError(fn + " is not a function");

        var C = getSpecies(this.constructor);

        return new C(function(observer) { return __this.subscribe({

            next: function(value) {

                if (observer.closed)
                    return;

                try { value = fn(value) }
                catch (e) { return observer.error(e) }

                return observer.next(value);
            },

            error: function(e) { return observer.error(e) },
            complete: function(x) { return observer.complete(x) },
        }); });
    },

    filter: function(fn) { var __this = this; 

        if (typeof fn !== "function")
            throw new TypeError(fn + " is not a function");

        var C = getSpecies(this.constructor);

        return new C(function(observer) { return __this.subscribe({

            next: function(value) {

                if (observer.closed)
                    return;

                try { if (!fn(value)) return undefined }
                catch (e) { return observer.error(e) }

                return observer.next(value);
            },

            error: function(e) { return observer.error(e) },
            complete: function() { return observer.complete() },
        }); });
    },

    reduce: function(fn) { var __this = this; 

        if (typeof fn !== "function")
            throw new TypeError(fn + " is not a function");

        var C = getSpecies(this.constructor),
            hasSeed = arguments.length > 1,
            hasValue = false,
            seed = arguments[1],
            acc = seed;

        return new C(function(observer) { return __this.subscribe({

            next: function(value) {

                if (observer.closed)
                    return;

                var first = !hasValue;
                hasValue = true;

                if (!first || hasSeed) {

                    try { acc = fn(acc, value) }
                    catch (e) { return observer.error(e) }

                } else {

                    acc = value;
                }
            },

            error: function(e) { return observer.error(e) },

            complete: function() {

                if (!hasValue && !hasSeed) {
                    observer.error(new TypeError("Cannot reduce an empty sequence"));
                    return;
                }

                observer.next(acc);
                observer.complete();
            },

        }); });
    },

    flatMap: function(fn) { var __this = this; 

        if (typeof fn !== "function")
            throw new TypeError(fn + " is not a function");

        var C = getSpecies(this.constructor);

        return new C(function(observer) {

            var completed = false,
                subscriptions = [];

            // Subscribe to the outer Observable
            var outer = __this.subscribe({

                next: function(value) {

                    if (fn) {

                        try {

                            value = fn(value);

                        } catch (x) {

                            observer.error(x);
                            return;
                        }
                    }

                    // Subscribe to the inner Observable
                    Observable.from(value).subscribe({

                        _subscription: null,

                        start: function(s) { subscriptions.push(this._subscription = s) },
                        next: function(value) { observer.next(value) },
                        error: function(e) { observer.error(e) },

                        complete: function() {

                            var i = subscriptions.indexOf(this._subscription);

                            if (i >= 0)
                                subscriptions.splice(i, 1);

                            closeIfDone();
                        }
                    });
                },

                error: function(e) {

                    return observer.error(e);
                },

                complete: function() {

                    completed = true;
                    closeIfDone();
                }
            });

            function closeIfDone() {

                if (completed && subscriptions.length === 0)
                    observer.complete();
            }

            return function(_) {

                subscriptions.forEach(function(s) { return s.unsubscribe(); });
                outer.unsubscribe();
            };
        });
    }

});

Object.defineProperty(Observable.prototype, getSymbol("observable"), {
    value: function() { return this },
    writable: true,
    configurable: true,
});

addMethods(Observable, {

    from: function(x) {

        var C = typeof this === "function" ? this : Observable;

        if (x == null)
            throw new TypeError(x + " is not an object");

        var method = getMethod(x, getSymbol("observable"));

        if (method) {

            var observable$0 = method.call(x);

            if (Object(observable$0) !== observable$0)
                throw new TypeError(observable$0 + " is not an object");

            if (observable$0.constructor === C)
                return observable$0;

            return new C(function(observer) { return observable$0.subscribe(observer); });
        }

        if (hasSymbol("iterator") && (method = getMethod(x, getSymbol("iterator")))) {

            return new C(function(observer) {

                for (var __$0 = (method.call(x))[Symbol.iterator](), __$1; __$1 = __$0.next(), !__$1.done;) { var item$0 = __$1.value; 

                    observer.next(item$0);

                    if (observer.closed)
                        return;
                }

                observer.complete();
            });
        }

        if (Array.isArray(x)) {

            return new C(function(observer) {

                for (var i$0 = 0; i$0 < x.length; ++i$0) {

                    observer.next(x[i$0]);

                    if (observer.closed)
                        return;
                }

                observer.complete();
            });
        }

        throw new TypeError(x + " is not observable");
    },

    of: function() { for (var items = [], __$0 = 0; __$0 < arguments.length; ++__$0) items.push(arguments[__$0]); 

        var C = typeof this === "function" ? this : Observable;

        return new C(function(observer) {

            for (var i$1 = 0; i$1 < items.length; ++i$1) {

                observer.next(items[i$1]);

                if (observer.closed)
                    return;
            }

            observer.complete();
        });
    },

});

Object.defineProperty(Observable, getSymbol("species"), {
    get: function() { return this },
    configurable: true,
});

exports.Observable = Observable;


}, "*");
},{}],57:[function(require,module,exports){
module.exports = "<hypothesis-adder-toolbar class=\"annotator-adder js-adder\">\n  <hypothesis-adder-actions class=\"annotator-adder-actions\">\n    <button class=\"annotator-adder-actions__button h-icon-annotate js-annotate-btn\">\n      <span class=\"annotator-adder-actions__label\" data-action=\"comment\">Add Comment</span>\n    </button>\n    <button class=\"annotator-adder-actions__button h-icon-highlight js-highlight-btn\">\n      <span class=\"annotator-adder-actions__label\" data-action=\"highlight\">Highlight</span>\n    </button>\n  </hypothesis-adder-actions>\n</hypothesis-adder-toolbar>\n";

},{}],58:[function(require,module,exports){
'use strict';

var classnames = require('classnames');

var template = require('./adder.html');

var ANNOTATE_BTN_CLASS = 'js-annotate-btn';
var ANNOTATE_BTN_SELECTOR = '.js-annotate-btn';

var HIGHLIGHT_BTN_SELECTOR = '.js-highlight-btn';

/**
 * @typedef Target
 * @prop {number} left - Offset from left edge of viewport.
 * @prop {number} top - Offset from top edge of viewport.
 * @prop {number} arrowDirection - Direction of the adder's arrow.
 */

/**
 * Show the adder above the selection with an arrow pointing down at the
 * selected text.
 */
var ARROW_POINTING_DOWN = 1;

/**
 * Show the adder above the selection with an arrow pointing up at the
 * selected text.
 */
var ARROW_POINTING_UP = 2;

function toPx(pixels) {
  return pixels.toString() + 'px';
}

var ARROW_HEIGHT = 10;

// The preferred gap between the end of the text selection and the adder's
// arrow position.
var ARROW_H_MARGIN = 20;

function attachShadow(element) {
  if (element.attachShadow) {
    // Shadow DOM v1 (Chrome v53, Safari 10)
    return element.attachShadow({ mode: 'open' });
  } else if (element.createShadowRoot) {
    // Shadow DOM v0 (Chrome ~35-52)
    return element.createShadowRoot();
  } else {
    return null;
  }
}

/**
 * Return the closest ancestor of `el` which has been positioned.
 *
 * If no ancestor has been positioned, returns the root element.
 *
 * @param {Element} el
 * @return {Element}
 */
function nearestPositionedAncestor(el) {
  var parentEl = el.parentElement;
  while (parentEl.parentElement) {
    if (getComputedStyle(parentEl).position !== 'static') {
      break;
    }
    parentEl = parentEl.parentElement;
  }
  return parentEl;
}

/**
 * Create the DOM structure for the Adder.
 *
 * Returns the root DOM node for the adder, which may be in a shadow tree.
 */
function createAdderDOM(container) {
  var element;

  // If the browser supports Shadow DOM, use it to isolate the adder
  // from the page's CSS
  //
  // See https://developers.google.com/web/fundamentals/primers/shadowdom/
  var shadowRoot = attachShadow(container);
  if (shadowRoot) {
    shadowRoot.innerHTML = template;
    element = shadowRoot.querySelector('.js-adder');

    // Load stylesheets required by adder into shadow DOM element
    var adderStyles = Array.from(document.styleSheets).map(function (sheet) {
      return sheet.href;
    }).filter(function (url) {
      return (url || '').match(/(icomoon|annotator)\.css/);
    });

    // Stylesheet <link> elements are inert inside shadow roots [1]. Until
    // Shadow DOM implementations support external stylesheets [2], grab the
    // relevant CSS files from the current page and `@import` them.
    //
    // [1] http://stackoverflow.com/questions/27746590
    // [2] https://github.com/w3c/webcomponents/issues/530
    //
    // This will unfortunately break if the page blocks inline stylesheets via
    // CSP, but that appears to be rare and if this happens, the user will still
    // get a usable adder, albeit one that uses browser default styles for the
    // toolbar.
    var styleEl = document.createElement('style');
    styleEl.textContent = adderStyles.map(function (url) {
      return '@import "' + url + '";';
    }).join('\n');
    shadowRoot.appendChild(styleEl);
  } else {
    container.innerHTML = template;
    element = container.querySelector('.js-adder');
  }
  return element;
}

/**
 * Annotation 'adder' toolbar which appears next to the selection
 * and provides controls for the user to create new annotations.
 *
 * @param {Element} container - The DOM element into which the adder will be created
 * @param {Object} options - Options object specifying `onAnnotate` and `onHighlight`
 *        event handlers.
 */
function Adder(container, options) {

  var self = this;
  // Flag to manage the visibility of Highlight Button
  var isHighlightBtnVisible = options.isHighlightBtnVisible();
  self.element = createAdderDOM(container);

  var feedBackBtn = options.traslatedBtnStrings().AnnotateBtn;
  var HighlightBtn = options.traslatedBtnStrings().HighlightBtn;

  // Set initial style
  Object.assign(container.style, {
    display: 'block',

    // take position out of layout flow initially
    position: 'absolute',
    top: 0,

    // Assign a high Z-index so that the adder shows above any content on the
    // page
    zIndex: 999
  });

  // The adder is hidden using the `visibility` property rather than `display`
  // so that we can compute its size in order to position it before display.
  self.element.style.visibility = 'hidden';

  var view = self.element.ownerDocument.defaultView;
  var enterTimeout;

  self.element.querySelector(ANNOTATE_BTN_SELECTOR).addEventListener('click', handleCommand);
  self.element.querySelector(ANNOTATE_BTN_SELECTOR).children[0].innerHTML = feedBackBtn;

  if (isHighlightBtnVisible) {
    self.element.querySelector(HIGHLIGHT_BTN_SELECTOR).addEventListener('click', handleCommand);
    self.element.querySelector(HIGHLIGHT_BTN_SELECTOR).innerHTML = HighlightBtn;
  } else {
    self.element.querySelector(HIGHLIGHT_BTN_SELECTOR).style.display = 'none';
  }

  function handleCommand(event) {
    event.preventDefault();
    event.stopPropagation();

    var isAnnotateCommand = this.classList.contains(ANNOTATE_BTN_CLASS);

    if (isAnnotateCommand) {
      options.onAnnotate();
    } else {
      options.onHighlight();
    }

    self.hide();
  }

  function width() {
    return self.element.getBoundingClientRect().width;
  }

  function height() {
    return self.element.getBoundingClientRect().height;
  }

  /** Hide the adder */
  this.hide = function () {
    clearTimeout(enterTimeout);
    self.element.className = classnames({ 'annotator-adder': true });
    self.element.style.visibility = 'hidden';
  };

  /**
   * Return the best position to show the adder in order to target the
   * selected text in `targetRect`.
   *
   * @param {Rect} targetRect - The rect of text to target, in viewport
   *        coordinates.
   * @param {boolean} isSelectionBackwards - True if the selection was made
   *        backwards, such that the focus point is mosty likely at the top-left
   *        edge of `targetRect`.
   * @return {Target}
   */
  this.target = function (targetRect, isSelectionBackwards) {
    // Set the initial arrow direction based on whether the selection was made
    // forwards/upwards or downwards/backwards.
    var arrowDirection;
    if (isSelectionBackwards) {
      arrowDirection = ARROW_POINTING_DOWN;
    } else {
      arrowDirection = ARROW_POINTING_UP;
    }
    var top;
    var left;

    // Position the adder such that the arrow it is above or below the selection
    // and close to the end.
    var hMargin = Math.min(ARROW_H_MARGIN, targetRect.width);
    if (isSelectionBackwards) {
      left = targetRect.left - width() / 2 + hMargin;
    } else {
      left = targetRect.left + targetRect.width - width() / 2 - hMargin;
    }

    // Flip arrow direction if adder would appear above the top or below the
    // bottom of the viewport.
    if (targetRect.top - height() < 0 && arrowDirection === ARROW_POINTING_DOWN) {
      arrowDirection = ARROW_POINTING_UP;
    } else if (targetRect.top + height() > view.innerHeight) {
      arrowDirection = ARROW_POINTING_DOWN;
    }

    if (arrowDirection === ARROW_POINTING_UP) {
      top = targetRect.top + targetRect.height + ARROW_HEIGHT;
    } else {
      top = targetRect.top - height() - ARROW_HEIGHT;
    }

    // Constrain the adder to the viewport.
    left = Math.max(left, 0);
    left = Math.min(left, view.innerWidth - width());

    top = Math.max(top, 0);
    top = Math.min(top, view.innerHeight - height());

    return { top: top, left: left, arrowDirection: arrowDirection };
  };

  /**
   * Show the adder at the given position and with the arrow pointing in
   * `arrowDirection`.
   *
   * @param {number} left - Horizontal offset from left edge of viewport.
   * @param {number} top - Vertical offset from top edge of viewport.
   */
  this.showAt = function (left, top, arrowDirection) {
    self.element.className = classnames({
      'annotator-adder': true,
      'annotator-adder--arrow-down': arrowDirection === ARROW_POINTING_DOWN,
      'annotator-adder--arrow-up': arrowDirection === ARROW_POINTING_UP
    });

    // Some sites make big assumptions about interactive
    // elements on the page. Some want to hide interactive elements
    // after use. So we need to make sure the button stays displayed
    // the way it was originally displayed - without the inline styles
    // See: https://github.com/hypothesis/client/issues/137
    self.element.querySelector(ANNOTATE_BTN_SELECTOR).style.display = '';
    // self.element.querySelector(HIGHLIGHT_BTN_SELECTOR).style.display = '';

    // Translate the (left, top) viewport coordinates into positions relative to
    // the adder's nearest positioned ancestor (NPA).
    //
    // Typically the adder is a child of the `<body>` and the NPA is the root
    // `<html>` element. However page styling may make the `<body>` positioned.
    // See https://github.com/hypothesis/client/issues/487.
    var positionedAncestor = nearestPositionedAncestor(container);
    var parentRect = positionedAncestor.getBoundingClientRect();

    Object.assign(container.style, {
      top: toPx(top - parentRect.top),
      left: toPx(left - parentRect.left)
    });
    self.element.style.visibility = 'visible';

    clearTimeout(enterTimeout);
    enterTimeout = setTimeout(function () {
      self.element.className += ' is-active';
    }, 1);
  };
}

module.exports = {
  ARROW_POINTING_DOWN: ARROW_POINTING_DOWN,
  ARROW_POINTING_UP: ARROW_POINTING_UP,

  Adder: Adder
};

},{"./adder.html":57,"classnames":2}],59:[function(require,module,exports){
var FragmentAnchor, RangeAnchor, TextPositionAnchor, TextQuoteAnchor, querySelector, ref;

ref = require('./types'), FragmentAnchor = ref.FragmentAnchor, RangeAnchor = ref.RangeAnchor, TextPositionAnchor = ref.TextPositionAnchor, TextQuoteAnchor = ref.TextQuoteAnchor;

querySelector = function(type, root, selector, options) {
  var doQuery;
  doQuery = function(resolve, reject) {
    var anchor, error, range;
    try {
      anchor = type.fromSelector(root, selector, options);
      range = anchor.toRange(options);
      return resolve(range);
    } catch (error1) {
      error = error1;
      return reject(error);
    }
  };
  return new Promise(doQuery);
};


/**
 * Anchor a set of selectors.
 *
 * This function converts a set of selectors into a document range.
 * It encapsulates the core anchoring algorithm, using the selectors alone or
 * in combination to establish the best anchor within the document.
 *
 * :param Element root: The root element of the anchoring context.
 * :param Array selectors: The selectors to try.
 * :param Object options: Options to pass to the anchor implementations.
 * :return: A Promise that resolves to a Range on success.
 * :rtype: Promise
 */

exports.anchor = function(root, selectors, options) {
  var fragment, i, len, maybeAssertQuote, position, promise, quote, range, ref1, selector;
  if (options == null) {
    options = {};
  }
  fragment = null;
  position = null;
  quote = null;
  range = null;
  ref1 = selectors != null ? selectors : [];
  for (i = 0, len = ref1.length; i < len; i++) {
    selector = ref1[i];
    switch (selector.type) {
      case 'FragmentSelector':
        fragment = selector;
        break;
      case 'TextPositionSelector':
        position = selector;
        options.hint = position.start;
        break;
      case 'TextQuoteSelector':
        quote = selector;
        break;
      case 'RangeSelector':
        range = selector;
    }
  }
  maybeAssertQuote = function(range) {
    if (((quote != null ? quote.exact : void 0) != null) && range.toString() !== quote.exact) {
      throw new Error('quote mismatch');
    } else {
      return range;
    }
  };
  promise = Promise.reject('unable to anchor');
  if (fragment != null) {
    promise = promise["catch"](function() {
      return querySelector(FragmentAnchor, root, fragment, options).then(maybeAssertQuote);
    });
  }
  if (range != null) {
    promise = promise["catch"](function() {
      return querySelector(RangeAnchor, root, range, options).then(maybeAssertQuote);
    });
  }
  if (position != null) {
    promise = promise["catch"](function() {
      return querySelector(TextPositionAnchor, root, position, options).then(maybeAssertQuote);
    });
  }
  if (quote != null) {
    promise = promise["catch"](function() {
      return querySelector(TextQuoteAnchor, root, quote, options);
    });
  }
  return promise;
};

exports.describe = function(root, range, options) {
  var anchor, selector, selectors, type, types;
  if (options == null) {
    options = {};
  }
  types = [FragmentAnchor, RangeAnchor, TextPositionAnchor, TextQuoteAnchor];
  selectors = (function() {
    var i, len, results;
    results = [];
    for (i = 0, len = types.length; i < len; i++) {
      type = types[i];
      try {
        anchor = type.fromRange(root, range, options);
        results.push(selector = anchor.toSelector(options));
      } catch (error1) {
        continue;
      }
    }
    return results;
  })();
  return selectors;
};


},{"./types":62}],60:[function(require,module,exports){
var RenderingStates, TextPositionAnchor, TextQuoteAnchor, anchorByPosition, findInPages, findPage, getNodeTextLayer, getPage, getPageOffset, getPageTextContent, getSiblingIndex, html, pageTextCache, prioritizePages, quotePositionCache, ref, seek, xpathRange,
  slice = [].slice;

seek = require('dom-seek');

xpathRange = require('./range');

html = require('./html');

RenderingStates = require('../pdfjs-rendering-states');

ref = require('./types'), TextPositionAnchor = ref.TextPositionAnchor, TextQuoteAnchor = ref.TextQuoteAnchor;

pageTextCache = {};

quotePositionCache = {};

getSiblingIndex = function(node) {
  var siblings;
  siblings = Array.prototype.slice.call(node.parentNode.childNodes);
  return siblings.indexOf(node);
};

getNodeTextLayer = function(node) {
  var ref1;
  while (!((ref1 = node.classList) != null ? ref1.contains('page') : void 0)) {
    node = node.parentNode;
  }
  return node.getElementsByClassName('textLayer')[0];
};

getPage = function(pageIndex) {
  return PDFViewerApplication.pdfViewer.getPageView(pageIndex);
};

getPageTextContent = function(pageIndex) {
  var joinItems;
  if (pageTextCache[pageIndex] != null) {
    return pageTextCache[pageIndex];
  } else {
    joinItems = function(arg) {
      var item, items, nonEmpty, textContent;
      items = arg.items;
      nonEmpty = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = items.length; i < len; i++) {
          item = items[i];
          if (/\S/.test(item.str)) {
            results.push(item.str);
          }
        }
        return results;
      })();
      textContent = nonEmpty.join('');
      return textContent;
    };
    pageTextCache[pageIndex] = PDFViewerApplication.pdfViewer.getPageTextContent(pageIndex).then(joinItems);
    return pageTextCache[pageIndex];
  }
};

getPageOffset = function(pageIndex) {
  var index, next;
  index = -1;
  next = function(offset) {
    if (++index === pageIndex) {
      return Promise.resolve(offset);
    }
    return getPageTextContent(index).then(function(textContent) {
      return next(offset + textContent.length);
    });
  };
  return next(0);
};

findPage = function(offset) {
  var count, index, total;
  index = 0;
  total = 0;
  count = function(textContent) {
    var lastPageIndex;
    lastPageIndex = PDFViewerApplication.pdfViewer.pagesCount - 1;
    if (total + textContent.length > offset || index === lastPageIndex) {
      offset = total;
      return Promise.resolve({
        index: index,
        offset: offset,
        textContent: textContent
      });
    } else {
      index++;
      total += textContent.length;
      return getPageTextContent(index).then(count);
    }
  };
  return getPageTextContent(0).then(count);
};

anchorByPosition = function(page, anchor, options) {
  var div, placeholder, range, ref1, ref2, renderingDone, renderingState, root, selector;
  renderingState = page.renderingState;
  renderingDone = (ref1 = page.textLayer) != null ? ref1.renderingDone : void 0;
  if (renderingState === RenderingStates.FINISHED && renderingDone) {
    root = page.textLayer.textLayerDiv;
    selector = anchor.toSelector(options);
    return html.anchor(root, [selector]);
  } else {
    div = (ref2 = page.div) != null ? ref2 : page.el;
    placeholder = div.getElementsByClassName('annotator-placeholder')[0];
    if (placeholder == null) {
      placeholder = document.createElement('span');
      placeholder.classList.add('annotator-placeholder');
      placeholder.textContent = 'Loading annotations…';
      div.appendChild(placeholder);
    }
    range = document.createRange();
    range.setStartBefore(placeholder);
    range.setEndAfter(placeholder);
    return range;
  }
};

findInPages = function(arg, quote, position) {
  var attempt, cacheAndFinish, content, next, offset, page, pageIndex, rest;
  pageIndex = arg[0], rest = 2 <= arg.length ? slice.call(arg, 1) : [];
  if (pageIndex == null) {
    return Promise.reject(new Error('Quote not found'));
  }
  attempt = function(info) {
    var anchor, content, hint, offset, page, root;
    page = info[0], content = info[1], offset = info[2];
    root = {
      textContent: content
    };
    anchor = new TextQuoteAnchor.fromSelector(root, quote);
    if (position != null) {
      hint = position.start - offset;
      hint = Math.max(0, hint);
      hint = Math.min(hint, content.length);
      return anchor.toPositionAnchor({
        hint: hint
      });
    } else {
      return anchor.toPositionAnchor();
    }
  };
  next = function() {
    return findInPages(rest, quote, position);
  };
  cacheAndFinish = function(anchor) {
    var name;
    if (position) {
      if (quotePositionCache[name = quote.exact] == null) {
        quotePositionCache[name] = {};
      }
      quotePositionCache[quote.exact][position.start] = {
        page: page,
        anchor: anchor
      };
    }
    return anchorByPosition(page, anchor);
  };
  page = getPage(pageIndex);
  content = getPageTextContent(pageIndex);
  offset = getPageOffset(pageIndex);
  return Promise.all([page, content, offset]).then(attempt).then(cacheAndFinish)["catch"](next);
};

prioritizePages = function(position) {
  var i, pageIndices, pagesCount, results, sort;
  pagesCount = PDFViewerApplication.pdfViewer.pagesCount;
  pageIndices = (function() {
    results = [];
    for (var i = 0; 0 <= pagesCount ? i < pagesCount : i > pagesCount; 0 <= pagesCount ? i++ : i--){ results.push(i); }
    return results;
  }).apply(this);
  sort = function(pageIndex) {
    var left, result, right;
    left = pageIndices.slice(0, pageIndex);
    right = pageIndices.slice(pageIndex);
    result = [];
    while (left.length || right.length) {
      if (right.length) {
        result.push(right.shift());
      }
      if (left.length) {
        result.push(left.pop());
      }
    }
    return result;
  };
  if (position != null) {
    return findPage(position.start).then(function(arg) {
      var index;
      index = arg.index;
      return sort(index);
    });
  } else {
    return Promise.resolve(pageIndices);
  }
};


/**
 * Anchor a set of selectors.
 *
 * This function converts a set of selectors into a document range.
 * It encapsulates the core anchoring algorithm, using the selectors alone or
 * in combination to establish the best anchor within the document.
 *
 * :param Element root: The root element of the anchoring context.
 * :param Array selectors: The selectors to try.
 * :param Object options: Options to pass to the anchor implementations.
 * :return: A Promise that resolves to a Range on success.
 * :rtype: Promise
 */

exports.anchor = function(root, selectors, options) {
  var assertQuote, i, len, position, promise, quote, ref1, selector;
  if (options == null) {
    options = {};
  }
  position = null;
  quote = null;
  ref1 = selectors != null ? selectors : [];
  for (i = 0, len = ref1.length; i < len; i++) {
    selector = ref1[i];
    switch (selector.type) {
      case 'TextPositionSelector':
        position = selector;
        break;
      case 'TextQuoteSelector':
        quote = selector;
    }
  }
  promise = Promise.reject('unable to anchor');
  assertQuote = function(range) {
    if (((quote != null ? quote.exact : void 0) != null) && range.toString() !== quote.exact) {
      throw new Error('quote mismatch');
    } else {
      return range;
    }
  };
  if (position != null) {
    promise = promise["catch"](function() {
      return findPage(position.start).then(function(arg) {
        var anchor, end, index, length, offset, page, start, textContent;
        index = arg.index, offset = arg.offset, textContent = arg.textContent;
        page = getPage(index);
        start = position.start - offset;
        end = position.end - offset;
        length = end - start;
        assertQuote(textContent.substr(start, length));
        anchor = new TextPositionAnchor(root, start, end);
        return anchorByPosition(page, anchor, options);
      });
    });
  }
  if (quote != null) {
    promise = promise["catch"](function() {
      var anchor, page, ref2, ref3;
      if ((position != null) && (((ref2 = quotePositionCache[quote.exact]) != null ? ref2[position.start] : void 0) != null)) {
        ref3 = quotePositionCache[quote.exact][position.start], page = ref3.page, anchor = ref3.anchor;
        return anchorByPosition(page, anchor, options);
      }
      return prioritizePages(position).then(function(pageIndices) {
        return findInPages(pageIndices, quote, position);
      });
    });
  }
  return promise;
};


/**
 * Convert a DOM Range object into a set of selectors.
 *
 * Converts a DOM `Range` object describing a start and end point within a
 * `root` `Element` and converts it to a `[position, quote]` tuple of selectors
 * which can be saved into an annotation and later passed to `anchor` to map
 * the selectors back to a `Range`.
 *
 * :param Element root: The root Element
 * :param Range range: DOM Range object
 * :param Object options: Options passed to `TextQuoteAnchor` and
 *                        `TextPositionAnchor`'s `toSelector` methods.
 */

exports.describe = function(root, range, options) {
  var end, endPageIndex, endRange, endTextLayer, iter, start, startPageIndex, startRange, startTextLayer;
  if (options == null) {
    options = {};
  }
  range = new xpathRange.BrowserRange(range).normalize();
  startTextLayer = getNodeTextLayer(range.start);
  endTextLayer = getNodeTextLayer(range.end);
  if (startTextLayer !== endTextLayer) {
    throw new Error('selecting across page breaks is not supported');
  }
  startRange = range.limit(startTextLayer);
  endRange = range.limit(endTextLayer);
  startPageIndex = getSiblingIndex(startTextLayer.parentNode);
  endPageIndex = getSiblingIndex(endTextLayer.parentNode);
  iter = document.createNodeIterator(startTextLayer, NodeFilter.SHOW_TEXT);
  start = seek(iter, range.start);
  end = seek(iter, range.end) + start + range.end.textContent.length;
  return getPageOffset(startPageIndex).then(function(pageOffset) {
    var position, quote, r;
    start += pageOffset;
    end += pageOffset;
    position = new TextPositionAnchor(root, start, end).toSelector(options);
    r = document.createRange();
    r.setStartBefore(startRange.start);
    r.setEndAfter(endRange.end);
    quote = TextQuoteAnchor.fromRange(root, r, options).toSelector(options);
    return Promise.all([position, quote]);
  });
};


/**
 * Clear the internal caches of page text contents and quote locations.
 *
 * This exists mainly as a helper for use in tests.
 */

exports.purgeCache = function() {
  pageTextCache = {};
  return quotePositionCache = {};
};


},{"../pdfjs-rendering-states":81,"./html":59,"./range":61,"./types":62,"dom-seek":25}],61:[function(require,module,exports){
var $, Range, Util,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

$ = require('jquery');

Util = require('./util');

Range = {};

Range.sniff = function(r) {
  if (r.commonAncestorContainer != null) {
    return new Range.BrowserRange(r);
  } else if (typeof r.start === "string") {
    return new Range.SerializedRange(r);
  } else if (r.start && typeof r.start === "object") {
    return new Range.NormalizedRange(r);
  } else {
    console.error("Could not sniff range type");
    return false;
  }
};

Range.nodeFromXPath = function(xpath, root) {
  var customResolver, evaluateXPath, namespace, node, segment;
  if (root == null) {
    root = document;
  }
  evaluateXPath = function(xp, nsResolver) {
    var exception;
    if (nsResolver == null) {
      nsResolver = null;
    }
    try {
      return document.evaluate('.' + xp, root, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (error) {
      exception = error;
      console.log("XPath evaluation failed.");
      console.log("Trying fallback...");
      return Util.nodeFromXPath(xp, root);
    }
  };
  if (!$.isXMLDoc(document.documentElement)) {
    return evaluateXPath(xpath);
  } else {
    customResolver = document.createNSResolver(document.ownerDocument === null ? document.documentElement : document.ownerDocument.documentElement);
    node = evaluateXPath(xpath, customResolver);
    if (!node) {
      xpath = ((function() {
        var i, len, ref, results;
        ref = xpath.split('/');
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          if (segment && segment.indexOf(':') === -1) {
            results.push(segment.replace(/^([a-z]+)/, 'xhtml:$1'));
          } else {
            results.push(segment);
          }
        }
        return results;
      })()).join('/');
      namespace = document.lookupNamespaceURI(null);
      customResolver = function(ns) {
        if (ns === 'xhtml') {
          return namespace;
        } else {
          return document.documentElement.getAttribute('xmlns:' + ns);
        }
      };
      node = evaluateXPath(xpath, customResolver);
    }
    return node;
  }
};

Range.RangeError = (function(superClass) {
  extend(RangeError, superClass);

  function RangeError(type, message, parent1) {
    this.type = type;
    this.message = message;
    this.parent = parent1 != null ? parent1 : null;
    RangeError.__super__.constructor.call(this, this.message);
  }

  return RangeError;

})(Error);

Range.BrowserRange = (function() {
  function BrowserRange(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
  }

  BrowserRange.prototype.normalize = function(root) {
    var n, node, nr, r;
    if (this.tainted) {
      console.error("You may only call normalize() once on a BrowserRange!");
      return false;
    } else {
      this.tainted = true;
    }
    r = {};
    if (this.startContainer.nodeType === Node.ELEMENT_NODE) {
      if (this.startOffset < this.startContainer.childNodes.length) {
        r.start = Util.getFirstTextNodeNotBefore(this.startContainer.childNodes[this.startOffset]);
      } else {
        r.start = Util.getFirstTextNodeNotBefore(this.startContainer);
      }
      r.startOffset = 0;
    } else {
      r.start = this.startContainer;
      r.startOffset = this.startOffset;
    }
    if (this.endContainer.nodeType === Node.ELEMENT_NODE) {
      node = this.endContainer.childNodes[this.endOffset];
      if (node != null) {
        n = node;
        while ((n != null) && (n.nodeType !== Node.TEXT_NODE)) {
          n = n.firstChild;
        }
        if (n != null) {
          r.end = n;
          r.endOffset = 0;
        }
      }
      if (r.end == null) {
        if (this.endOffset) {
          node = this.endContainer.childNodes[this.endOffset - 1];
        } else {
          node = this.endContainer.previousSibling;
        }
        r.end = Util.getLastTextNodeUpTo(node);
        r.endOffset = r.end.nodeValue.length;
      }
    } else {
      r.end = this.endContainer;
      r.endOffset = this.endOffset;
    }
    nr = {};
    if (r.startOffset > 0) {
      if (!r.start.nextSibling || r.start.nodeValue.length > r.startOffset) {
        nr.start = r.start.splitText(r.startOffset);
      } else {
        nr.start = r.start.nextSibling;
      }
    } else {
      nr.start = r.start;
    }
    if (r.start === r.end) {
      if (nr.start.nodeValue.length > (r.endOffset - r.startOffset)) {
        nr.start.splitText(r.endOffset - r.startOffset);
      }
      nr.end = nr.start;
    } else {
      if (r.end.nodeValue.length > r.endOffset) {
        r.end.splitText(r.endOffset);
      }
      nr.end = r.end;
    }
    nr.commonAncestor = this.commonAncestorContainer;
    while (nr.commonAncestor.nodeType !== Node.ELEMENT_NODE) {
      nr.commonAncestor = nr.commonAncestor.parentNode;
    }
    return new Range.NormalizedRange(nr);
  };

  BrowserRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  return BrowserRange;

})();

Range.NormalizedRange = (function() {
  function NormalizedRange(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  NormalizedRange.prototype.normalize = function(root) {
    return this;
  };

  NormalizedRange.prototype.limit = function(bounds) {
    var i, len, nodes, parent, ref, startParents;
    nodes = $.grep(this.textNodes(), function(node) {
      return node.parentNode === bounds || $.contains(bounds, node.parentNode);
    });
    if (!nodes.length) {
      return null;
    }
    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];
    startParents = $(this.start).parents();
    ref = $(this.end).parents();
    for (i = 0, len = ref.length; i < len; i++) {
      parent = ref[i];
      if (startParents.index(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  };

  NormalizedRange.prototype.serialize = function(root, ignoreSelector) {
    var end, serialization, start;
    serialization = function(node, isEnd) {
      var i, len, n, nodes, offset, origParent, textNodes, xpath;
      if (ignoreSelector) {
        origParent = $(node).parents(":not(" + ignoreSelector + ")").eq(0);
      } else {
        origParent = $(node).parent();
      }
      xpath = Util.xpathFromNode(origParent, root)[0];
      textNodes = Util.getTextNodes(origParent);
      nodes = textNodes.slice(0, textNodes.index(node));
      offset = 0;
      for (i = 0, len = nodes.length; i < len; i++) {
        n = nodes[i];
        offset += n.nodeValue.length;
      }
      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };
    start = serialization(this.start);
    end = serialization(this.end, true);
    return new Range.SerializedRange({
      start: start[0],
      end: end[0],
      startOffset: start[1],
      endOffset: end[1]
    });
  };

  NormalizedRange.prototype.text = function() {
    var node;
    return ((function() {
      var i, len, ref, results;
      ref = this.textNodes();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        node = ref[i];
        results.push(node.nodeValue);
      }
      return results;
    }).call(this)).join('');
  };

  NormalizedRange.prototype.textNodes = function() {
    var end, ref, start, textNodes;
    textNodes = Util.getTextNodes($(this.commonAncestor));
    ref = [textNodes.index(this.start), textNodes.index(this.end)], start = ref[0], end = ref[1];
    return $.makeArray(textNodes.slice(start, +end + 1 || 9e9));
  };

  NormalizedRange.prototype.toRange = function() {
    var range;
    range = document.createRange();
    range.setStartBefore(this.start);
    range.setEndAfter(this.end);
    return range;
  };

  return NormalizedRange;

})();

Range.SerializedRange = (function() {
  function SerializedRange(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  SerializedRange.prototype.normalize = function(root) {
    var contains, e, i, j, len, len1, length, node, p, range, ref, ref1, targetOffset, tn;
    range = {};
    ref = ['start', 'end'];
    for (i = 0, len = ref.length; i < len; i++) {
      p = ref[i];
      try {
        node = Range.nodeFromXPath(this[p], root);
      } catch (error) {
        e = error;
        throw new Range.RangeError(p, ("Error while finding " + p + " node: " + this[p] + ": ") + e, e);
      }
      if (!node) {
        throw new Range.RangeError(p, "Couldn't find " + p + " node: " + this[p]);
      }
      length = 0;
      targetOffset = this[p + 'Offset'];
      if (p === 'end') {
        targetOffset--;
      }
      ref1 = Util.getTextNodes($(node));
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        tn = ref1[j];
        if (length + tn.nodeValue.length > targetOffset) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }
      if (range[p + 'Offset'] == null) {
        throw new Range.RangeError(p + "offset", "Couldn't find offset " + this[p + 'Offset'] + " in element " + this[p]);
      }
    }
    contains = document.compareDocumentPosition == null ? function(a, b) {
      return a.contains(b);
    } : function(a, b) {
      return a.compareDocumentPosition(b) & 16;
    };
    $(range.startContainer).parents().each(function() {
      if (contains(this, range.endContainer)) {
        range.commonAncestorContainer = this;
        return false;
      }
    });
    return new Range.BrowserRange(range).normalize(root);
  };

  SerializedRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  SerializedRange.prototype.toObject = function() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset
    };
  };

  return SerializedRange;

})();

module.exports = Range;


},{"./util":63,"jquery":"jquery"}],62:[function(require,module,exports){
var RangeAnchor, TextPositionAnchor, TextQuoteAnchor, domAnchorTextPosition, domAnchorTextQuote, missingParameter, xpathRange;

domAnchorTextPosition = require('dom-anchor-text-position');

domAnchorTextQuote = require('dom-anchor-text-quote');

xpathRange = require('./range');

missingParameter = function(name) {
  throw new Error('missing required parameter "' + name + '"');
};


/**
 * class:: RangeAnchor(range)
 *
 * This anchor type represents a DOM Range.
 *
 * :param Range range: A range describing the anchor.
 */

RangeAnchor = (function() {
  function RangeAnchor(root, range) {
    if (root == null) {
      missingParameter('root');
    }
    if (range == null) {
      missingParameter('range');
    }
    this.root = root;
    this.range = xpathRange.sniff(range).normalize(this.root);
  }

  RangeAnchor.fromRange = function(root, range) {
    return new RangeAnchor(root, range);
  };

  RangeAnchor.fromSelector = function(root, selector) {
    var data, range;
    data = {
      start: selector.startContainer,
      startOffset: selector.startOffset,
      end: selector.endContainer,
      endOffset: selector.endOffset
    };
    range = new xpathRange.SerializedRange(data);
    return new RangeAnchor(root, range);
  };

  RangeAnchor.prototype.toRange = function() {
    return this.range.toRange();
  };

  RangeAnchor.prototype.toSelector = function(options) {
    var range;
    if (options == null) {
      options = {};
    }
    range = this.range.serialize(this.root, options.ignoreSelector);
    return {
      type: 'RangeSelector',
      startContainer: range.start,
      startOffset: range.startOffset,
      endContainer: range.end,
      endOffset: range.endOffset
    };
  };

  return RangeAnchor;

})();


/**
 * Converts between TextPositionSelector selectors and Range objects.
 */

TextPositionAnchor = (function() {
  function TextPositionAnchor(root, start, end) {
    this.root = root;
    this.start = start;
    this.end = end;
  }

  TextPositionAnchor.fromRange = function(root, range) {
    var selector;
    selector = domAnchorTextPosition.fromRange(root, range);
    return TextPositionAnchor.fromSelector(root, selector);
  };

  TextPositionAnchor.fromSelector = function(root, selector) {
    return new TextPositionAnchor(root, selector.start, selector.end);
  };

  TextPositionAnchor.prototype.toSelector = function() {
    return {
      type: 'TextPositionSelector',
      start: this.start,
      end: this.end
    };
  };

  TextPositionAnchor.prototype.toRange = function() {
    return domAnchorTextPosition.toRange(this.root, {
      start: this.start,
      end: this.end
    });
  };

  return TextPositionAnchor;

})();


/**
 * Converts between TextQuoteSelector selectors and Range objects.
 */

TextQuoteAnchor = (function() {
  function TextQuoteAnchor(root, exact, context) {
    if (context == null) {
      context = {};
    }
    this.root = root;
    this.exact = exact;
    this.context = context;
  }

  TextQuoteAnchor.fromRange = function(root, range, options) {
    var selector;
    selector = domAnchorTextQuote.fromRange(root, range, options);
    return TextQuoteAnchor.fromSelector(root, selector);
  };

  TextQuoteAnchor.fromSelector = function(root, selector) {
    var prefix, suffix;
    prefix = selector.prefix, suffix = selector.suffix;
    return new TextQuoteAnchor(root, selector.exact, {
      prefix: prefix,
      suffix: suffix
    });
  };

  TextQuoteAnchor.prototype.toSelector = function() {
    return {
      type: 'TextQuoteSelector',
      exact: this.exact,
      prefix: this.context.prefix,
      suffix: this.context.suffix
    };
  };

  TextQuoteAnchor.prototype.toRange = function(options) {
    var range;
    if (options == null) {
      options = {};
    }
    range = domAnchorTextQuote.toRange(this.root, this.toSelector(), options);
    if (range === null) {
      throw new Error('Quote not found');
    }
    return range;
  };

  TextQuoteAnchor.prototype.toPositionAnchor = function(options) {
    var anchor;
    if (options == null) {
      options = {};
    }
    anchor = domAnchorTextQuote.toTextPosition(this.root, this.toSelector(), options);
    if (anchor === null) {
      throw new Error('Quote not found');
    }
    return new TextPositionAnchor(this.root, anchor.start, anchor.end);
  };

  return TextQuoteAnchor;

})();

exports.RangeAnchor = RangeAnchor;

exports.FragmentAnchor = require('dom-anchor-fragment');

exports.TextPositionAnchor = TextPositionAnchor;

exports.TextQuoteAnchor = TextQuoteAnchor;


},{"./range":61,"dom-anchor-fragment":9,"dom-anchor-text-position":10,"dom-anchor-text-quote":13}],63:[function(require,module,exports){
var $, Util, ref, simpleXPathJQuery, simpleXPathPure;

$ = require('jquery');

ref = require('./xpath'), simpleXPathJQuery = ref.simpleXPathJQuery, simpleXPathPure = ref.simpleXPathPure;

Util = {};

Util.flatten = function(array) {
  var flatten;
  flatten = function(ary) {
    var el, flat, i, len;
    flat = [];
    for (i = 0, len = ary.length; i < len; i++) {
      el = ary[i];
      flat = flat.concat(el && $.isArray(el) ? flatten(el) : el);
    }
    return flat;
  };
  return flatten(array);
};

Util.getTextNodes = function(jq) {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== Node.TEXT_NODE) {
      nodes = [];
      if (node.nodeType !== Node.COMMENT_NODE) {
        node = node.lastChild;
        while (node) {
          nodes.push(getTextNodes(node));
          node = node.previousSibling;
        }
      }
      return nodes.reverse();
    } else {
      return node;
    }
  };
  return jq.map(function() {
    return Util.flatten(getTextNodes(this));
  });
};

Util.getLastTextNodeUpTo = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.lastChild != null) {
        result = Util.getLastTextNodeUpTo(n.lastChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.previousSibling;
  if (n != null) {
    return Util.getLastTextNodeUpTo(n);
  } else {
    return null;
  }
};

Util.getFirstTextNodeNotBefore = function(n) {
  var result;
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n;
    case Node.ELEMENT_NODE:
      if (n.firstChild != null) {
        result = Util.getFirstTextNodeNotBefore(n.firstChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.nextSibling;
  if (n != null) {
    return Util.getFirstTextNodeNotBefore(n);
  } else {
    return null;
  }
};

Util.xpathFromNode = function(el, relativeRoot) {
  var exception, result;
  try {
    result = simpleXPathJQuery.call(el, relativeRoot);
  } catch (error) {
    exception = error;
    console.log("jQuery-based XPath construction failed! Falling back to manual.");
    result = simpleXPathPure.call(el, relativeRoot);
  }
  return result;
};

Util.nodeFromXPath = function(xp, root) {
  var i, idx, len, name, node, ref1, step, steps;
  steps = xp.substring(1).split("/");
  node = root;
  for (i = 0, len = steps.length; i < len; i++) {
    step = steps[i];
    ref1 = step.split("["), name = ref1[0], idx = ref1[1];
    idx = idx != null ? parseInt((idx != null ? idx.split("]") : void 0)[0]) : 1;
    node = findChild(node, name.toLowerCase(), idx);
  }
  return node;
};

module.exports = {
  nodeFromXPath: Util.nodeFromXPath,
  xpathFromNode: Util.xpathFromNode,
  getTextNodes: Util.getTextNodes,
  getFirstTextNodeNotBefore: Util.getFirstTextNodeNotBefore,
  getLastTextNodeUpTo: Util.getLastTextNodeUpTo
};


},{"./xpath":64,"jquery":"jquery"}],64:[function(require,module,exports){
var $, findChild, getNodeName, getNodePosition, simpleXPathJQuery, simpleXPathPure;

$ = require('jquery');

simpleXPathJQuery = function(relativeRoot) {
  var jq;
  jq = this.map(function() {
    var elem, idx, path, tagName;
    path = '';
    elem = this;
    while ((elem != null ? elem.nodeType : void 0) === Node.ELEMENT_NODE && elem !== relativeRoot) {
      tagName = elem.tagName.replace(":", "\\:");
      idx = $(elem.parentNode).children(tagName).index(elem) + 1;
      idx = "[" + idx + "]";
      path = "/" + elem.tagName.toLowerCase() + idx + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return jq.get();
};

simpleXPathPure = function(relativeRoot) {
  var getPathSegment, getPathTo, jq, rootNode;
  getPathSegment = function(node) {
    var name, pos;
    name = getNodeName(node);
    pos = getNodePosition(node);
    return name + "[" + pos + "]";
  };
  rootNode = relativeRoot;
  getPathTo = function(node) {
    var xpath;
    xpath = '';
    while (node !== rootNode) {
      if (node == null) {
        throw new Error("Called getPathTo on a node which was not a descendant of @rootNode. " + rootNode);
      }
      xpath = (getPathSegment(node)) + '/' + xpath;
      node = node.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  };
  jq = this.map(function() {
    var path;
    path = getPathTo(this);
    return path;
  });
  return jq.get();
};

findChild = function(node, type, index) {
  var child, children, found, i, len, name;
  if (!node.hasChildNodes()) {
    throw new Error("XPath error: node has no children!");
  }
  children = node.childNodes;
  found = 0;
  for (i = 0, len = children.length; i < len; i++) {
    child = children[i];
    name = getNodeName(child);
    if (name === type) {
      found += 1;
      if (found === index) {
        return child;
      }
    }
  }
  throw new Error("XPath error: wanted child not found.");
};

getNodeName = function(node) {
  var nodeName;
  nodeName = node.nodeName.toLowerCase();
  switch (nodeName) {
    case "#text":
      return "text()";
    case "#comment":
      return "comment()";
    case "#cdata-section":
      return "cdata-section()";
    default:
      return nodeName;
  }
};

getNodePosition = function(node) {
  var pos, tmp;
  pos = 0;
  tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos++;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
};

module.exports = {
  simpleXPathJQuery: simpleXPathJQuery,
  simpleXPathPure: simpleXPathPure
};


},{"jquery":"jquery"}],65:[function(require,module,exports){
'use strict';

var events = require('../shared/bridge-events');

var ANNOTATION_COUNT_ATTR = 'data-hypothesis-annotation-count';

/**
 * Update the elements in the container element with the count data attribute
 * with the new annotation count.
 *
 * @param {Element} rootEl - The DOM element which contains the elements that
 * display annotation count.
 */

function annotationCounts(rootEl, crossframe) {
  crossframe.on(events.PUBLIC_ANNOTATION_COUNT_CHANGED, updateAnnotationCountElems);

  function updateAnnotationCountElems(newCount) {
    var elems = rootEl.querySelectorAll('[' + ANNOTATION_COUNT_ATTR + ']');
    Array.from(elems).forEach(function (elem) {
      elem.textContent = newCount;
    });
  }
}

module.exports = annotationCounts;

},{"../shared/bridge-events":96}],66:[function(require,module,exports){
'use strict';

// AnnotationSync listens for messages from the sidebar app indicating that
// annotations have been added or removed and relays them to Guest.
//
// It also listens for events from Guest when new annotations are created or
// annotations successfully anchor and relays these to the sidebar app.

function AnnotationSync(bridge, options) {
  var self = this;

  this.bridge = bridge;

  if (!options.on) {
    throw new Error('options.on unspecified for AnnotationSync.');
  }

  if (!options.emit) {
    throw new Error('options.emit unspecified for AnnotationSync.');
  }

  this.cache = {};

  this._on = options.on;
  this._emit = options.emit;

  // Listen locally for interesting events
  Object.keys(this._eventListeners).forEach(function (eventName) {
    var listener = self._eventListeners[eventName];
    self._on(eventName, function (annotation) {
      listener.apply(self, [annotation]);
    });
  });

  // Register remotely invokable methods
  Object.keys(this._channelListeners).forEach(function (eventName) {
    self.bridge.on(eventName, function (data, callbackFunction) {
      var listener = self._channelListeners[eventName];
      listener.apply(self, [data, callbackFunction]);
    });
  });
}

// Cache of annotations which have crossed the bridge for fast, encapsulated
// association of annotations received in arguments to window-local copies.
AnnotationSync.prototype.cache = null;

AnnotationSync.prototype.sync = function (annotations) {
  annotations = function () {
    var i;
    var formattedAnnotations = [];

    for (i = 0; i < annotations.length; i++) {
      formattedAnnotations.push(this._format(annotations[i]));
    }
    return formattedAnnotations;
  }.call(this);
  this.bridge.call('sync', annotations, function (_this) {
    return function (err, annotations) {
      var i;
      var parsedAnnotations = [];
      annotations = annotations || [];

      for (i = 0; i < annotations.length; i++) {
        parsedAnnotations.push(_this._parse(annotations[i]));
      }
      return parsedAnnotations;
    };
  }(this));
  return this;
};

// Handlers for messages arriving through a channel
AnnotationSync.prototype._channelListeners = {
  'deleteAnnotation': function deleteAnnotation(body, cb) {
    var annotation = this._parse(body);
    delete this.cache[annotation.$tag];
    this._emit('annotationDeleted', annotation);
    cb(null, this._format(annotation));
  },
  'loadAnnotations': function loadAnnotations(bodies, cb) {
    var annotations = function () {
      var i;
      var parsedAnnotations = [];

      for (i = 0; i < bodies.length; i++) {
        parsedAnnotations.push(this._parse(bodies[i]));
      }
      return parsedAnnotations;
    }.call(this);
    this._emit('annotationsLoaded', annotations);
    return cb(null, annotations);
  }
};

// Handlers for events coming from this frame, to send them across the channel
AnnotationSync.prototype._eventListeners = {
  'beforeAnnotationCreated': function beforeAnnotationCreated(annotation) {
    if (annotation.$tag) {
      return undefined;
    }
    return this._mkCallRemotelyAndParseResults('beforeCreateAnnotation')(annotation);
  }
};

AnnotationSync.prototype._mkCallRemotelyAndParseResults = function (method, callBack) {
  return function (_this) {
    return function (annotation) {
      // Wrap the callback function to first parse returned items
      var wrappedCallback = function wrappedCallback(failure, results) {
        if (failure === null) {
          _this._parseResults(results);
        }
        if (typeof callBack === 'function') {
          callBack(failure, results);
        }
      };
      // Call the remote method
      _this.bridge.call(method, _this._format(annotation), wrappedCallback);
    };
  }(this);
};

// Parse returned message bodies to update cache with any changes made remotely
AnnotationSync.prototype._parseResults = function (results) {
  var bodies;
  var body;
  var i;
  var j;

  for (i = 0; i < results.length; i++) {
    bodies = results[i];
    bodies = [].concat(bodies);
    for (j = 0; j < bodies.length; j++) {
      body = bodies[j];
      if (body !== null) {
        this._parse(body);
      }
    }
  }
};

// Assign a non-enumerable tag to objects which cross the bridge.
// This tag is used to identify the objects between message.
AnnotationSync.prototype._tag = function (ann, tag) {
  if (ann.$tag) {
    return ann;
  }
  tag = tag || window.btoa(Math.random());
  Object.defineProperty(ann, '$tag', {
    value: tag
  });
  this.cache[tag] = ann;
  return ann;
};

// Parse a message body from a RPC call with the provided parser.
AnnotationSync.prototype._parse = function (body) {
  var merged = Object.assign(this.cache[body.tag] || {}, body.msg);
  return this._tag(merged, body.tag);
};

// Format an annotation into an RPC message body with the provided formatter.
AnnotationSync.prototype._format = function (ann) {
  this._tag(ann);
  return {
    tag: ann.$tag,
    msg: ann
  };
};

module.exports = AnnotationSync;

},{}],67:[function(require,module,exports){
'use strict';

/**
 * Return an object containing config settings from window.hypothesisConfig().
 *
 * Return an object containing config settings returned by the
 * window.hypothesisConfig() function provided by the host page:
 *
 *   {
 *     fooSetting: 'fooValue',
 *     barSetting: 'barValue',
 *     ...
 *   }
 *
 * If there's no window.hypothesisConfig() function then return {}.
 *
 * @param {Window} window_ - The window to search for a hypothesisConfig() function
 * @return {Object} - Any config settings returned by hypothesisConfig()
 *
 */

function configFuncSettingsFrom(window_) {
  if (!window_.hasOwnProperty('hypothesisConfig')) {
    return {};
  }

  if (typeof window_.hypothesisConfig !== 'function') {
    var docs = 'https://h.readthedocs.io/projects/client/en/latest/publishers/config/#window.hypothesisConfig';
    console.warn('hypothesisConfig must be a function, see: ' + docs);
    return {};
  }

  return window_.hypothesisConfig();
}

module.exports = configFuncSettingsFrom;

},{}],68:[function(require,module,exports){
'use strict';

var settingsFrom = require('./settings');

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(window_) {
  var settings = settingsFrom(window_);
  return {
    annotations: settings.annotations,
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: settings.hostPageSetting('assetRoot', { allowInBrowserExt: true }),
    branding: settings.hostPageSetting('branding'),
    // URL of the client's boot script. Used when injecting the client into
    // child iframes.
    clientUrl: settings.clientUrl,
    enableExperimentalNewNoteButton: settings.hostPageSetting('enableExperimentalNewNoteButton'),
    theme: settings.hostPageSetting('theme'),
    usernameUrl: settings.hostPageSetting('usernameUrl'),
    onLayoutChange: settings.hostPageSetting('onLayoutChange'),
    openSidebar: settings.hostPageSetting('openSidebar', { allowInBrowserExt: true }),
    query: settings.query,
    services: settings.hostPageSetting('services'),
    showHighlights: settings.showHighlights,
    sidebarAppUrl: settings.sidebarAppUrl,
    // Subframe identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: settings.hostPageSetting('subFrameIdentifier', { allowInBrowserExt: true }),
    // When onElementClick is false, clicking (or tabbing around on mobile)
    // outside of the elements on the guest page doesn't close the sidebar
    onElementClick: settings.hostPageSetting('onElementClick', { allowInBrowserExt: true }),
    isHighlightBtnVisible: settings.hostPageSetting('isHighlightBtnVisible', { allowInBrowserExt: true }),
    // The locale is going to come from cookies, this is a temporary solution.
    locale: settings.hostPageSetting('locale', { allowInBrowserExt: true })
  };
}

module.exports = configFrom;

},{"./settings":70}],69:[function(require,module,exports){
'use strict';

/**
 * Return true if the client is from a browser extension.
 *
 * @returns {boolean} true if this instance of the Hypothesis client is one
 *   distributed in a browser extension, false if it's one embedded in a
 *   website.
 *
 */

function isBrowserExtension(app) {
  return !(app.startsWith('http://') || app.startsWith('https://'));
}

module.exports = isBrowserExtension;

},{}],70:[function(require,module,exports){
'use strict';

var configFuncSettingsFrom = require('./config-func-settings-from');
var isBrowserExtension = require('./is-browser-extension');
var sharedSettings = require('../../shared/settings');

function settingsFrom(window_) {

  var jsonConfigs = sharedSettings.jsonConfigsFrom(window_.document);
  var configFuncSettings = configFuncSettingsFrom(window_);

  /**
   * Return the href URL of the first annotator sidebar link in the given document.
   *
   * Return the value of the href attribute of the first
   * `<link type="application/annotator+html" rel="sidebar">` element in the given document.
   *
   * This URL is used as the src of the sidebar's iframe.
   *
   * @return {string} - The URL to use for the sidebar's iframe.
   *
   * @throws {Error} - If there's no annotator link or the first annotator has
   *   no href.
   *
   */
  function sidebarAppUrl() {
    var link = window_.document.querySelector('link[type="application/annotator+html"][rel="sidebar"]');

    if (!link) {
      throw new Error('No application/annotator+html (rel="sidebar") link in the document');
    }

    if (!link.href) {
      throw new Error('application/annotator+html (rel="sidebar") link has no href');
    }

    return link.href;
  }

  /**
   * Return the href URL of the first annotator client link in the given document.
   *
   * Return the value of the href attribute of the first
   * `<link type="application/annotator+html" rel="hypothesis-client">` element in the given document.
   *
   * This URL is used to identify where the client is from and what url should be
   *    used inside of subframes
   *
   * @return {string} - The URL that the client is hosted from
   *
   * @throws {Error} - If there's no annotator link or the first annotator has
   *   no href.
   *
   */
  function clientUrl() {
    var link = window_.document.querySelector('link[type="application/annotator+javascript"][rel="hypothesis-client"]');

    if (!link) {
      throw new Error('No application/annotator+javascript (rel="hypothesis-client") link in the document');
    }

    if (!link.href) {
      throw new Error('application/annotator+javascript (rel="hypothesis-client") link has no href');
    }

    return link.href;
  }

  /**
   * Return the `#annotations:*` ID from the given URL's fragment.
   *
   * If the URL contains a `#annotations:<ANNOTATION_ID>` fragment then return
   * the annotation ID extracted from the fragment. Otherwise return `null`.
   *
   * @return {string|null} - The extracted ID, or null.
   */
  function annotations() {

    /** Return the annotations from the URL, or null. */
    function annotationsFromURL() {
      // Annotation IDs are url-safe-base64 identifiers
      // See https://tools.ietf.org/html/rfc4648#page-7
      var annotFragmentMatch = window_.location.href.match(/#annotations:([A-Za-z0-9_-]+)$/);
      if (annotFragmentMatch) {
        return annotFragmentMatch[1];
      }
      return null;
    }

    return jsonConfigs.annotations || annotationsFromURL();
  }

  function showHighlights() {
    var showHighlights_ = hostPageSetting('showHighlights');

    if (showHighlights_ === null) {
      showHighlights_ = 'always'; // The default value is 'always'.
    }

    // Convert legacy keys/values to corresponding current configuration.
    if (typeof showHighlights_ === 'boolean') {
      return showHighlights_ ? 'always' : 'never';
    }

    return showHighlights_;
  }

  /**
   * Return the config.query setting from the host page or from the URL.
   *
   * If the host page contains a js-hypothesis-config script containing a
   * query setting then return that.
   *
   * Otherwise if the host page's URL has a `#annotations:query:*` (or
   * `#annotations:q:*`) fragment then return the query value from that.
   *
   * Otherwise return null.
   *
   * @return {string|null} - The config.query setting, or null.
   */
  function query() {

    /** Return the query from the URL, or null. */
    function queryFromURL() {
      var queryFragmentMatch = window_.location.href.match(/#annotations:(query|q):(.+)$/i);
      if (queryFragmentMatch) {
        try {
          return decodeURIComponent(queryFragmentMatch[2]);
        } catch (err) {
          // URI Error should return the page unfiltered.
        }
      }
      return null;
    }

    return jsonConfigs.query || queryFromURL();
  }

  function hostPageSetting(name) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var allowInBrowserExt = options.allowInBrowserExt || false;
    var hasDefaultValue = typeof options.defaultValue !== 'undefined';

    if (!allowInBrowserExt && isBrowserExtension(sidebarAppUrl())) {
      return hasDefaultValue ? options.defaultValue : null;
    }

    if (configFuncSettings.hasOwnProperty(name)) {
      return configFuncSettings[name];
    }

    if (jsonConfigs.hasOwnProperty(name)) {
      return jsonConfigs[name];
    }

    if (hasDefaultValue) {
      return options.defaultValue;
    }

    return null;
  }

  return {
    get annotations() {
      return annotations();
    },
    get clientUrl() {
      return clientUrl();
    },
    get showHighlights() {
      return showHighlights();
    },
    get sidebarAppUrl() {
      return sidebarAppUrl();
    },
    get query() {
      return query();
    },
    hostPageSetting: hostPageSetting
  };
}

module.exports = settingsFrom;

},{"../../shared/settings":101,"./config-func-settings-from":67,"./is-browser-extension":69}],71:[function(require,module,exports){
var $, Delegator,
  slice = [].slice,
  hasProp = {}.hasOwnProperty;

$ = require('jquery');


/*
** Adapted from:
** https://github.com/openannotation/annotator/blob/v1.2.x/src/class.coffee
**
** Annotator v1.2.10
** https://github.com/openannotation/annotator
**
** Copyright 2015, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/openannotation/annotator/blob/master/LICENSE
 */

module.exports = Delegator = (function() {
  Delegator.prototype.events = {};

  Delegator.prototype.options = {};

  Delegator.prototype.element = null;

  function Delegator(element, config) {
    this.options = $.extend(true, {}, this.options, config);
    this.element = $(element);
    this._closures = {};
    this.on = this.subscribe;
    this.addEvents();
  }

  Delegator.prototype.destroy = function() {
    return this.removeEvents();
  };

  Delegator.prototype.addEvents = function() {
    var event, i, len, ref, results;
    ref = Delegator._parseEvents(this.events);
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      event = ref[i];
      results.push(this._addEvent(event.selector, event.event, event.functionName));
    }
    return results;
  };

  Delegator.prototype.removeEvents = function() {
    var event, i, len, ref, results;
    ref = Delegator._parseEvents(this.events);
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      event = ref[i];
      results.push(this._removeEvent(event.selector, event.event, event.functionName));
    }
    return results;
  };

  Delegator.prototype._addEvent = function(selector, event, functionName) {
    var closure;
    closure = (function(_this) {
      return function() {
        return _this[functionName].apply(_this, arguments);
      };
    })(this);
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.subscribe(event, closure);
    } else {
      this.element.delegate(selector, event, closure);
    }
    this._closures[selector + "/" + event + "/" + functionName] = closure;
    return this;
  };

  Delegator.prototype._removeEvent = function(selector, event, functionName) {
    var closure;
    closure = this._closures[selector + "/" + event + "/" + functionName];
    if (selector === '' && Delegator._isCustomEvent(event)) {
      this.unsubscribe(event, closure);
    } else {
      this.element.undelegate(selector, event, closure);
    }
    delete this._closures[selector + "/" + event + "/" + functionName];
    return this;
  };

  Delegator.prototype.publish = function() {
    this.element.triggerHandler.apply(this.element, arguments);
    return this;
  };

  Delegator.prototype.subscribe = function(event, callback) {
    var closure;
    closure = function() {
      return callback.apply(this, [].slice.call(arguments, 1));
    };
    closure.guid = callback.guid = ($.guid += 1);
    this.element.bind(event, closure);
    return this;
  };

  Delegator.prototype.unsubscribe = function() {
    this.element.unbind.apply(this.element, arguments);
    return this;
  };

  return Delegator;

})();

Delegator._parseEvents = function(eventsObj) {
  var event, events, functionName, i, ref, sel, selector;
  events = [];
  for (sel in eventsObj) {
    functionName = eventsObj[sel];
    ref = sel.split(' '), selector = 2 <= ref.length ? slice.call(ref, 0, i = ref.length - 1) : (i = 0, []), event = ref[i++];
    events.push({
      selector: selector.join(' '),
      event: event,
      functionName: functionName
    });
  }
  return events;
};

Delegator.natives = (function() {
  var key, specials, val;
  specials = (function() {
    var ref, results;
    ref = $.event.special;
    results = [];
    for (key in ref) {
      if (!hasProp.call(ref, key)) continue;
      val = ref[key];
      results.push(key);
    }
    return results;
  })();
  return "blur focus focusin focusout load resize scroll unload click dblclick\nmousedown mouseup mousemove mouseover mouseout mouseenter mouseleave\nchange select submit keydown keypress keyup error".split(/[^a-z]+/).concat(specials);
})();

Delegator._isCustomEvent = function(event) {
  event = event.split('.')[0];
  return $.inArray(event, Delegator.natives) === -1;
};


},{"jquery":"jquery"}],72:[function(require,module,exports){
'use strict';

var events = require('../shared/bridge-events');

var _features = {};

var _set = function _set(features) {
  _features = features || {};
};

module.exports = {

  init: function init(crossframe) {
    crossframe.on(events.FEATURE_FLAGS_UPDATED, _set);
  },

  reset: function reset() {
    _set({});
  },

  flagEnabled: function flagEnabled(flag) {
    if (!(flag in _features)) {
      console.warn('looked up unknown feature', flag);
      return false;
    }
    return _features[flag];
  }

};

},{"../shared/bridge-events":96}],73:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FrameUtil = require('./util/frame-util');
var debounce = require('lodash.debounce');

// Find difference of two arrays
var difference = function difference(arrayA, arrayB) {
  return arrayA.filter(function (x) {
    return !arrayB.includes(x);
  });
};

var DEBOUNCE_WAIT = 40;

var FrameObserver = function () {
  function FrameObserver(target) {
    var _this = this;

    _classCallCheck(this, FrameObserver);

    this._target = target;
    this._handledFrames = [];

    this._mutationObserver = new MutationObserver(debounce(function () {
      _this._discoverFrames();
    }, DEBOUNCE_WAIT));
  }

  _createClass(FrameObserver, [{
    key: 'observe',
    value: function observe(onFrameAddedCallback, onFrameRemovedCallback) {
      this._onFrameAdded = onFrameAddedCallback;
      this._onFrameRemoved = onFrameRemovedCallback;

      this._discoverFrames();
      this._mutationObserver.observe(this._target, {
        childList: true,
        subtree: true
      });
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      this._mutationObserver.disconnect();
    }
  }, {
    key: '_addFrame',
    value: function _addFrame(frame) {
      var _this2 = this;

      if (FrameUtil.isAccessible(frame)) {
        FrameUtil.isDocumentReady(frame, function () {
          frame.contentWindow.addEventListener('unload', function () {
            _this2._removeFrame(frame);
          });
          _this2._handledFrames.push(frame);
          _this2._onFrameAdded(frame);
        });
      } else {
        // Could warn here that frame was not cross origin accessible
      }
    }
  }, {
    key: '_removeFrame',
    value: function _removeFrame(frame) {
      this._onFrameRemoved(frame);

      // Remove the frame from our list
      this._handledFrames = this._handledFrames.filter(function (x) {
        return x !== frame;
      });
    }
  }, {
    key: '_discoverFrames',
    value: function _discoverFrames() {
      var frames = FrameUtil.findFrames(this._target);

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = frames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var frame = _step.value;

          if (!this._handledFrames.includes(frame)) {
            this._addFrame(frame);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = difference(this._handledFrames, frames)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _frame = _step2.value;

          this._removeFrame(_frame);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }]);

  return FrameObserver;
}();

FrameObserver.DEBOUNCE_WAIT = DEBOUNCE_WAIT;

module.exports = FrameObserver;

},{"./util/frame-util":93,"lodash.debounce":44}],74:[function(require,module,exports){
var $, CustomEvent, Delegator, Guest, adder, animationPromise, baseURI, extend, getProperClassName, highlighter, normalizeURI, polyglot, raf, rangeUtil, scrollIntoView, selections, xpathRange,
  extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

baseURI = require('document-base-uri');

extend = require('extend');

raf = require('raf');

scrollIntoView = require('scroll-into-view');

CustomEvent = require('custom-event');

Delegator = require('./delegator');

$ = require('jquery');

adder = require('./adder');

highlighter = require('./highlighter');

rangeUtil = require('./range-util');

selections = require('./selections');

xpathRange = require('./anchoring/range');

polyglot = require('../shared/polyglot');

getProperClassName = require('../shared/util/get-proper-classname');

animationPromise = function(fn) {
  return new Promise(function(resolve, reject) {
    return raf(function() {
      var error;
      try {
        return resolve(fn());
      } catch (error1) {
        error = error1;
        return reject(error);
      }
    });
  });
};

normalizeURI = function(uri, baseURI) {
  var url;
  url = new URL(uri, baseURI);
  return url.toString().replace(/#.*/, '');
};

module.exports = Guest = (function(superClass) {
  var SHOW_HIGHLIGHTS_CLASS;

  extend1(Guest, superClass);

  SHOW_HIGHLIGHTS_CLASS = 'annotator-highlights-always-on';

  Guest.prototype.events = {
    ".annotator-hl click": "onHighlightClick",
    ".annotator-hl mouseover": "onHighlightMouseover",
    ".annotator-hl mouseout": "onHighlightMouseout",
    "click": "onElementClick",
    "touchstart": "onElementTouchStart"
  };

  Guest.prototype.options = {
    Document: {},
    TextSelection: {}
  };

  Guest.prototype.anchoring = require('./anchoring/html');

  Guest.prototype.plugins = null;

  Guest.prototype.anchors = null;

  Guest.prototype.visibleHighlights = false;

  Guest.prototype.frameIdentifier = null;

  Guest.prototype.enableClick = false;

  Guest.prototype.html = {
    adder: '<hypothesis-adder></hypothesis-adder>'
  };

  function Guest(element, config) {
    var cfOptions, name, opts, ref, self;
    Guest.__super__.constructor.apply(this, arguments);
    this.adder = $(this.html.adder).appendTo(this.element).hide();
    self = this;
    this.adderCtrl = new adder.Adder(this.adder[0], {
      onAnnotate: function() {
        self.createAnnotation();
        return document.getSelection().removeAllRanges();
      },
      onHighlight: function() {
        self.setVisibleHighlights(true);
        self.createHighlight();
        return document.getSelection().removeAllRanges();
      },
      isHighlightBtnVisible: function() {
        return config.isHighlightBtnVisible;
      },
      traslatedBtnStrings: function() {
        return {
          'AnnotateBtn': polyglot().t('Add Comment'),
          'HighlightBtn': polyglot().t('Highlight')
        };
      }
    });
    this.selections = selections(document).subscribe({
      next: function(range) {
        if (range) {
          return self._onSelection(range);
        } else {
          return self._onClearSelection();
        }
      }
    });
    this.plugins = {};
    this.anchors = [];
    this.frameIdentifier = config.subFrameIdentifier || null;
    this.enableClick = config.onElementClick || false;
    cfOptions = {
      config: config,
      on: (function(_this) {
        return function(event, handler) {
          return _this.subscribe(event, handler);
        };
      })(this),
      emit: (function(_this) {
        return function() {
          var args, event;
          event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
          return _this.publish(event, args);
        };
      })(this)
    };
    this.addPlugin('CrossFrame', cfOptions);
    this.crossframe = this.plugins.CrossFrame;
    this.crossframe.onConnect((function(_this) {
      return function() {
        return _this._setupInitialState(config);
      };
    })(this));
    this._connectAnnotationSync(this.crossframe);
    this._connectAnnotationUISync(this.crossframe, config);
    ref = this.options;
    for (name in ref) {
      if (!hasProp.call(ref, name)) continue;
      opts = ref[name];
      if (!this.plugins[name] && this.options.pluginClasses[name]) {
        this.addPlugin(name, opts);
      }
    }
  }

  Guest.prototype.addPlugin = function(name, options) {
    var base, klass;
    if (this.plugins[name]) {
      console.error("You cannot have more than one instance of any plugin.");
    } else {
      klass = this.options.pluginClasses[name];
      if (typeof klass === 'function') {
        this.plugins[name] = new klass(this.element[0], options);
        this.plugins[name].annotator = this;
        if (typeof (base = this.plugins[name]).pluginInit === "function") {
          base.pluginInit();
        }
      } else {
        console.error("Could not load " + name + " plugin. Have you included the appropriate <script> tag?");
      }
    }
    return this;
  };

  Guest.prototype.getDocumentInfo = function() {
    var metadataPromise, uriPromise;
    if (this.plugins.PDF != null) {
      metadataPromise = Promise.resolve(this.plugins.PDF.getMetadata());
      uriPromise = Promise.resolve(this.plugins.PDF.uri());
    } else if (this.plugins.Document != null) {
      uriPromise = Promise.resolve(this.plugins.Document.uri());
      metadataPromise = Promise.resolve(this.plugins.Document.metadata);
    } else {
      uriPromise = Promise.reject();
      metadataPromise = Promise.reject();
    }
    uriPromise = uriPromise["catch"](function() {
      return decodeURIComponent(window.location.href);
    });
    metadataPromise = metadataPromise["catch"](function() {
      return {
        title: document.title,
        link: [
          {
            href: decodeURIComponent(window.location.href)
          }
        ]
      };
    });
    return Promise.all([metadataPromise, uriPromise]).then((function(_this) {
      return function(arg) {
        var href, metadata;
        metadata = arg[0], href = arg[1];
        return {
          uri: normalizeURI(href, baseURI),
          metadata: metadata,
          frameIdentifier: _this.frameIdentifier
        };
      };
    })(this));
  };

  Guest.prototype._setupInitialState = function(config) {
    this.publish('panelReady');
    return this.setVisibleHighlights(false);
  };

  Guest.prototype._connectAnnotationSync = function(crossframe) {
    this.subscribe('annotationDeleted', (function(_this) {
      return function(annotation) {
        return _this.detach(annotation);
      };
    })(this));
    return this.subscribe('annotationsLoaded', (function(_this) {
      return function(annotations) {
        var annotation, i, len, results;
        results = [];
        for (i = 0, len = annotations.length; i < len; i++) {
          annotation = annotations[i];
          results.push(_this.anchor(annotation));
        }
        return results;
      };
    })(this));
  };

  Guest.prototype._connectAnnotationUISync = function(crossframe, config) {
    crossframe.on('focusAnnotations', (function(_this) {
      return function(tags, feedback_user, user_id, type) {
        var anchor, className, hoverClassNames, i, len, ref, ref1, results, selectedClassNames, toggle;
        if (tags == null) {
          tags = [];
        }
        className = getProperClassName(feedback_user, user_id, type);
        selectedClassNames = 'annotator-hl-selected-public annotator-hl-selected-yours';
        hoverClassNames = 'annotator-hl-hover-public annotator-hl-hover-yours';
        ref = _this.anchors;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          anchor = ref[i];
          if (!(anchor.highlights != null)) {
            continue;
          }
          toggle = (ref1 = anchor.annotation.$tag, indexOf.call(tags, ref1) >= 0);
          if (toggle) {
            if (!$(anchor.highlights).hasClass(selectedClassNames)) {
              results.push($(anchor.highlights).toggleClass(className));
            } else {
              results.push(void 0);
            }
          } else {
            results.push($(anchor.highlights).removeClass(hoverClassNames));
          }
        }
        return results;
      };
    })(this));
    crossframe.on('scrollToAnnotation', (function(_this) {
      return function(tag, feedback_user, user_id, type) {
        var anchor, className, defaultNotPrevented, event, i, len, ref, results, selectedClassNames;
        className = getProperClassName(feedback_user, user_id, type);
        selectedClassNames = 'annotator-hl-selected-public annotator-hl-selected-yours';
        ref = _this.anchors;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          anchor = ref[i];
          if (anchor.highlights != null) {
            if (anchor.annotation.$tag === tag) {
              $(anchor.highlights).toggleClass(className);
              event = new CustomEvent('scrolltorange', {
                bubbles: true,
                cancelable: true,
                detail: anchor.range
              });
              defaultNotPrevented = _this.element[0].dispatchEvent(event);
              if (defaultNotPrevented) {
                results.push(scrollIntoView(anchor.highlights[0]));
              } else {
                results.push(void 0);
              }
            } else {
              results.push($(anchor.highlights).removeClass(selectedClassNames));
            }
          }
        }
        return results;
      };
    })(this));
    crossframe.on('getDocumentInfo', (function(_this) {
      return function(cb) {
        return _this.getDocumentInfo().then(function(info) {
          return cb(null, info);
        })["catch"](function(reason) {
          return cb(reason);
        });
      };
    })(this));
    return crossframe.on('setVisibleHighlights', (function(_this) {
      return function(state) {
        _this.visibleHighlights = !_this.visibleHighlights;
        return _this.setVisibleHighlights(_this.visibleHighlights);
      };
    })(this));
  };

  Guest.prototype.destroy = function() {
    var name, plugin, ref;
    $('#annotator-dynamic-style').remove();
    this.selections.unsubscribe();
    this.adder.remove();
    this.element.find('.annotator-hl').each(function() {
      $(this).contents().insertBefore(this);
      return $(this).remove();
    });
    this.element.data('annotator', null);
    ref = this.plugins;
    for (name in ref) {
      plugin = ref[name];
      this.plugins[name].destroy();
    }
    return Guest.__super__.destroy.apply(this, arguments);
  };

  Guest.prototype.anchor = function(annotation, newAnnotation) {
    var anchor, anchoredTargets, anchors, deadHighlights, highlight, i, j, len, len1, locate, ref, ref1, ref2, root, self, sync, target;
    self = this;
    root = this.element[0];
    anchors = [];
    anchoredTargets = [];
    deadHighlights = [];
    if (annotation.target == null) {
      annotation.target = [];
    }
    locate = function(target) {
      var options, ref;
      if (!((ref = target.selector) != null ? ref : []).some((function(_this) {
        return function(s) {
          return s.type === 'TextQuoteSelector';
        };
      })(this))) {
        return Promise.resolve({
          annotation: annotation,
          target: target
        });
      }
      options = {
        cache: self.anchoringCache,
        ignoreSelector: '[class^="annotator-"]'
      };
      return self.anchoring.anchor(root, target.selector, options).then(function(range) {
        return {
          annotation: annotation,
          target: target,
          range: range
        };
      })["catch"](function() {
        return {
          annotation: annotation,
          target: target
        };
      });
    };
    highlight = function(anchor) {
      if (anchor.range == null) {
        return anchor;
      }
      return animationPromise(function() {
        var highlights, normedRange, range;
        range = xpathRange.sniff(anchor.range);
        normedRange = range.normalize(root);
        highlights = highlighter.highlightRange(normedRange, newAnnotation);
        $(highlights).data('annotation', anchor.annotation);
        anchor.highlights = highlights;
        return anchor;
      });
    };
    sync = function(anchors) {
      var anchor, hasAnchorableTargets, hasAnchoredTargets, i, len, ref, ref1;
      hasAnchorableTargets = false;
      hasAnchoredTargets = false;
      for (i = 0, len = anchors.length; i < len; i++) {
        anchor = anchors[i];
        if (anchor.target.selector != null) {
          hasAnchorableTargets = true;
          if (anchor.range != null) {
            hasAnchoredTargets = true;
            break;
          }
        }
      }
      annotation.$orphan = hasAnchorableTargets && !hasAnchoredTargets;
      self.anchors = self.anchors.concat(anchors);
      if ((ref = self.plugins.BucketBar) != null) {
        ref.update();
      }
      if ((ref1 = self.plugins.CrossFrame) != null) {
        ref1.sync([annotation]);
      }
      return anchors;
    };
    ref = self.anchors.splice(0, self.anchors.length);
    for (i = 0, len = ref.length; i < len; i++) {
      anchor = ref[i];
      if (anchor.annotation === annotation) {
        if ((anchor.range != null) && (ref1 = anchor.target, indexOf.call(annotation.target, ref1) >= 0)) {
          anchors.push(anchor);
          anchoredTargets.push(anchor.target);
        } else if (anchor.highlights != null) {
          deadHighlights = deadHighlights.concat(anchor.highlights);
          delete anchor.highlights;
          delete anchor.range;
        }
      } else {
        self.anchors.push(anchor);
      }
    }
    raf(function() {
      return highlighter.removeHighlights(deadHighlights);
    });
    ref2 = annotation.target;
    for (j = 0, len1 = ref2.length; j < len1; j++) {
      target = ref2[j];
      if (!(indexOf.call(anchoredTargets, target) < 0)) {
        continue;
      }
      anchor = locate(target).then(highlight);
      anchors.push(anchor);
    }
    return Promise.all(anchors).then(sync);
  };

  Guest.prototype.detach = function(annotation) {
    var anchor, anchors, i, len, ref, ref1, ref2, targets, unhighlight;
    anchors = [];
    targets = [];
    unhighlight = [];
    ref = this.anchors;
    for (i = 0, len = ref.length; i < len; i++) {
      anchor = ref[i];
      if (anchor.annotation === annotation) {
        unhighlight.push((ref1 = anchor.highlights) != null ? ref1 : []);
      } else {
        anchors.push(anchor);
      }
    }
    this.anchors = anchors;
    unhighlight = (ref2 = Array.prototype).concat.apply(ref2, unhighlight);
    return raf((function(_this) {
      return function() {
        var ref3;
        highlighter.removeHighlights(unhighlight);
        return (ref3 = _this.plugins.BucketBar) != null ? ref3.update() : void 0;
      };
    })(this));
  };

  Guest.prototype.createAnnotation = function(annotation) {
    var getSelectors, info, metadata, newAnnotation, ranges, ref, ref1, root, selectors, self, setDocumentInfo, setTargets, targets;
    if (annotation == null) {
      annotation = {};
    }
    self = this;
    root = this.element[0];
    newAnnotation = true;
    ranges = (ref = this.selectedRanges) != null ? ref : [];
    this.selectedRanges = null;
    getSelectors = function(range) {
      var options;
      options = {
        cache: self.anchoringCache,
        ignoreSelector: '[class^="annotator-"]'
      };
      return self.anchoring.describe(root, range, options);
    };
    setDocumentInfo = function(info) {
      annotation.document = info.metadata;
      return annotation.uri = info.uri;
    };
    setTargets = function(arg) {
      var info, selector, selectors, source;
      info = arg[0], selectors = arg[1];
      source = info.uri;
      return annotation.target = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = selectors.length; i < len; i++) {
          selector = selectors[i];
          results.push({
            source: source,
            selector: selector
          });
        }
        return results;
      })();
    };
    info = this.getDocumentInfo();
    selectors = Promise.all(ranges.map(getSelectors));
    metadata = info.then(setDocumentInfo);
    targets = Promise.all([info, selectors]).then(setTargets);
    targets.then(function() {
      return self.publish('beforeAnnotationCreated', [annotation]);
    });
    targets.then(function() {
      return self.anchor(annotation, newAnnotation);
    });
    if (!annotation.$highlight) {
      if ((ref1 = this.crossframe) != null) {
        ref1.call('showSidebar');
      }
    }
    return annotation;
  };

  Guest.prototype.createHighlight = function() {
    return this.createAnnotation({
      $highlight: true
    });
  };

  Guest.prototype.createComment = function() {
    var annotation, prepare, self;
    annotation = {};
    self = this;
    prepare = function(info) {
      annotation.document = info.metadata;
      annotation.uri = info.uri;
      return annotation.target = [
        {
          source: info.uri
        }
      ];
    };
    this.getDocumentInfo().then(prepare).then(function() {
      return self.publish('beforeAnnotationCreated', [annotation]);
    });
    return annotation;
  };

  Guest.prototype.deleteAnnotation = function(annotation) {
    var h, i, len, ref;
    if (annotation.highlights != null) {
      ref = annotation.highlights;
      for (i = 0, len = ref.length; i < len; i++) {
        h = ref[i];
        if (h.parentNode != null) {
          $(h).replaceWith(h.childNodes);
        }
      }
    }
    this.publish('annotationDeleted', [annotation]);
    return annotation;
  };

  Guest.prototype.showAnnotations = function(annotations) {
    var a, ref, ref1, tags;
    tags = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = annotations.length; i < len; i++) {
        a = annotations[i];
        results.push(a.$tag);
      }
      return results;
    })();
    if ((ref = this.crossframe) != null) {
      ref.call('showAnnotations', tags);
    }
    return (ref1 = this.crossframe) != null ? ref1.call('showSidebar') : void 0;
  };

  Guest.prototype.toggleAnnotationSelection = function(annotations) {
    var a, ref, tags;
    tags = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = annotations.length; i < len; i++) {
        a = annotations[i];
        results.push(a.$tag);
      }
      return results;
    })();
    return (ref = this.crossframe) != null ? ref.call('toggleAnnotationSelection', tags) : void 0;
  };

  Guest.prototype.updateAnnotations = function(annotations) {
    var a, ref, tags;
    tags = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = annotations.length; i < len; i++) {
        a = annotations[i];
        results.push(a.$tag);
      }
      return results;
    })();
    return (ref = this.crossframe) != null ? ref.call('updateAnnotations', tags) : void 0;
  };

  Guest.prototype.focusAnnotations = function(annotations) {
    var a, ref, tags;
    tags = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = annotations.length; i < len; i++) {
        a = annotations[i];
        results.push(a.$tag);
      }
      return results;
    })();
    return (ref = this.crossframe) != null ? ref.call('focusAnnotations', tags) : void 0;
  };

  Guest.prototype._onSelection = function(range) {
    var arrowDirection, focusRect, isBackwards, left, ref, selection, top;
    selection = document.getSelection();
    isBackwards = rangeUtil.isSelectionBackwards(selection);
    focusRect = rangeUtil.selectionFocusRect(selection);
    if (!focusRect) {
      this._onClearSelection();
      return;
    }
    this.selectedRanges = [range];
    $('.annotator-toolbar .h-icon-note').attr('title', 'New Annotation').removeClass('h-icon-note').addClass('h-icon-annotate');
    ref = this.adderCtrl.target(focusRect, isBackwards), left = ref.left, top = ref.top, arrowDirection = ref.arrowDirection;
    return this.adderCtrl.showAt(left, top, arrowDirection);
  };

  Guest.prototype._onClearSelection = function() {
    this.adderCtrl.hide();
    this.selectedRanges = [];
    return $('.annotator-toolbar .h-icon-annotate').attr('title', 'New Page Note').removeClass('h-icon-annotate').addClass('h-icon-note');
  };

  Guest.prototype.selectAnnotations = function(annotations, toggle) {
    if (toggle) {
      return this.toggleAnnotationSelection(annotations);
    } else {
      return this.showAnnotations(annotations);
    }
  };

  Guest.prototype.onElementClick = function(event) {
    var ref, ref1;
    if (this.enableClick && !((ref = this.selectedTargets) != null ? ref.length : void 0)) {
      return (ref1 = this.crossframe) != null ? ref1.call('hideSidebar') : void 0;
    }
  };

  Guest.prototype.onElementTouchStart = function(event) {
    var ref, ref1;
    if (this.enableClick && !((ref = this.selectedTargets) != null ? ref.length : void 0)) {
      return (ref1 = this.crossframe) != null ? ref1.call('hideSidebar') : void 0;
    }
  };

  Guest.prototype.onHighlightMouseover = function(event) {
    var annotation, annotations;
    if (!this.visibleHighlights) {
      return;
    }
    annotation = $(event.currentTarget).data('annotation');
    annotations = event.annotations != null ? event.annotations : event.annotations = [];
    annotations.push(annotation);
    if (event.target === event.currentTarget) {
      return setTimeout((function(_this) {
        return function() {
          return _this.focusAnnotations(annotations);
        };
      })(this));
    }
  };

  Guest.prototype.onHighlightMouseout = function(event) {
    if (!this.visibleHighlights) {
      return;
    }
    return this.focusAnnotations([]);
  };

  Guest.prototype.onHighlightClick = function(event) {
    var annotation, annotations, xor;
    if (!this.visibleHighlights) {
      return;
    }
    annotation = $(event.currentTarget).data('annotation');
    annotations = event.annotations != null ? event.annotations : event.annotations = [];
    annotations.push(annotation);
    if (event.target === event.currentTarget) {
      xor = event.metaKey || event.ctrlKey;
      return setTimeout((function(_this) {
        return function() {
          return _this.selectAnnotations(annotations, xor);
        };
      })(this));
    }
  };

  Guest.prototype.setVisibleHighlights = function(shouldShowHighlights) {
    return this.toggleHighlightClass(shouldShowHighlights);
  };

  Guest.prototype.toggleHighlightClass = function(shouldShowHighlights) {
    if (shouldShowHighlights) {
      this.element.addClass(SHOW_HIGHLIGHTS_CLASS);
    } else {
      this.element.removeClass(SHOW_HIGHLIGHTS_CLASS);
    }
    return this.visibleHighlights = shouldShowHighlights;
  };

  return Guest;

})(Delegator);


},{"../shared/polyglot":100,"../shared/util/get-proper-classname":102,"./adder":58,"./anchoring/html":59,"./anchoring/range":61,"./delegator":71,"./highlighter":76,"./range-util":89,"./selections":90,"custom-event":3,"document-base-uri":8,"extend":34,"jquery":"jquery","raf":47,"scroll-into-view":49}],75:[function(require,module,exports){
var $;

$ = require('jquery');

exports.highlightRange = function(normedRange, newAnnotation, cssClass) {
  var hl, nodes, white;
  if (cssClass == null) {
    cssClass = 'annotator-hl';
  }
  white = /^\s*$/;
  if (newAnnotation) {
    cssClass = "annotator-hl annotator-hl-focused";
  }
  hl = $("<hypothesis-highlight class='" + cssClass + "'></hypothesis-highlight>");
  nodes = $(normedRange.textNodes()).filter(function(i) {
    return !white.test(this.nodeValue);
  });
  return nodes.wrap(hl).parent().toArray();
};

exports.removeHighlights = function(highlights) {
  var h, j, len, results;
  results = [];
  for (j = 0, len = highlights.length; j < len; j++) {
    h = highlights[j];
    if (h.parentNode != null) {
      results.push($(h).replaceWith(h.childNodes));
    }
  }
  return results;
};

exports.getBoundingClientRect = function(collection) {
  var rects;
  rects = collection.map(function(n) {
    return n.getBoundingClientRect();
  });
  return rects.reduce(function(acc, r) {
    return {
      top: Math.min(acc.top, r.top),
      left: Math.min(acc.left, r.left),
      bottom: Math.max(acc.bottom, r.bottom),
      right: Math.max(acc.right, r.right)
    };
  });
};


},{"jquery":"jquery"}],76:[function(require,module,exports){
'use strict';

var domWrapHighlighter = require('./dom-wrap-highlighter');
var overlayHighlighter = require('./overlay-highlighter');
var features = require('../features');

// we need a facade for the highlighter interface
// that will let us lazy check the overlay_highlighter feature
// flag and later determine which interface should be used.
var highlighterFacade = {};
var overlayFlagEnabled = void 0;

Object.keys(domWrapHighlighter).forEach(function (methodName) {
  highlighterFacade[methodName] = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    // lazy check the value but we will
    // use that first value as the rule throughout
    // the in memory session
    if (overlayFlagEnabled === undefined) {
      overlayFlagEnabled = features.flagEnabled('overlay_highlighter');
    }

    var method = overlayFlagEnabled ? overlayHighlighter[methodName] : domWrapHighlighter[methodName];
    return method.apply(null, args);
  };
});

module.exports = highlighterFacade;

},{"../features":72,"./dom-wrap-highlighter":75,"./overlay-highlighter":77}],77:[function(require,module,exports){
'use strict';

module.exports = {
  highlightRange: function highlightRange() {
    // eslint-disable-next-line no-console
    console.log('highlightRange not implemented');
  },

  removeHighlights: function removeHighlights() {
    // eslint-disable-next-line no-console
    console.log('removeHighlights not implemented');
  },

  getBoundingClientRect: function getBoundingClientRect() {
    // eslint-disable-next-line no-console
    console.log('getBoundingClientRect not implemented');
  }
};

},{}],78:[function(require,module,exports){
var $, Guest, Host,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

$ = require('jquery');

Guest = require('./guest');

module.exports = Host = (function(superClass) {
  extend(Host, superClass);

  function Host(element, config) {
    var app, configParam, ref, service, sidebarAppSrc;
    if ((ref = config.services) != null ? ref[0] : void 0) {
      service = config.services[0];
      if (service.onLoginRequest) {
        service.onLoginRequestProvided = true;
      }
      if (service.onLogoutRequest) {
        service.onLogoutRequestProvided = true;
      }
      if (service.onSignupRequest) {
        service.onSignupRequestProvided = true;
      }
      if (service.onProfileRequest) {
        service.onProfileRequestProvided = true;
      }
      if (service.onHelpRequest) {
        service.onHelpRequestProvided = true;
      }
    }
    configParam = 'config=' + encodeURIComponent(JSON.stringify(Object.assign({}, config, {
      sidebarAppUrl: void 0,
      pluginClasses: void 0
    })));
    if (config.sidebarAppUrl && indexOf.call(config.sidebarAppUrl, '?') >= 0) {
      sidebarAppSrc = config.sidebarAppUrl + '&' + configParam;
    } else {
      sidebarAppSrc = config.sidebarAppUrl + '?' + configParam;
    }
    app = $('<iframe></iframe>').attr('name', 'hyp_sidebar_frame').attr('allowfullscreen', '').attr('seamless', '').attr('src', sidebarAppSrc).addClass('h-sidebar-iframe');
    this.frame = $('<div></div>').css('display', 'none').addClass('annotator-frame annotator-outer');
    if (config.theme === 'clean') {
      this.frame.addClass('annotator-frame--drop-shadow-enabled');
    }
    this.frame.appendTo(".rh_docs > .container > .row");
    Host.__super__.constructor.apply(this, arguments);
    app.appendTo(this.frame);
    this.on('panelReady', (function(_this) {
      return function() {
        _this.frame.css('display', '');
        return app.css('display', 'none');
      };
    })(this));
    this.on('beforeAnnotationCreated', function(annotation) {
      if (!annotation.$highlight) {
        return app[0].contentWindow.focus();
      }
    });
  }

  Host.prototype.destroy = function() {
    this.frame.remove();
    return Host.__super__.destroy.apply(this, arguments);
  };

  return Host;

})(Guest);


},{"./guest":74,"jquery":"jquery"}],79:[function(require,module,exports){
'use strict';

var configFrom = require('./config/index');
require('../shared/polyfills');

// Polyfills

// document.evaluate() implementation,
// required by IE 10, 11
//
// This sets `window.wgxpath`
if (!window.document.evaluate) {
  require('./vendor/wgxpath.install');
}
if (window.wgxpath) {
  window.wgxpath.install();
}

var $ = require('jquery');

// Applications
var Guest = require('./guest');
var Sidebar = require('./sidebar');
var PdfSidebar = require('./pdf-sidebar');

var pluginClasses = {
  // UI plugins
  BucketBar: require('./plugin/bucket-bar'),
  Toolbar: require('./plugin/toolbar'),

  // Document type plugins
  PDF: require('./plugin/pdf'),
  Document: require('./plugin/document'),

  // Cross-frame communication
  CrossFrame: require('./plugin/cross-frame')
};

var appLinkEl = document.querySelector('link[type="application/annotator+html"][rel="sidebar"]');
var config = configFrom(window);

$.noConflict(true)(function () {
  var Klass = window.PDFViewerApplication ? PdfSidebar : Sidebar;

  if (config.hasOwnProperty('constructor')) {
    Klass = config.constructor;
    delete config.constructor;
  }

  if (config.subFrameIdentifier) {
    Klass = Guest;

    // Other modules use this to detect if this
    // frame context belongs to hypothesis.
    // Needs to be a global property that's set.
    window.__hypothesis_frame = true;
  }

  if (config.theme === 'clean') {
    delete pluginClasses.BucketBar;
  }

  config.pluginClasses = pluginClasses;

  var annotator = new Klass(document.body, config);
  appLinkEl.addEventListener('destroy', function () {
    appLinkEl.parentElement.removeChild(appLinkEl);
    annotator.destroy();
  });
});

},{"../shared/polyfills":"/src/shared/polyfills.js","./config/index":68,"./guest":74,"./pdf-sidebar":80,"./plugin/bucket-bar":83,"./plugin/cross-frame":84,"./plugin/document":85,"./plugin/pdf":87,"./plugin/toolbar":88,"./sidebar":92,"./vendor/wgxpath.install":95,"jquery":"jquery"}],80:[function(require,module,exports){
var PdfSidebar, Sidebar,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Sidebar = require('./sidebar');

module.exports = PdfSidebar = (function(superClass) {
  extend(PdfSidebar, superClass);

  function PdfSidebar() {
    return PdfSidebar.__super__.constructor.apply(this, arguments);
  }

  PdfSidebar.prototype.options = {
    TextSelection: {},
    PDF: {},
    BucketBar: {
      container: '.annotator-frame',
      scrollables: ['#viewerContainer']
    },
    Toolbar: {
      container: '.annotator-frame'
    }
  };

  return PdfSidebar;

})(Sidebar);


},{"./sidebar":92}],81:[function(require,module,exports){
'use strict';

/**
 * Enum values for page rendering states (IRenderableView#renderingState)
 * in PDF.js. Taken from web/pdf_rendering_queue.js in the PDF.js library.
 *
 * Reproduced here because this enum is not exported consistently across
 * different versions of PDF.js
 */

var RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3
};

module.exports = RenderingStates;

},{}],82:[function(require,module,exports){
var Delegator, Plugin,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Delegator = require('./delegator');

module.exports = Plugin = (function(superClass) {
  extend(Plugin, superClass);

  function Plugin(element, options) {
    Plugin.__super__.constructor.apply(this, arguments);
  }

  Plugin.prototype.pluginInit = function() {};

  return Plugin;

})(Delegator);


},{"./delegator":71}],83:[function(require,module,exports){
var $, BUCKET_NAV_SIZE, BUCKET_SIZE, BUCKET_TOP_THRESHOLD, BucketBar, Plugin, configFrom, highlighter, polyglot, raf, scrollIntoView, scrollToClosest,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

raf = require('raf');

$ = require('jquery');

Plugin = require('../plugin');

scrollIntoView = require('scroll-into-view');

highlighter = require('../highlighter');

polyglot = require('../../shared/polyglot');

configFrom = require('../config/index');

BUCKET_SIZE = 16;

BUCKET_NAV_SIZE = BUCKET_SIZE + 6;

BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE;

scrollToClosest = function(anchors, direction) {
  var dir, next;
  dir = direction === "up" ? +1 : -1;
  next = anchors.reduce(function(acc, anchor) {
    var rect, ref, start;
    if (!((ref = anchor.highlights) != null ? ref.length : void 0)) {
      return acc;
    }
    start = acc.start, next = acc.next;
    rect = highlighter.getBoundingClientRect(anchor.highlights);
    if (dir === 1 && rect.top >= BUCKET_TOP_THRESHOLD) {
      return acc;
    } else if (dir === -1 && rect.top <= window.innerHeight - BUCKET_NAV_SIZE) {
      return acc;
    }
    if (next == null) {
      return {
        start: rect.top,
        next: anchor
      };
    } else if (start * dir < rect.top * dir) {
      return {
        start: rect.top,
        next: anchor
      };
    } else {
      return acc;
    }
  }, {}).next;
  return scrollIntoView(next.highlights[0]);
};

module.exports = BucketBar = (function(superClass) {
  extend(BucketBar, superClass);

  BucketBar.prototype.html = "<div class=\"annotator-bucket-bar\">\n</div>";

  BucketBar.prototype.options = {
    gapSize: 60,
    scrollables: ['body']
  };

  BucketBar.prototype.buckets = [];

  BucketBar.prototype.index = [];

  BucketBar.prototype.tabs = null;

  function BucketBar(element, options) {
    this.update = bind(this.update, this);
    BucketBar.__super__.constructor.call(this, $(this.html), options);
    if (this.options.container != null) {
      $(this.options.container).append(this.element);
    } else {
      $(element).append(this.element);
    }
  }

  BucketBar.prototype.pluginInit = function() {
    var k, len, ref, ref1, results, scrollable;
    $(window).on('resize scroll', this.update);
    ref1 = (ref = this.options.scrollables) != null ? ref : [];
    results = [];
    for (k = 0, len = ref1.length; k < len; k++) {
      scrollable = ref1[k];
      results.push($(scrollable).on('resize scroll', this.update));
    }
    return results;
  };

  BucketBar.prototype.destroy = function() {
    var k, len, ref, ref1, results, scrollable;
    $(window).off('resize scroll', this.update);
    ref1 = (ref = this.options.scrollables) != null ? ref : [];
    results = [];
    for (k = 0, len = ref1.length; k < len; k++) {
      scrollable = ref1[k];
      results.push($(scrollable).off('resize scroll', this.update));
    }
    return results;
  };

  BucketBar.prototype._collate = function(a, b) {
    var i, k, ref;
    for (i = k = 0, ref = a.length - 1; 0 <= ref ? k <= ref : k >= ref; i = 0 <= ref ? ++k : --k) {
      if (a[i] < b[i]) {
        return -1;
      }
      if (a[i] > b[i]) {
        return 1;
      }
    }
    return 0;
  };

  BucketBar.prototype.update = function() {
    if (this._updatePending != null) {
      return;
    }
    return this._updatePending = raf((function(_this) {
      return function() {
        delete _this._updatePending;
        return _this._update();
      };
    })(this));
  };

  BucketBar.prototype._update = function() {
    var above, b, below, element, k, len, max, points, ref, ref1;
    above = [];
    below = [];
    points = this.annotator.anchors.reduce((function(_this) {
      return function(points, anchor, i) {
        var h, rect, ref, x;
        if (!((ref = anchor.highlights) != null ? ref.length : void 0)) {
          return points;
        }
        rect = highlighter.getBoundingClientRect(anchor.highlights);
        x = rect.top;
        h = rect.bottom - rect.top;
        if (x < BUCKET_TOP_THRESHOLD) {
          if (indexOf.call(above, anchor) < 0) {
            above.push(anchor);
          }
        } else if (x > window.innerHeight - BUCKET_NAV_SIZE) {
          if (indexOf.call(below, anchor) < 0) {
            below.push(anchor);
          }
        } else {
          points.push([x, 1, anchor]);
          points.push([x + h, -1, anchor]);
        }
        return points;
      };
    })(this), []);
    ref = points.sort(this._collate).reduce((function(_this) {
      return function(arg, arg1, i, points) {
        var a, a0, buckets, carry, d, index, j, k, l, last, len, len1, ref, ref1, toMerge, x;
        buckets = arg.buckets, index = arg.index, carry = arg.carry;
        x = arg1[0], d = arg1[1], a = arg1[2];
        if (d > 0) {
          if ((j = carry.anchors.indexOf(a)) < 0) {
            carry.anchors.unshift(a);
            carry.counts.unshift(1);
          } else {
            carry.counts[j]++;
          }
        } else {
          j = carry.anchors.indexOf(a);
          if (--carry.counts[j] === 0) {
            carry.anchors.splice(j, 1);
            carry.counts.splice(j, 1);
          }
        }
        if ((index.length === 0 || i === points.length - 1) || carry.anchors.length === 0 || x - index[index.length - 1] > _this.options.gapSize) {
          buckets.push(carry.anchors.slice());
          index.push(x);
        } else {
          if ((ref = buckets[buckets.length - 2]) != null ? ref.length : void 0) {
            last = buckets[buckets.length - 2];
            toMerge = buckets.pop();
            index.pop();
          } else {
            last = buckets[buckets.length - 1];
            toMerge = [];
          }
          ref1 = carry.anchors;
          for (k = 0, len = ref1.length; k < len; k++) {
            a0 = ref1[k];
            if (indexOf.call(last, a0) < 0) {
              last.push(a0);
            }
          }
          for (l = 0, len1 = toMerge.length; l < len1; l++) {
            a0 = toMerge[l];
            if (indexOf.call(last, a0) < 0) {
              last.push(a0);
            }
          }
        }
        return {
          buckets: buckets,
          index: index,
          carry: carry
        };
      };
    })(this), {
      buckets: [],
      index: [],
      carry: {
        anchors: [],
        counts: [],
        latest: 0
      }
    }), this.buckets = ref.buckets, this.index = ref.index;
    this.buckets.unshift([], above, []);
    this.index.unshift(0, BUCKET_TOP_THRESHOLD - 1, BUCKET_TOP_THRESHOLD);
    this.buckets.push([], below, []);
    this.index.push(window.innerHeight - BUCKET_NAV_SIZE, window.innerHeight - BUCKET_NAV_SIZE + 1, window.innerHeight);
    max = 0;
    ref1 = this.buckets;
    for (k = 0, len = ref1.length; k < len; k++) {
      b = ref1[k];
      max = Math.max(max, b.length);
    }
    element = this.element;
    this.tabs || (this.tabs = $([]));
    this.tabs.slice(this.buckets.length).remove();
    this.tabs = this.tabs.slice(0, this.buckets.length);
    $.each(this.buckets.slice(this.tabs.length), (function(_this) {
      return function() {
        var div, lengthOfHighlightedFeedback, lengthOfPreviousBucket;
        div = $('<div/>').appendTo(element);
        _this.tabs.push(div[0]);
        lengthOfPreviousBucket = 0;
        lengthOfHighlightedFeedback = 0;
        return div.addClass('annotator-bucket-indicator').on('mousemove', function(event) {
          var anchor, bucket, l, len1, ref2, results, toggle;
          if (configFrom(window).theme !== 'custom') {
            bucket = _this.tabs.index(event.currentTarget);
            ref2 = _this.annotator.anchors;
            results = [];
            for (l = 0, len1 = ref2.length; l < len1; l++) {
              anchor = ref2[l];
              toggle = indexOf.call(_this.buckets[bucket], anchor) >= 0;
              results.push($(anchor.highlights).toggleClass('annotator-hl-focused', toggle));
            }
            return results;
          }
        }).on('mouseout', function(event) {
          var anchor, bucket, l, len1, ref2, results;
          if (configFrom(window).theme !== 'custom') {
            bucket = _this.tabs.index(event.currentTarget);
            ref2 = _this.buckets[bucket];
            results = [];
            for (l = 0, len1 = ref2.length; l < len1; l++) {
              anchor = ref2[l];
              results.push($(anchor.highlights).removeClass('annotator-hl-focused'));
            }
            return results;
          }
        }).on('click', function(event) {
          var anchor, annotations, bucket, feedback, feedbackListInBucket, l, len1, len2, lengthOfCurrentBucket, m, previousBucket, ref2;
          bucket = _this.tabs.index(event.currentTarget);
          event.stopPropagation();
          feedbackListInBucket = [];
          lengthOfHighlightedFeedback = $('.annotator-hl-focused').length;
          ref2 = _this.annotator.anchors;
          for (l = 0, len1 = ref2.length; l < len1; l++) {
            anchor = ref2[l];
            if (indexOf.call(_this.buckets[bucket], anchor) >= 0) {
              feedbackListInBucket.push($(anchor.highlights));
            } else {
              $(anchor.highlights).removeClass('annotator-hl-focused');
            }
          }
          lengthOfCurrentBucket = feedbackListInBucket.length;
          for (m = 0, len2 = feedbackListInBucket.length; m < len2; m++) {
            feedback = feedbackListInBucket[m];
            if (lengthOfCurrentBucket !== lengthOfPreviousBucket) {
              feedback.addClass('annotator-hl-focused');
            } else {
              if (lengthOfCurrentBucket !== lengthOfHighlightedFeedback) {
                feedback.addClass('annotator-hl-focused');
              } else {
                feedback.toggleClass('annotator-hl-focused');
              }
            }
          }
          if (_this.isUpper(bucket)) {
            scrollToClosest(_this.buckets[bucket], 'up');
          } else if (_this.isLower(bucket)) {
            scrollToClosest(_this.buckets[bucket], 'down');
          } else {
            if (configFrom(window).theme !== 'custom') {
              annotations = (function() {
                var len3, n, ref3, results;
                ref3 = this.buckets[bucket];
                results = [];
                for (n = 0, len3 = ref3.length; n < len3; n++) {
                  anchor = ref3[n];
                  results.push(anchor.annotation);
                }
                return results;
              }).call(_this);
              _this.annotator.selectAnnotations(annotations, event.ctrlKey || event.metaKey);
            }
          }
          previousBucket = feedbackListInBucket;
          return lengthOfPreviousBucket = lengthOfCurrentBucket;
        });
      };
    })(this));
    return this._buildTabs(this.tabs, this.buckets);
  };

  BucketBar.prototype._buildTabs = function() {
    return this.tabs.each((function(_this) {
      return function(d, el) {
        var bucket, bucketLength, bucketSize, title;
        el = $(el);
        bucket = _this.buckets[d];
        bucketLength = bucket != null ? bucket.length : void 0;
        title = polyglot().t("Show feedback", {
          bucketLength: bucketLength
        });
        el.attr('title', title);
        el.toggleClass('upper', _this.isUpper(d));
        el.toggleClass('lower', _this.isLower(d));
        if (_this.isUpper(d) || _this.isLower(d)) {
          bucketSize = BUCKET_NAV_SIZE;
        } else {
          bucketSize = BUCKET_SIZE;
        }
        el.css({
          top: (_this.index[d] + _this.index[d + 1]) / 2,
          marginTop: -bucketSize / 2,
          display: !bucketLength ? 'none' : ''
        });
        if (bucket) {
          return el.html("<div class='label'>" + bucketLength + "</div>");
        }
      };
    })(this));
  };

  BucketBar.prototype.isUpper = function(i) {
    return i === 1;
  };

  BucketBar.prototype.isLower = function(i) {
    return i === this.index.length - 2;
  };

  BucketBar.prototype.showBucketBar = function() {
    return $('[class=annotator-bucket-bar]').show();
  };

  BucketBar.prototype.hideBucketBar = function() {
    return $('[class=annotator-bucket-bar]').hide();
  };

  return BucketBar;

})(Plugin);

BucketBar.BUCKET_SIZE = BUCKET_SIZE;

BucketBar.BUCKET_NAV_SIZE = BUCKET_NAV_SIZE;

BucketBar.BUCKET_TOP_THRESHOLD = BUCKET_TOP_THRESHOLD;


},{"../../shared/polyglot":100,"../config/index":68,"../highlighter":76,"../plugin":82,"jquery":"jquery","raf":47,"scroll-into-view":49}],84:[function(require,module,exports){
var AnnotationSync, Bridge, CrossFrame, Discovery, FrameObserver, FrameUtil, Plugin, extract,
  slice = [].slice,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Plugin = require('../plugin');

AnnotationSync = require('../annotation-sync');

Bridge = require('../../shared/bridge');

Discovery = require('../../shared/discovery');

FrameUtil = require('../util/frame-util');

FrameObserver = require('../frame-observer');

extract = extract = function() {
  var i, key, keys, len, obj, ret;
  obj = arguments[0], keys = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  ret = {};
  for (i = 0, len = keys.length; i < len; i++) {
    key = keys[i];
    if (obj.hasOwnProperty(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
};

module.exports = CrossFrame = (function(superClass) {
  extend(CrossFrame, superClass);

  function CrossFrame(elem, options) {
    var _iframeUnloaded, _injectToFrame, annotationSync, bridge, config, discovery, frameIdentifiers, frameObserver, opts;
    CrossFrame.__super__.constructor.apply(this, arguments);
    config = options.config;
    opts = extract(options, 'server');
    discovery = new Discovery(window, opts);
    bridge = new Bridge();
    opts = extract(options, 'on', 'emit');
    annotationSync = new AnnotationSync(bridge, opts);
    frameObserver = new FrameObserver(elem);
    frameIdentifiers = new Map();
    this.pluginInit = function() {
      var onDiscoveryCallback;
      onDiscoveryCallback = function(source, origin, token) {
        return bridge.createChannel(source, origin, token);
      };
      discovery.startDiscovery(onDiscoveryCallback);
      return frameObserver.observe(_injectToFrame, _iframeUnloaded);
    };
    this.destroy = function() {
      Plugin.prototype.destroy.apply(this, arguments);
      bridge.destroy();
      discovery.stopDiscovery();
      return frameObserver.disconnect();
    };
    this.sync = function(annotations, cb) {
      return annotationSync.sync(annotations, cb);
    };
    this.on = function(event, fn) {
      return bridge.on(event, fn);
    };
    this.call = function() {
      var args, message;
      message = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return bridge.call.apply(bridge, [message].concat(slice.call(args)));
    };
    this.onConnect = function(fn) {
      return bridge.onConnect(fn);
    };
    _injectToFrame = function(frame) {
      var clientUrl;
      if (!FrameUtil.hasHypothesis(frame)) {
        clientUrl = config.clientUrl;
        return FrameUtil.isLoaded(frame, function() {
          var injectedConfig, subFrameIdentifier;
          subFrameIdentifier = discovery._generateToken();
          frameIdentifiers.set(frame, subFrameIdentifier);
          injectedConfig = Object.assign({}, config, {
            subFrameIdentifier: subFrameIdentifier
          });
          return FrameUtil.injectHypothesis(frame, clientUrl, injectedConfig);
        });
      }
    };
    _iframeUnloaded = function(frame) {
      bridge.call('destroyFrame', frameIdentifiers.get(frame));
      return frameIdentifiers["delete"](frame);
    };
  }

  return CrossFrame;

})(Plugin);


},{"../../shared/bridge":97,"../../shared/discovery":98,"../annotation-sync":66,"../frame-observer":73,"../plugin":82,"../util/frame-util":93}],85:[function(require,module,exports){
var $, Document, Plugin, baseURI,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

$ = require('jquery');

Plugin = require('../plugin');

baseURI = require('document-base-uri');


/*
** Adapted from:
** https://github.com/openannotation/annotator/blob/v1.2.x/src/plugin/document.coffee
**
** Annotator v1.2.10
** https://github.com/openannotation/annotator
**
** Copyright 2015, the Annotator project contributors.
** Dual licensed under the MIT and GPLv3 licenses.
** https://github.com/openannotation/annotator/blob/master/LICENSE
 */

module.exports = Document = (function(superClass) {
  extend(Document, superClass);

  function Document() {
    this._getFavicon = bind(this._getFavicon, this);
    this._getLinks = bind(this._getLinks, this);
    this._getTitle = bind(this._getTitle, this);
    this._getMetaTags = bind(this._getMetaTags, this);
    this._getEprints = bind(this._getEprints, this);
    this._getPrism = bind(this._getPrism, this);
    this._getDublinCore = bind(this._getDublinCore, this);
    this._getTwitter = bind(this._getTwitter, this);
    this._getFacebook = bind(this._getFacebook, this);
    this._getHighwire = bind(this._getHighwire, this);
    this.getDocumentMetadata = bind(this.getDocumentMetadata, this);
    this.beforeAnnotationCreated = bind(this.beforeAnnotationCreated, this);
    this.uris = bind(this.uris, this);
    this.uri = bind(this.uri, this);
    return Document.__super__.constructor.apply(this, arguments);
  }

  Document.prototype.events = {
    'beforeAnnotationCreated': 'beforeAnnotationCreated'
  };

  Document.prototype.pluginInit = function() {
    this.baseURI = this.options.baseURI || baseURI;
    this.document = this.options.document || document;
    return this.getDocumentMetadata();
  };

  Document.prototype.uri = function() {
    var i, len, link, ref, uri;
    uri = decodeURIComponent(this._getDocumentHref());
    ref = this.metadata.link;
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      if (link.rel === "canonical") {
        uri = link.href;
      }
    }
    return uri;
  };

  Document.prototype.uris = function() {
    var href, i, len, link, ref, uniqueUrls;
    uniqueUrls = {};
    ref = this.metadata.link;
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      if (link.href) {
        uniqueUrls[link.href] = true;
      }
    }
    return (function() {
      var results;
      results = [];
      for (href in uniqueUrls) {
        results.push(href);
      }
      return results;
    })();
  };

  Document.prototype.beforeAnnotationCreated = function(annotation) {
    return annotation.document = this.metadata;
  };

  Document.prototype.getDocumentMetadata = function() {
    this.metadata = {};
    this._getHighwire();
    this._getDublinCore();
    this._getFacebook();
    this._getEprints();
    this._getPrism();
    this._getTwitter();
    this._getFavicon();
    this._getTitle();
    this._getLinks();
    return this.metadata;
  };

  Document.prototype._getHighwire = function() {
    return this.metadata.highwire = this._getMetaTags("citation", "name", "_");
  };

  Document.prototype._getFacebook = function() {
    return this.metadata.facebook = this._getMetaTags("og", "property", ":");
  };

  Document.prototype._getTwitter = function() {
    return this.metadata.twitter = this._getMetaTags("twitter", "name", ":");
  };

  Document.prototype._getDublinCore = function() {
    return this.metadata.dc = this._getMetaTags("dc", "name", ".");
  };

  Document.prototype._getPrism = function() {
    return this.metadata.prism = this._getMetaTags("prism", "name", ".");
  };

  Document.prototype._getEprints = function() {
    return this.metadata.eprints = this._getMetaTags("eprints", "name", ".");
  };

  Document.prototype._getMetaTags = function(prefix, attribute, delimiter) {
    var content, i, len, match, meta, n, name, ref, tags;
    tags = {};
    ref = $("meta");
    for (i = 0, len = ref.length; i < len; i++) {
      meta = ref[i];
      name = $(meta).attr(attribute);
      content = $(meta).prop("content");
      if (name) {
        match = name.match(RegExp("^" + prefix + delimiter + "(.+)$", "i"));
        if (match) {
          n = match[1];
          if (tags[n]) {
            tags[n].push(content);
          } else {
            tags[n] = [content];
          }
        }
      }
    }
    return tags;
  };

  Document.prototype._getTitle = function() {
    if (this.metadata.highwire.title) {
      return this.metadata.title = this.metadata.highwire.title[0];
    } else if (this.metadata.eprints.title) {
      return this.metadata.title = this.metadata.eprints.title[0];
    } else if (this.metadata.prism.title) {
      return this.metadata.title = this.metadata.prism.title[0];
    } else if (this.metadata.facebook.title) {
      return this.metadata.title = this.metadata.facebook.title[0];
    } else if (this.metadata.twitter.title) {
      return this.metadata.title = this.metadata.twitter.title[0];
    } else if (this.metadata.dc.title) {
      return this.metadata.title = this.metadata.dc.title[0];
    } else {
      return this.metadata.title = $("head title").text();
    }
  };

  Document.prototype._getLinks = function() {
    var dcIdentifierValues, dcRelationValues, dcUrn, dcUrnIdentifierComponent, dcUrnRelationComponent, doi, href, i, id, j, k, l, lang, len, len1, len2, len3, link, m, name, ref, ref1, ref2, rel, type, url, values;
    this.metadata.link = [
      {
        href: this._getDocumentHref()
      }
    ];
    ref = $("link");
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      l = $(link);
      href = this._absoluteUrl(l.prop('href'));
      rel = l.prop('rel');
      type = l.prop('type');
      lang = l.prop('hreflang');
      if (rel !== "alternate" && rel !== "canonical" && rel !== "bookmark" && rel !== "shortlink") {
        continue;
      }
      if (rel === 'alternate') {
        if (type && type.match(/^application\/(rss|atom)\+xml/)) {
          continue;
        }
        if (lang) {
          continue;
        }
      }
      this.metadata.link.push({
        href: href,
        rel: rel,
        type: type
      });
    }
    ref1 = this.metadata.highwire;
    for (name in ref1) {
      values = ref1[name];
      if (name === "pdf_url") {
        for (j = 0, len1 = values.length; j < len1; j++) {
          url = values[j];
          this.metadata.link.push({
            href: this._absoluteUrl(url),
            type: "application/pdf"
          });
        }
      }
      if (name === "doi") {
        for (k = 0, len2 = values.length; k < len2; k++) {
          doi = values[k];
          if (doi.slice(0, 4) !== "doi:") {
            doi = "doi:" + doi;
          }
          this.metadata.link.push({
            href: doi
          });
        }
      }
    }
    ref2 = this.metadata.dc;
    for (name in ref2) {
      values = ref2[name];
      if (name === "identifier") {
        for (m = 0, len3 = values.length; m < len3; m++) {
          id = values[m];
          if (id.slice(0, 4) === "doi:") {
            this.metadata.link.push({
              href: id
            });
          }
        }
      }
    }
    dcRelationValues = this.metadata.dc['relation.ispartof'];
    dcIdentifierValues = this.metadata.dc['identifier'];
    if (dcRelationValues && dcIdentifierValues) {
      dcUrnRelationComponent = dcRelationValues[dcRelationValues.length - 1];
      dcUrnIdentifierComponent = dcIdentifierValues[dcIdentifierValues.length - 1];
      dcUrn = 'urn:x-dc:' + encodeURIComponent(dcUrnRelationComponent) + '/' + encodeURIComponent(dcUrnIdentifierComponent);
      this.metadata.link.push({
        href: dcUrn
      });
      return this.metadata.documentFingerprint = dcUrn;
    }
  };

  Document.prototype._getFavicon = function() {
    var i, len, link, ref, ref1, results;
    ref = $("link");
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      if ((ref1 = $(link).prop("rel")) === "shortcut icon" || ref1 === "icon") {
        results.push(this.metadata["favicon"] = this._absoluteUrl(link.href));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  Document.prototype._absoluteUrl = function(url) {
    var d;
    d = this.document.createElement('a');
    d.href = url;
    return d.href;
  };

  Document.prototype._getDocumentHref = function() {
    var allowedSchemes, href, ref, ref1;
    href = this.document.location.href;
    allowedSchemes = ['http:', 'https:', 'file:'];
    if (ref = new URL(href).protocol, indexOf.call(allowedSchemes, ref) >= 0) {
      return href;
    }
    if (this.baseURI && (ref1 = new URL(this.baseURI).protocol, indexOf.call(allowedSchemes, ref1) >= 0)) {
      return this.baseURI;
    }
    return href;
  };

  return Document;

})(Plugin);


},{"../plugin":82,"document-base-uri":8,"jquery":"jquery"}],86:[function(require,module,exports){
'use strict';

/**
 * This PDFMetadata service extracts metadata about a loading/loaded PDF
 * document from a PDF.js PDFViewerApplication object.
 *
 * This hides from users of this service the need to wait until the PDF document
 * is loaded before extracting the relevant metadata.
 */

function PDFMetadata(app) {
  this._loaded = new Promise(function (resolve) {
    var finish = function finish() {
      window.removeEventListener('documentload', finish);
      resolve(app);
    };

    if (app.documentFingerprint) {
      resolve(app);
    } else {
      window.addEventListener('documentload', finish);
    }
  });
}

/**
 * Returns a promise of the URI of the loaded PDF.
 */
PDFMetadata.prototype.getUri = function () {
  return this._loaded.then(function (app) {
    var uri = getPDFURL(app);
    if (!uri) {
      uri = fingerprintToURN(app.documentFingerprint);
    }
    return uri;
  });
};

/**
 * Returns a promise of a metadata object, containing:
 *
 * title(string) - The document title
 * link(array) - An array of link objects representing URIs for the document
 * documentFingerprint(string) - The document fingerprint
 */
PDFMetadata.prototype.getMetadata = function () {
  return this._loaded.then(function (app) {
    var title = document.title;

    if (app.metadata && app.metadata.has('dc:title') && app.metadata.get('dc:title') !== 'Untitled') {
      title = app.metadata.get('dc:title');
    } else if (app.documentInfo && app.documentInfo.Title) {
      title = app.documentInfo.Title;
    }

    var link = [{ href: fingerprintToURN(app.documentFingerprint) }];

    var url = getPDFURL(app);
    if (url) {
      link.push({ href: url });
    }

    return {
      title: title,
      link: link,
      documentFingerprint: app.documentFingerprint
    };
  });
};

function fingerprintToURN(fingerprint) {
  return 'urn:x-pdf:' + String(fingerprint);
}

function getPDFURL(app) {
  // Local file:// URLs should not be saved in document metadata.
  // Entries in document.link should be URIs. In the case of
  // local files, omit the URL.
  if (app.url.indexOf('file://') !== 0) {
    return app.url;
  }

  return null;
}

module.exports = PDFMetadata;

},{}],87:[function(require,module,exports){
var PDF, Plugin, RenderingStates,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Plugin = require('../plugin');

RenderingStates = require('../pdfjs-rendering-states');

module.exports = PDF = (function(superClass) {
  extend(PDF, superClass);

  function PDF() {
    return PDF.__super__.constructor.apply(this, arguments);
  }

  PDF.prototype.documentLoaded = null;

  PDF.prototype.observer = null;

  PDF.prototype.pdfViewer = null;

  PDF.prototype.pluginInit = function() {
    var PDFMetadata;
    this.annotator.anchoring = require('../anchoring/pdf');
    PDFMetadata = require('./pdf-metadata');
    this.pdfViewer = PDFViewerApplication.pdfViewer;
    this.pdfViewer.viewer.classList.add('has-transparent-text-layer');
    this.pdfMetadata = new PDFMetadata(PDFViewerApplication);
    this.observer = new MutationObserver((function(_this) {
      return function(mutations) {
        return _this._update();
      };
    })(this));
    return this.observer.observe(this.pdfViewer.viewer, {
      attributes: true,
      attributeFilter: ['data-loaded'],
      childList: true,
      subtree: true
    });
  };

  PDF.prototype.destroy = function() {
    this.pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    return this.observer.disconnect();
  };

  PDF.prototype.uri = function() {
    return this.pdfMetadata.getUri();
  };

  PDF.prototype.getMetadata = function() {
    return this.pdfMetadata.getMetadata();
  };

  PDF.prototype._update = function() {
    var anchor, annotation, annotator, div, hl, i, j, k, l, len, len1, len2, page, pageIndex, pdfViewer, placeholder, ref, ref1, ref2, ref3, ref4, ref5, ref6, refreshAnnotations, results;
    ref = this, annotator = ref.annotator, pdfViewer = ref.pdfViewer;
    refreshAnnotations = [];
    for (pageIndex = i = 0, ref1 = pdfViewer.pagesCount; 0 <= ref1 ? i < ref1 : i > ref1; pageIndex = 0 <= ref1 ? ++i : --i) {
      page = pdfViewer.getPageView(pageIndex);
      if (!((ref2 = page.textLayer) != null ? ref2.renderingDone : void 0)) {
        continue;
      }
      div = (ref3 = page.div) != null ? ref3 : page.el;
      placeholder = div.getElementsByClassName('annotator-placeholder')[0];
      switch (page.renderingState) {
        case RenderingStates.INITIAL:
          page.textLayer = null;
          break;
        case RenderingStates.FINISHED:
          if (placeholder != null) {
            placeholder.parentNode.removeChild(placeholder);
          }
      }
    }
    ref4 = annotator.anchors;
    for (j = 0, len = ref4.length; j < len; j++) {
      anchor = ref4[j];
      if (!(anchor.highlights != null)) {
        continue;
      }
      if (ref5 = anchor.annotation, indexOf.call(refreshAnnotations, ref5) >= 0) {
        continue;
      }
      ref6 = anchor.highlights;
      for (k = 0, len1 = ref6.length; k < len1; k++) {
        hl = ref6[k];
        if (!document.body.contains(hl)) {
          delete anchor.highlights;
          delete anchor.range;
          refreshAnnotations.push(anchor.annotation);
          break;
        }
      }
    }
    results = [];
    for (l = 0, len2 = refreshAnnotations.length; l < len2; l++) {
      annotation = refreshAnnotations[l];
      results.push(annotator.anchor(annotation));
    }
    return results;
  };

  return PDF;

})(Plugin);


},{"../anchoring/pdf":60,"../pdfjs-rendering-states":81,"../plugin":82,"./pdf-metadata":86}],88:[function(require,module,exports){
var $, Plugin, Toolbar, makeButton, polyglot,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Plugin = require('../plugin');

$ = require('jquery');

polyglot = require('../../shared/polyglot');

makeButton = function(item) {
  var anchor, button;
  anchor = $('<button></button>').attr('href', '').attr('title', item.title).attr('name', item.name).on(item.on).addClass('annotator-frame-button').addClass(item["class"]);
  anchor.text(item.title);
  button = $('<li></li>').append(anchor);
  return button[0];
};

module.exports = Toolbar = (function(superClass) {
  var HIDE_CLASS;

  extend(Toolbar, superClass);

  function Toolbar() {
    return Toolbar.__super__.constructor.apply(this, arguments);
  }

  HIDE_CLASS = 'annotator-hide';

  Toolbar.prototype.events = {
    'setVisibleHighlights': 'onSetVisibleHighlights'
  };

  Toolbar.prototype.html = '<div class="annotator-toolbar"></div>';

  Toolbar.prototype.pluginInit = function() {
    var item, items, list;
    this.annotator.toolbar = this.toolbar = $(this.html);
    if (this.options.container != null) {
      $(this.options.container).append(this.toolbar);
    } else {
      $(this.element).append(this.toolbar);
    }
    items = [
      {
        "title": polyglot().t("Close Sidebar"),
        "class": "annotator-frame-button--sidebar_close h-icon-close",
        "name": "sidebar-close",
        "on": {
          "click": (function(_this) {
            return function(event) {
              event.preventDefault();
              event.stopPropagation();
              _this.annotator.hide();
              return _this.toolbar.find('[name=sidebar-close]').hide();
            };
          })(this)
        }
      }, {
        "title": polyglot().t("Feedback"),
        "class": "annotator-frame-button--sidebar_toggle h-icon-chevron-left",
        "name": "sidebar-toggle",
        "on": {
          "click": (function(_this) {
            return function(event) {
              event.preventDefault();
              event.stopPropagation();
              return _this.annotator.show();
            };
          })(this)
        }
      }, {
        "title": polyglot().t("Hide Highlights"),
        "class": "h-icon-visibility",
        "name": "highlight-visibility",
        "on": {
          "click": (function(_this) {
            return function(event) {
              var state;
              event.preventDefault();
              event.stopPropagation();
              state = !_this.annotator.visibleHighlights;
              return _this.annotator.setAllVisibleHighlights(state);
            };
          })(this)
        }
      }, {
        "title": polyglot().t("New Page Note"),
        "class": "h-icon-note",
        "name": "insert-comment",
        "on": {
          "click": (function(_this) {
            return function(event) {
              event.preventDefault();
              event.stopPropagation();
              _this.annotator.createAnnotation();
              return _this.annotator.show();
            };
          })(this)
        }
      }
    ];
    this.buttons = $((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        results.push(makeButton(item));
      }
      return results;
    })());
    list = $('<ul></ul>');
    this.buttons.appendTo(list);
    this.toolbar.append(list);
    return this.toolbar.on('mouseup', 'a', function(event) {
      return $(event.target).blur();
    });
  };

  Toolbar.prototype.onSetVisibleHighlights = function(state) {
    if (state) {
      return $('[name=highlight-visibility]').removeClass('h-icon-visibility-off').addClass('h-icon-visibility').prop('title', 'Hide Highlights');
    } else {
      return $('[name=highlight-visibility]').removeClass('h-icon-visibility').addClass('h-icon-visibility-off').prop('title', 'Show Highlights');
    }
  };

  Toolbar.prototype.disableMinimizeBtn = function() {
    return $('[name=sidebar-toggle]').remove();
  };

  Toolbar.prototype.disableHighlightsBtn = function() {
    return $('[name=highlight-visibility]').remove();
  };

  Toolbar.prototype.disableNewNoteBtn = function() {
    return $('[name=insert-comment]').remove();
  };

  Toolbar.prototype.disableCloseBtn = function() {
    return $('[name=sidebar-close]').remove();
  };

  Toolbar.prototype.getWidth = function() {
    return parseInt(window.getComputedStyle(this.toolbar[0]).width);
  };

  Toolbar.prototype.hideCloseBtn = function() {
    return $('[name=sidebar-close]').hide();
  };

  Toolbar.prototype.showCloseBtn = function() {
    return $('[name=sidebar-close]').show();
  };

  Toolbar.prototype.showCollapseSidebarBtn = function() {
    return $('[name=sidebar-toggle]').removeClass('h-icon-chevron-left').addClass('h-icon-chevron-right');
  };

  Toolbar.prototype.showExpandSidebarBtn = function() {
    return $('[name=sidebar-toggle]').removeClass('h-icon-chevron-right').addClass('h-icon-chevron-left');
  };

  return Toolbar;

})(Plugin);


},{"../../shared/polyglot":100,"../plugin":82,"jquery":"jquery"}],89:[function(require,module,exports){
'use strict';

/**
 * Returns true if the start point of a selection occurs after the end point,
 * in document order.
 */

function isSelectionBackwards(selection) {
  if (selection.focusNode === selection.anchorNode) {
    return selection.focusOffset < selection.anchorOffset;
  }

  var range = selection.getRangeAt(0);
  return range.startContainer === selection.focusNode;
}

/**
 * Returns true if `node` lies within a range.
 *
 * This is a simplified version of `Range.isPointInRange()` for compatibility
 * with IE.
 *
 * @param {Range} range
 * @param {Node} node
 */
function isNodeInRange(range, node) {
  if (node === range.startContainer || node === range.endContainer) {
    return true;
  }

  var nodeRange = node.ownerDocument.createRange();
  nodeRange.selectNode(node);
  var isAtOrBeforeStart = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0;
  var isAtOrAfterEnd = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
  nodeRange.detach();
  return isAtOrBeforeStart && isAtOrAfterEnd;
}

/**
 * Iterate over all Node(s) in `range` in document order and invoke `callback`
 * for each of them.
 *
 * @param {Range} range
 * @param {Function} callback
 */
function forEachNodeInRange(range, callback) {
  var root = range.commonAncestorContainer;

  // The `whatToShow`, `filter` and `expandEntityReferences` arguments are
  // mandatory in IE although optional according to the spec.
  var nodeIter = root.ownerDocument.createNodeIterator(root, NodeFilter.SHOW_ALL, null /* filter */, false /* expandEntityReferences */);

  var currentNode;
  while (currentNode = nodeIter.nextNode()) {
    // eslint-disable-line no-cond-assign
    if (isNodeInRange(range, currentNode)) {
      callback(currentNode);
    }
  }
}

/**
 * Returns the bounding rectangles of non-whitespace text nodes in `range`.
 *
 * @param {Range} range
 * @return {Array<Rect>} Array of bounding rects in viewport coordinates.
 */
function getTextBoundingBoxes(range) {
  var whitespaceOnly = /^\s*$/;
  var textNodes = [];
  forEachNodeInRange(range, function (node) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.match(whitespaceOnly)) {
      textNodes.push(node);
    }
  });

  var rects = [];
  textNodes.forEach(function (node) {
    var nodeRange = node.ownerDocument.createRange();
    nodeRange.selectNodeContents(node);
    if (node === range.startContainer) {
      nodeRange.setStart(node, range.startOffset);
    }
    if (node === range.endContainer) {
      nodeRange.setEnd(node, range.endOffset);
    }
    if (nodeRange.collapsed) {
      // If the range ends at the start of this text node or starts at the end
      // of this node then do not include it.
      return;
    }

    // Measure the range and translate from viewport to document coordinates
    var viewportRects = Array.from(nodeRange.getClientRects());
    nodeRange.detach();
    rects = rects.concat(viewportRects);
  });
  return rects;
}

/**
 * Returns the rectangle, in viewport coordinates, for the line of text
 * containing the focus point of a Selection.
 *
 * Returns null if the selection is empty.
 *
 * @param {Selection} selection
 * @return {Rect|null}
 */
function selectionFocusRect(selection) {
  if (selection.isCollapsed) {
    return null;
  }
  var textBoxes = getTextBoundingBoxes(selection.getRangeAt(0));
  if (textBoxes.length === 0) {
    return null;
  }

  if (isSelectionBackwards(selection)) {
    return textBoxes[0];
  } else {
    return textBoxes[textBoxes.length - 1];
  }
}

module.exports = {
  getTextBoundingBoxes: getTextBoundingBoxes,
  isNodeInRange: isNodeInRange,
  isSelectionBackwards: isSelectionBackwards,
  selectionFocusRect: selectionFocusRect
};

},{}],90:[function(require,module,exports){
'use strict';

var observable = require('./util/observable');

/** Returns the selected `DOMRange` in `document`. */
function selectedRange(document) {
  var selection = document.getSelection();
  if (!selection.rangeCount || selection.getRangeAt(0).collapsed) {
    return null;
  } else {
    return selection.getRangeAt(0);
  }
}

/**
 * Returns an Observable stream of text selections in the current document.
 *
 * New values are emitted when the user finishes making a selection
 * (represented by a `DOMRange`) or clears a selection (represented by `null`).
 *
 * A value will be emitted with the selected range at the time of subscription
 * on the next tick.
 *
 * @return Observable<DOMRange|null>
 */
function selections(document) {

  // Get a stream of selection changes that occur whilst the user is not
  // making a selection with the mouse.
  var isMouseDown;
  var selectionEvents = observable.listen(document, ['mousedown', 'mouseup', 'selectionchange']).filter(function (event) {
    if (event.type === 'mousedown' || event.type === 'mouseup') {
      isMouseDown = event.type === 'mousedown';
      return false;
    } else {
      return !isMouseDown;
    }
  });

  var events = observable.merge([
  // Add a delay before checking the state of the selection because
  // the selection is not updated immediately after a 'mouseup' event
  // but only on the next tick of the event loop.
  observable.buffer(10, observable.listen(document, ['mouseup'])),

  // Buffer selection changes to avoid continually emitting events whilst the
  // user drags the selection handles on mobile devices
  observable.buffer(100, selectionEvents),

  // Emit an initial event on the next tick
  observable.delay(0, observable.Observable.of({}))]);

  return events.map(function () {
    return selectedRange(document);
  });
}

module.exports = selections;

},{"./util/observable":94}],91:[function(require,module,exports){
'use strict';

var SIDEBAR_TRIGGER_BTN_ATTR = 'data-hypothesis-trigger';

/**
 * Show the sidebar when user clicks on an element with the
 * trigger data attribute.
 *
 * @param {Element} rootEl - The DOM element which contains the trigger elements.
 * @param {Object} showFn - Function which shows the sidebar.
 */

function trigger(rootEl, showFn) {

  var triggerElems = rootEl.querySelectorAll('[' + SIDEBAR_TRIGGER_BTN_ATTR + ']');

  Array.from(triggerElems).forEach(function (triggerElem) {
    triggerElem.addEventListener('click', handleCommand);
  });

  function handleCommand(event) {
    showFn();
    event.stopPropagation();
  }
}

module.exports = trigger;

},{}],92:[function(require,module,exports){
var $, Hammer, Host, MIN_RESIZE, Sidebar, annotationCounts, events, extend, features, raf, sidebarTrigger,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

extend = require('extend');

raf = require('raf');

Hammer = require('hammerjs');

$ = require('jquery');

Host = require('./host');

annotationCounts = require('./annotation-counts');

sidebarTrigger = require('./sidebar-trigger');

events = require('../shared/bridge-events');

features = require('./features');

MIN_RESIZE = 280;

module.exports = Sidebar = (function(superClass) {
  extend1(Sidebar, superClass);

  Sidebar.prototype.options = {
    Document: {},
    TextSelection: {},
    BucketBar: {
      container: '.annotator-frame'
    },
    Toolbar: {
      container: '.annotator-frame'
    }
  };

  Sidebar.prototype.renderFrame = null;

  Sidebar.prototype.gestureState = null;

  function Sidebar(element, config) {
    this.onSwipe = bind(this.onSwipe, this);
    this.onPan = bind(this.onPan, this);
    this._notifyOfLayoutChange = bind(this._notifyOfLayoutChange, this);
    var ref, serviceConfig;
    Sidebar.__super__.constructor.apply(this, arguments);
    this.hide();
    if (config.openSidebar || config.annotations || config.query) {
      this.on('panelReady', (function(_this) {
        return function() {
          return _this.show();
        };
      })(this));
    }
    if (this.plugins.BucketBar != null) {
      this.plugins.BucketBar.element.on('mouseup', (function(_this) {
        return function(event) {
          return _this.showBucketList();
        };
      })(this));
    }
    if (this.plugins.Toolbar != null) {
      this.toolbarWidth = this.plugins.Toolbar.getWidth();
      if (config.theme === 'clean') {
        this.plugins.Toolbar.disableMinimizeBtn();
        this.plugins.Toolbar.disableHighlightsBtn();
        this.plugins.Toolbar.disableNewNoteBtn();
      } else if (config.theme === 'custom') {
        this.plugins.Toolbar.disableHighlightsBtn();
        this.plugins.Toolbar.disableNewNoteBtn();
        this.plugins.Toolbar.disableCloseBtn();
      } else {
        this.plugins.Toolbar.disableCloseBtn();
      }
      this._setupGestures();
    }
    serviceConfig = (ref = config.services) != null ? ref[0] : void 0;
    if (serviceConfig) {
      this.onLoginRequest = serviceConfig.onLoginRequest;
      this.onLogoutRequest = serviceConfig.onLogoutRequest;
      this.onSignupRequest = serviceConfig.onSignupRequest;
      this.onProfileRequest = serviceConfig.onProfileRequest;
      this.onHelpRequest = serviceConfig.onHelpRequest;
    }
    this.onLayoutChange = config.onLayoutChange;
    this._notifyOfLayoutChange(false);
    this._setupSidebarEvents();
  }

  Sidebar.prototype._setupSidebarEvents = function() {
    annotationCounts(document.body, this.crossframe);
    sidebarTrigger(document.body, (function(_this) {
      return function() {
        return _this.show();
      };
    })(this));
    features.init(this.crossframe);
    this.crossframe.on('showSidebar', (function(_this) {
      return function() {
        return _this.show();
      };
    })(this));
    this.crossframe.on('hideSidebar', (function(_this) {
      return function() {
        return _this.hide();
      };
    })(this));
    this.crossframe.on(events.LOGIN_REQUESTED, (function(_this) {
      return function() {
        if (_this.onLoginRequest) {
          return _this.onLoginRequest();
        }
      };
    })(this));
    this.crossframe.on(events.LOGOUT_REQUESTED, (function(_this) {
      return function() {
        if (_this.onLogoutRequest) {
          return _this.onLogoutRequest();
        }
      };
    })(this));
    this.crossframe.on(events.SIGNUP_REQUESTED, (function(_this) {
      return function() {
        if (_this.onSignupRequest) {
          return _this.onSignupRequest();
        }
      };
    })(this));
    this.crossframe.on(events.PROFILE_REQUESTED, (function(_this) {
      return function() {
        if (_this.onProfileRequest) {
          return _this.onProfileRequest();
        }
      };
    })(this));
    this.crossframe.on(events.HELP_REQUESTED, (function(_this) {
      return function() {
        if (_this.onHelpRequest) {
          return _this.onHelpRequest();
        }
      };
    })(this));
    return this;
  };

  Sidebar.prototype._setupGestures = function() {
    var $toggle, mgr, pan, swipe;
    $toggle = this.toolbar.find('[name=sidebar-toggle]');
    if ($toggle[0]) {
      $toggle.on('touchmove', function(event) {
        return event.preventDefault();
      });
      mgr = new Hammer.Manager($toggle[0]).on('panstart panend panleft panright', this.onPan).on('swipeleft swiperight', this.onSwipe);
      pan = mgr.add(new Hammer.Pan({
        direction: Hammer.DIRECTION_HORIZONTAL
      }));
      swipe = mgr.add(new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL
      }));
      swipe.recognizeWith(pan);
      this._initializeGestureState();
      return this;
    }
  };

  Sidebar.prototype._initializeGestureState = function() {
    return this.gestureState = {
      initial: null,
      final: null
    };
  };

  Sidebar.prototype._updateLayout = function() {
    if (this.renderFrame) {
      return;
    }
    return this.renderFrame = raf((function(_this) {
      return function() {
        var m, w;
        _this.renderFrame = null;
        if (_this.gestureState.final !== _this.gestureState.initial) {
          m = _this.gestureState.final;
          w = -m;
          _this.frame.css('margin-left', m + "px");
          if (w >= MIN_RESIZE) {
            _this.frame.css('width', w + "px");
          }
          return _this._notifyOfLayoutChange();
        }
      };
    })(this));
  };


  /**
   * Notify integrator when sidebar layout changes via `onLayoutChange` callback.
   *
   * @param [boolean] explicitExpandedState - `true` or `false` if the sidebar
   *   is being directly opened or closed, as opposed to being resized via
   *   the sidebar's drag handles.
   */

  Sidebar.prototype._notifyOfLayoutChange = function(explicitExpandedState) {
    var computedStyle, expanded, frameVisibleWidth, leftMargin, rect, toolbarWidth, width;
    toolbarWidth = this.toolbarWidth || 0;
    if (this.onLayoutChange) {
      rect = this.frame[0].getBoundingClientRect();
      computedStyle = window.getComputedStyle(this.frame[0]);
      width = parseInt(computedStyle.width);
      leftMargin = parseInt(computedStyle.marginLeft);
      frameVisibleWidth = toolbarWidth;
      if (explicitExpandedState != null) {
        if (explicitExpandedState) {
          frameVisibleWidth += width;
        }
      } else {
        if (leftMargin < MIN_RESIZE) {
          frameVisibleWidth += -leftMargin;
        } else {
          frameVisibleWidth += width;
        }
      }
      expanded = frameVisibleWidth > toolbarWidth;
      return this.onLayoutChange({
        expanded: expanded,
        width: expanded ? frameVisibleWidth : toolbarWidth,
        height: rect.height
      });
    }
  };

  Sidebar.prototype.onPan = function(event) {
    var d, m;
    switch (event.type) {
      case 'panstart':
        this._initializeGestureState();
        this.frame.addClass('annotator-no-transition');
        this.frame.css('pointer-events', 'none');
        return this.gestureState.initial = parseInt(getComputedStyle(this.frame[0]).marginLeft);
      case 'panend':
        this.frame.removeClass('annotator-no-transition');
        this.frame.css('pointer-events', '');
        if (this.gestureState.final <= -MIN_RESIZE) {
          this.show();
        } else {
          this.hide();
        }
        return this._initializeGestureState();
      case 'panleft':
      case 'panright':
        if (this.gestureState.initial == null) {
          return;
        }
        m = this.gestureState.initial;
        d = event.deltaX;
        this.gestureState.final = Math.min(Math.round(m + d), 0);
        return this._updateLayout();
    }
  };

  Sidebar.prototype.onSwipe = function(event) {
    switch (event.type) {
      case 'swipeleft':
        return this.show();
      case 'swiperight':
        return this.hide();
    }
  };

  Sidebar.prototype.show = function() {
    this.crossframe.call('sidebarOpened');
    this.toolbar = this.frame.find('.annotator-toolbar');
    this.toolbar.css({
      'display': 'none'
    });
    this.feedbackpanel = this.frame.find('[name=hyp_sidebar_frame]');
    this.feedbackpanel.css({
      'display': ''
    });
    return this._notifyOfLayoutChange(true);
  };

  Sidebar.prototype.hide = function() {
    this.toolbar = this.frame.find('.annotator-toolbar');
    this.toolbar.css({
      'display': ''
    });
    this.feedbackpanel = this.frame.find('[name=hyp_sidebar_frame]');
    this.feedbackpanel.css({
      'display': 'none'
    });
    this.setVisibleHighlights(false);
    return this._notifyOfLayoutChange(false);
  };

  Sidebar.prototype.isOpen = function() {
    return !this.frame.hasClass('annotator-collapsed');
  };

  Sidebar.prototype.setAllVisibleHighlights = function(shouldShowHighlights) {
    this.crossframe.call('setVisibleHighlights', shouldShowHighlights);
    return this.publish('setVisibleHighlights', shouldShowHighlights);
  };

  Sidebar.prototype.showBucketList = function() {
    var anchor, annotations, bucket, buckets, i, index, len, ref, ref1, ref2, ref3, tabs, tags;
    ref = [this.plugins.BucketBar.tabs, this.plugins.BucketBar.buckets], tabs = ref[0], buckets = ref[1];
    index = $(event.target)[0].className.includes('annotator-bucket-indicator') ? $(event.target) : $(event.target).parent();
    bucket = tabs.index(index);
    ref1 = [[], []], tags = ref1[0], annotations = ref1[1];
    ref2 = buckets[bucket];
    for (i = 0, len = ref2.length; i < len; i++) {
      anchor = ref2[i];
      tags.push(anchor.annotation.$tag);
    }
    event.stopPropagation();
    return (ref3 = this.crossframe) != null ? ref3.call('showBucketList', tags) : void 0;
  };

  return Sidebar;

})(Host);


},{"../shared/bridge-events":96,"./annotation-counts":65,"./features":72,"./host":78,"./sidebar-trigger":91,"extend":34,"hammerjs":39,"jquery":"jquery","raf":47}],93:[function(require,module,exports){
'use strict';

/**
 * Return all `<iframe>` elements under `container` which are annotate-able.
 *
 * @param {Element} container
 * @return {HTMLIFrameElement[]}
 */

function findFrames(container) {
  var frames = Array.from(container.getElementsByTagName('iframe'));
  return frames.filter(shouldEnableAnnotation);
}

// Check if the iframe has already been injected
function hasHypothesis(iframe) {
  return iframe.contentWindow.__hypothesis_frame === true;
}

// Inject embed.js into the iframe
function injectHypothesis(iframe, scriptUrl, config) {
  var configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(config);

  var src = scriptUrl;
  var embedElement = document.createElement('script');
  embedElement.className = 'js-hypothesis-embed';
  embedElement.async = true;
  embedElement.src = src;

  iframe.contentDocument.body.appendChild(configElement);
  iframe.contentDocument.body.appendChild(embedElement);
}

// Check if we can access this iframe's document
function isAccessible(iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}

/**
 * Return `true` if an iframe should be made annotate-able.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * "enable-annotation" attribute and must be visible.
 *
 * @param  {HTMLIFrameElement} iframe the frame being checked
 * @returns {boolean}   result of our validity checks
 */
function shouldEnableAnnotation(iframe) {
  // Ignore the Hypothesis sidebar.
  var isNotClientFrame = !iframe.classList.contains('h-sidebar-iframe');

  // Require iframes to opt into annotation support.
  //
  // Eventually we may want annotation to be enabled by default for iframes that
  // pass certain tests. However we need to resolve a number of issues before we
  // can do that. See https://github.com/hypothesis/client/issues/530
  var enabled = iframe.hasAttribute('enable-annotation');

  return isNotClientFrame && enabled;
}

function isDocumentReady(iframe, callback) {
  if (iframe.contentDocument.readyState === 'loading') {
    iframe.contentDocument.addEventListener('DOMContentLoaded', function () {
      callback();
    });
  } else {
    callback();
  }
}

function isLoaded(iframe, callback) {
  if (iframe.contentDocument.readyState !== 'complete') {
    iframe.addEventListener('load', function () {
      callback();
    });
  } else {
    callback();
  }
}

module.exports = {
  findFrames: findFrames,
  hasHypothesis: hasHypothesis,
  injectHypothesis: injectHypothesis,
  isAccessible: isAccessible,
  isLoaded: isLoaded,
  isDocumentReady: isDocumentReady
};

},{}],94:[function(require,module,exports){
'use strict';

/**
 * Functions (aka. 'operators') for generating and manipulating streams of
 * values using the Observable API.
 */

var Observable = require('zen-observable');

/**
 * Returns an observable of events emitted by a DOM event source
 * (eg. an Element, Document or Window).
 *
 * @param {EventTarget} src - The event source.
 * @param {Array<string>} eventNames - List of events to subscribe to
 */
function listen(src, eventNames) {
  return new Observable(function (observer) {
    var onNext = function onNext(event) {
      observer.next(event);
    };

    eventNames.forEach(function (event) {
      src.addEventListener(event, onNext);
    });

    return function () {
      eventNames.forEach(function (event) {
        src.removeEventListener(event, onNext);
      });
    };
  });
}

/**
 * Delay events from a source Observable by `delay` ms.
 */
function delay(delay, src) {
  return new Observable(function (obs) {
    var timeouts = [];
    var sub = src.subscribe({
      next: function next(value) {
        var t = setTimeout(function () {
          timeouts = timeouts.filter(function (other) {
            return other !== t;
          });
          obs.next(value);
        }, delay);
        timeouts.push(t);
      }
    });
    return function () {
      timeouts.forEach(clearTimeout);
      sub.unsubscribe();
    };
  });
}

/**
 * Buffers events from a source Observable, waiting for a pause of `delay`
 * ms with no events before emitting the last value from `src`.
 *
 * @param {number} delay
 * @param {Observable<T>} src
 * @return {Observable<T>}
 */
function buffer(delay, src) {
  return new Observable(function (obs) {
    var lastValue;
    var timeout;

    function onNext() {
      obs.next(lastValue);
    }

    var sub = src.subscribe({
      next: function next(value) {
        lastValue = value;
        clearTimeout(timeout);
        timeout = setTimeout(onNext, delay);
      }
    });

    return function () {
      sub.unsubscribe();
      clearTimeout(timeout);
    };
  });
}

/**
 * Merges multiple streams of values into a single stream.
 *
 * @param {Array<Observable>} sources
 * @return Observable
 */
function merge(sources) {
  return new Observable(function (obs) {
    var subs = sources.map(function (src) {
      return src.subscribe({
        next: function next(value) {
          obs.next(value);
        }
      });
    });

    return function () {
      subs.forEach(function (sub) {
        sub.unsubscribe();
      });
    };
  });
}

/** Drop the first `n` events from the `src` Observable. */
function drop(src, n) {
  var count = 0;
  return src.filter(function () {
    ++count;
    return count > n;
  });
}

module.exports = {
  buffer: buffer,
  delay: delay,
  drop: drop,
  listen: listen,
  merge: merge,
  Observable: Observable
};

},{"zen-observable":55}],95:[function(require,module,exports){
(function(){function h(a){return function(){return this[a]}}function l(a){return function(){return a}}var m=this;
function aa(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function n(a){return"string"==typeof a}function ba(a,b,c){return a.call.apply(a.bind,arguments)}function da(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}
function q(a,b,c){q=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ba:da;return q.apply(null,arguments)}function ea(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}}
function r(a){var b=t;function c(){}c.prototype=b.prototype;a.u=b.prototype;a.prototype=new c;a.t=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}}Function.prototype.bind=Function.prototype.bind||function(a,b){if(1<arguments.length){var c=Array.prototype.slice.call(arguments,1);c.unshift(this,a);return q.apply(null,c)}return q(this,a)};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function u(a,b,c){this.a=a;this.b=b||1;this.d=c||1};var fa=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function v(a,b){return-1!=a.indexOf(b)}function ga(a,b){return a<b?-1:a>b?1:0};var w=Array.prototype,ha=w.indexOf?function(a,b,c){return w.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(n(a))return n(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},x=w.forEach?function(a,b,c){w.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=n(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},ia=w.filter?function(a,b,c){return w.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=n(a)?
a.split(""):a,k=0;k<d;k++)if(k in g){var p=g[k];b.call(c,p,k,a)&&(e[f++]=p)}return e},z=w.reduce?function(a,b,c,d){d&&(b=q(b,d));return w.reduce.call(a,b,c)}:function(a,b,c,d){var e=c;x(a,function(c,g){e=b.call(d,e,c,g,a)});return e},ja=w.some?function(a,b,c){return w.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=n(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};
function ka(a,b){var c;a:{c=a.length;for(var d=n(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){c=e;break a}c=-1}return 0>c?null:n(a)?a.charAt(c):a[c]}function la(a){return w.concat.apply(w,arguments)}function ma(a,b,c){return 2>=arguments.length?w.slice.call(a,b):w.slice.call(a,b,c)};function na(a){var b=arguments.length;if(1==b&&"array"==aa(arguments[0]))return na.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};var A;a:{var oa=m.navigator;if(oa){var pa=oa.userAgent;if(pa){A=pa;break a}}A=""};function B(){return v(A,"Edge")};var qa=v(A,"Opera")||v(A,"OPR"),C=v(A,"Edge")||v(A,"Trident")||v(A,"MSIE"),ra=v(A,"Gecko")&&!(v(A.toLowerCase(),"webkit")&&!B())&&!(v(A,"Trident")||v(A,"MSIE"))&&!B(),sa=v(A.toLowerCase(),"webkit")&&!B();function ta(){var a=A;if(ra)return/rv\:([^\);]+)(\)|;)/.exec(a);if(C&&B())return/Edge\/([\d\.]+)/.exec(a);if(C)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(sa)return/WebKit\/(\S+)/.exec(a)}function ua(){var a=m.document;return a?a.documentMode:void 0}
var va=function(){if(qa&&m.opera){var a=m.opera.version;return"function"==aa(a)?a():a}var a="",b=ta();b&&(a=b?b[1]:"");return C&&!B()&&(b=ua(),b>parseFloat(a))?String(b):a}(),wa={};
function xa(a){if(!wa[a]){for(var b=0,c=fa(String(va)).split("."),d=fa(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",k=d[f]||"",p=RegExp("(\\d*)(\\D*)","g"),y=RegExp("(\\d*)(\\D*)","g");do{var F=p.exec(g)||["","",""],ca=y.exec(k)||["","",""];if(0==F[0].length&&0==ca[0].length)break;b=ga(0==F[1].length?0:parseInt(F[1],10),0==ca[1].length?0:parseInt(ca[1],10))||ga(0==F[2].length,0==ca[2].length)||ga(F[2],ca[2])}while(0==b)}wa[a]=0<=b}}
function ya(a){return C&&(B()||za>=a)}var Aa=m.document,Ba=ua(),za=!Aa||!C||!Ba&&B()?void 0:Ba||("CSS1Compat"==Aa.compatMode?parseInt(va,10):5);/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
var D=C&&!ya(9),Ca=C&&!ya(8);/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function E(a,b,c,d){this.a=a;this.nodeName=c;this.nodeValue=d;this.nodeType=2;this.parentNode=this.ownerElement=b}function Da(a,b){var c=Ca&&"href"==b.nodeName?a.getAttribute(b.nodeName,2):b.nodeValue;return new E(b,a,b.nodeName,c)};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function Ea(a){this.b=a;this.a=0}function Fa(a){a=a.match(Ga);for(var b=0;b<a.length;b++)Ha.test(a[b])&&a.splice(b,1);return new Ea(a)}var Ga=RegExp("\\$?(?:(?![0-9-])[\\w-]+:)?(?![0-9-])[\\w-]+|\\/\\/|\\.\\.|::|\\d+(?:\\.\\d*)?|\\.\\d+|\"[^\"]*\"|'[^']*'|[!<>]=|\\s+|.","g"),Ha=/^\s/;function G(a,b){return a.b[a.a+(b||0)]}function H(a){return a.b[a.a++]}function Ia(a){return a.b.length<=a.a};na("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));!ra&&!C||C&&ya(9)||ra&&xa("1.9.1");C&&xa("9");function Ja(a,b){if(a.contains&&1==b.nodeType)return a==b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a==b||Boolean(a.compareDocumentPosition(b)&16);for(;b&&a!=b;)b=b.parentNode;return b==a}
function Ka(a,b){if(a==b)return 0;if(a.compareDocumentPosition)return a.compareDocumentPosition(b)&2?1:-1;if(C&&!ya(9)){if(9==a.nodeType)return-1;if(9==b.nodeType)return 1}if("sourceIndex"in a||a.parentNode&&"sourceIndex"in a.parentNode){var c=1==a.nodeType,d=1==b.nodeType;if(c&&d)return a.sourceIndex-b.sourceIndex;var e=a.parentNode,f=b.parentNode;return e==f?La(a,b):!c&&Ja(e,b)?-1*Ma(a,b):!d&&Ja(f,a)?Ma(b,a):(c?a.sourceIndex:e.sourceIndex)-(d?b.sourceIndex:f.sourceIndex)}d=9==a.nodeType?a:a.ownerDocument||
a.document;c=d.createRange();c.selectNode(a);c.collapse(!0);d=d.createRange();d.selectNode(b);d.collapse(!0);return c.compareBoundaryPoints(m.Range.START_TO_END,d)}function Ma(a,b){var c=a.parentNode;if(c==b)return-1;for(var d=b;d.parentNode!=c;)d=d.parentNode;return La(d,a)}function La(a,b){for(var c=b;c=c.previousSibling;)if(c==a)return-1;return 1};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function I(a){var b=null,c=a.nodeType;1==c&&(b=a.textContent,b=void 0==b||null==b?a.innerText:b,b=void 0==b||null==b?"":b);if("string"!=typeof b)if(D&&"title"==a.nodeName.toLowerCase()&&1==c)b=a.text;else if(9==c||1==c){a=9==c?a.documentElement:a.firstChild;for(var c=0,d=[],b="";a;){do 1!=a.nodeType&&(b+=a.nodeValue),D&&"title"==a.nodeName.toLowerCase()&&(b+=a.text),d[c++]=a;while(a=a.firstChild);for(;c&&!(a=d[--c].nextSibling););}}else b=a.nodeValue;return""+b}
function J(a,b,c){if(null===b)return!0;try{if(!a.getAttribute)return!1}catch(d){return!1}Ca&&"class"==b&&(b="className");return null==c?!!a.getAttribute(b):a.getAttribute(b,2)==c}function Na(a,b,c,d,e){return(D?Oa:Pa).call(null,a,b,n(c)?c:null,n(d)?d:null,e||new K)}
function Oa(a,b,c,d,e){if(a instanceof L||8==a.b||c&&null===a.b){var f=b.all;if(!f)return e;a=Qa(a);if("*"!=a&&(f=b.getElementsByTagName(a),!f))return e;if(c){for(var g=[],k=0;b=f[k++];)J(b,c,d)&&g.push(b);f=g}for(k=0;b=f[k++];)"*"==a&&"!"==b.tagName||M(e,b);return e}Ra(a,b,c,d,e);return e}
function Pa(a,b,c,d,e){b.getElementsByName&&d&&"name"==c&&!C?(b=b.getElementsByName(d),x(b,function(b){a.a(b)&&M(e,b)})):b.getElementsByClassName&&d&&"class"==c?(b=b.getElementsByClassName(d),x(b,function(b){b.className==d&&a.a(b)&&M(e,b)})):a instanceof N?Ra(a,b,c,d,e):b.getElementsByTagName&&(b=b.getElementsByTagName(a.d()),x(b,function(a){J(a,c,d)&&M(e,a)}));return e}
function Sa(a,b,c,d,e){var f;if((a instanceof L||8==a.b||c&&null===a.b)&&(f=b.childNodes)){var g=Qa(a);if("*"!=g&&(f=ia(f,function(a){return a.tagName&&a.tagName.toLowerCase()==g}),!f))return e;c&&(f=ia(f,function(a){return J(a,c,d)}));x(f,function(a){"*"==g&&("!"==a.tagName||"*"==g&&1!=a.nodeType)||M(e,a)});return e}return Ta(a,b,c,d,e)}function Ta(a,b,c,d,e){for(b=b.firstChild;b;b=b.nextSibling)J(b,c,d)&&a.a(b)&&M(e,b);return e}
function Ra(a,b,c,d,e){for(b=b.firstChild;b;b=b.nextSibling)J(b,c,d)&&a.a(b)&&M(e,b),Ra(a,b,c,d,e)}function Qa(a){if(a instanceof N){if(8==a.b)return"!";if(null===a.b)return"*"}return a.d()};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function K(){this.b=this.a=null;this.i=0}function Ua(a){this.d=a;this.a=this.b=null}function Va(a,b){if(!a.a)return b;if(!b.a)return a;for(var c=a.a,d=b.a,e=null,f=null,g=0;c&&d;){var f=c.d,k=d.d;f==k||f instanceof E&&k instanceof E&&f.a==k.a?(f=c,c=c.a,d=d.a):0<Ka(c.d,d.d)?(f=d,d=d.a):(f=c,c=c.a);(f.b=e)?e.a=f:a.a=f;e=f;g++}for(f=c||d;f;)f.b=e,e=e.a=f,g++,f=f.a;a.b=e;a.i=g;return a}function Wa(a,b){var c=new Ua(b);c.a=a.a;a.b?a.a.b=c:a.a=a.b=c;a.a=c;a.i++}
function M(a,b){var c=new Ua(b);c.b=a.b;a.a?a.b.a=c:a.a=a.b=c;a.b=c;a.i++}function Xa(a){return(a=a.a)?a.d:null}function Ya(a){return(a=Xa(a))?I(a):""}function O(a,b){return new Za(a,!!b)}function Za(a,b){this.d=a;this.b=(this.c=b)?a.b:a.a;this.a=null}function P(a){var b=a.b;if(null==b)return null;var c=a.a=b;a.b=a.c?b.b:b.a;return c.d};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function $a(a){switch(a.nodeType){case 1:return ea(ab,a);case 9:return $a(a.documentElement);case 11:case 10:case 6:case 12:return bb;default:return a.parentNode?$a(a.parentNode):bb}}function bb(){return null}function ab(a,b){if(a.prefix==b)return a.namespaceURI||"http://www.w3.org/1999/xhtml";var c=a.getAttributeNode("xmlns:"+b);return c&&c.specified?c.value||null:a.parentNode&&9!=a.parentNode.nodeType?ab(a.parentNode,b):null};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function t(a){this.g=a;this.b=this.e=!1;this.d=null}function Q(a){return"\n  "+a.toString().split("\n").join("\n  ")}function cb(a,b){a.e=b}function db(a,b){a.b=b}function R(a,b){var c=a.a(b);return c instanceof K?+Ya(c):+c}function S(a,b){var c=a.a(b);return c instanceof K?Ya(c):""+c}function eb(a,b){var c=a.a(b);return c instanceof K?!!c.i:!!c};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function fb(a,b,c){t.call(this,a.g);this.c=a;this.f=b;this.k=c;this.e=b.e||c.e;this.b=b.b||c.b;this.c==gb&&(c.b||c.e||4==c.g||0==c.g||!b.d?b.b||b.e||4==b.g||0==b.g||!c.d||(this.d={name:c.d.name,l:b}):this.d={name:b.d.name,l:c})}r(fb);
function hb(a,b,c,d,e){b=b.a(d);c=c.a(d);var f;if(b instanceof K&&c instanceof K){e=O(b);for(d=P(e);d;d=P(e))for(b=O(c),f=P(b);f;f=P(b))if(a(I(d),I(f)))return!0;return!1}if(b instanceof K||c instanceof K){b instanceof K?e=b:(e=c,c=b);e=O(e);b=typeof c;for(d=P(e);d;d=P(e)){switch(b){case "number":d=+I(d);break;case "boolean":d=!!I(d);break;case "string":d=I(d);break;default:throw Error("Illegal primitive type for comparison.");}if(a(d,c))return!0}return!1}return e?"boolean"==typeof b||"boolean"==typeof c?
a(!!b,!!c):"number"==typeof b||"number"==typeof c?a(+b,+c):a(b,c):a(+b,+c)}fb.prototype.a=function(a){return this.c.j(this.f,this.k,a)};fb.prototype.toString=function(){var a="Binary Expression: "+this.c,a=a+Q(this.f);return a+=Q(this.k)};function ib(a,b,c,d){this.a=a;this.p=b;this.g=c;this.j=d}ib.prototype.toString=h("a");var jb={};function T(a,b,c,d){if(jb.hasOwnProperty(a))throw Error("Binary operator already created: "+a);a=new ib(a,b,c,d);return jb[a.toString()]=a}
T("div",6,1,function(a,b,c){return R(a,c)/R(b,c)});T("mod",6,1,function(a,b,c){return R(a,c)%R(b,c)});T("*",6,1,function(a,b,c){return R(a,c)*R(b,c)});T("+",5,1,function(a,b,c){return R(a,c)+R(b,c)});T("-",5,1,function(a,b,c){return R(a,c)-R(b,c)});T("<",4,2,function(a,b,c){return hb(function(a,b){return a<b},a,b,c)});T(">",4,2,function(a,b,c){return hb(function(a,b){return a>b},a,b,c)});T("<=",4,2,function(a,b,c){return hb(function(a,b){return a<=b},a,b,c)});
T(">=",4,2,function(a,b,c){return hb(function(a,b){return a>=b},a,b,c)});var gb=T("=",3,2,function(a,b,c){return hb(function(a,b){return a==b},a,b,c,!0)});T("!=",3,2,function(a,b,c){return hb(function(a,b){return a!=b},a,b,c,!0)});T("and",2,2,function(a,b,c){return eb(a,c)&&eb(b,c)});T("or",1,2,function(a,b,c){return eb(a,c)||eb(b,c)});/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function kb(a,b){if(b.a.length&&4!=a.g)throw Error("Primary expression must evaluate to nodeset if filter has predicate(s).");t.call(this,a.g);this.c=a;this.f=b;this.e=a.e;this.b=a.b}r(kb);kb.prototype.a=function(a){a=this.c.a(a);return lb(this.f,a)};kb.prototype.toString=function(){var a;a="Filter:"+Q(this.c);return a+=Q(this.f)};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function mb(a,b){if(b.length<a.o)throw Error("Function "+a.h+" expects at least"+a.o+" arguments, "+b.length+" given");if(null!==a.n&&b.length>a.n)throw Error("Function "+a.h+" expects at most "+a.n+" arguments, "+b.length+" given");a.s&&x(b,function(b,d){if(4!=b.g)throw Error("Argument "+d+" to function "+a.h+" is not of type Nodeset: "+b);});t.call(this,a.g);this.f=a;this.c=b;cb(this,a.e||ja(b,function(a){return a.e}));db(this,a.r&&!b.length||a.q&&!!b.length||ja(b,function(a){return a.b}))}r(mb);
mb.prototype.a=function(a){return this.f.j.apply(null,la(a,this.c))};mb.prototype.toString=function(){var a="Function: "+this.f;if(this.c.length)var b=z(this.c,function(a,b){return a+Q(b)},"Arguments:"),a=a+Q(b);return a};function nb(a,b,c,d,e,f,g,k,p){this.h=a;this.g=b;this.e=c;this.r=d;this.q=e;this.j=f;this.o=g;this.n=void 0!==k?k:g;this.s=!!p}nb.prototype.toString=h("h");var ob={};
function U(a,b,c,d,e,f,g,k){if(ob.hasOwnProperty(a))throw Error("Function already created: "+a+".");ob[a]=new nb(a,b,c,d,!1,e,f,g,k)}U("boolean",2,!1,!1,function(a,b){return eb(b,a)},1);U("ceiling",1,!1,!1,function(a,b){return Math.ceil(R(b,a))},1);U("concat",3,!1,!1,function(a,b){var c=ma(arguments,1);return z(c,function(b,c){return b+S(c,a)},"")},2,null);U("contains",2,!1,!1,function(a,b,c){return v(S(b,a),S(c,a))},2);U("count",1,!1,!1,function(a,b){return b.a(a).i},1,1,!0);
U("false",2,!1,!1,l(!1),0);U("floor",1,!1,!1,function(a,b){return Math.floor(R(b,a))},1);U("id",4,!1,!1,function(a,b){function c(a){if(D){var b=e.all[a];if(b){if(b.nodeType&&a==b.id)return b;if(b.length)return ka(b,function(b){return a==b.id})}return null}return e.getElementById(a)}var d=a.a,e=9==d.nodeType?d:d.ownerDocument,d=S(b,a).split(/\s+/),f=[];x(d,function(a){a=c(a);!a||0<=ha(f,a)||f.push(a)});f.sort(Ka);var g=new K;x(f,function(a){M(g,a)});return g},1);U("lang",2,!1,!1,l(!1),1);
U("last",1,!0,!1,function(a){if(1!=arguments.length)throw Error("Function last expects ()");return a.d},0);U("local-name",3,!1,!0,function(a,b){var c=b?Xa(b.a(a)):a.a;return c?c.localName||c.nodeName.toLowerCase():""},0,1,!0);U("name",3,!1,!0,function(a,b){var c=b?Xa(b.a(a)):a.a;return c?c.nodeName.toLowerCase():""},0,1,!0);U("namespace-uri",3,!0,!1,l(""),0,1,!0);U("normalize-space",3,!1,!0,function(a,b){return(b?S(b,a):I(a.a)).replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")},0,1);
U("not",2,!1,!1,function(a,b){return!eb(b,a)},1);U("number",1,!1,!0,function(a,b){return b?R(b,a):+I(a.a)},0,1);U("position",1,!0,!1,function(a){return a.b},0);U("round",1,!1,!1,function(a,b){return Math.round(R(b,a))},1);U("starts-with",2,!1,!1,function(a,b,c){b=S(b,a);a=S(c,a);return 0==b.lastIndexOf(a,0)},2);U("string",3,!1,!0,function(a,b){return b?S(b,a):I(a.a)},0,1);U("string-length",1,!1,!0,function(a,b){return(b?S(b,a):I(a.a)).length},0,1);
U("substring",3,!1,!1,function(a,b,c,d){c=R(c,a);if(isNaN(c)||Infinity==c||-Infinity==c)return"";d=d?R(d,a):Infinity;if(isNaN(d)||-Infinity===d)return"";c=Math.round(c)-1;var e=Math.max(c,0);a=S(b,a);if(Infinity==d)return a.substring(e);b=Math.round(d);return a.substring(e,c+b)},2,3);U("substring-after",3,!1,!1,function(a,b,c){b=S(b,a);a=S(c,a);c=b.indexOf(a);return-1==c?"":b.substring(c+a.length)},2);
U("substring-before",3,!1,!1,function(a,b,c){b=S(b,a);a=S(c,a);a=b.indexOf(a);return-1==a?"":b.substring(0,a)},2);U("sum",1,!1,!1,function(a,b){for(var c=O(b.a(a)),d=0,e=P(c);e;e=P(c))d+=+I(e);return d},1,1,!0);U("translate",3,!1,!1,function(a,b,c,d){b=S(b,a);c=S(c,a);var e=S(d,a);a=[];for(d=0;d<c.length;d++){var f=c.charAt(d);f in a||(a[f]=e.charAt(d))}c="";for(d=0;d<b.length;d++)f=b.charAt(d),c+=f in a?a[f]:f;return c},3);U("true",2,!1,!1,l(!0),0);/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function N(a,b){this.f=a;this.c=void 0!==b?b:null;this.b=null;switch(a){case "comment":this.b=8;break;case "text":this.b=3;break;case "processing-instruction":this.b=7;break;case "node":break;default:throw Error("Unexpected argument");}}function pb(a){return"comment"==a||"text"==a||"processing-instruction"==a||"node"==a}N.prototype.a=function(a){return null===this.b||this.b==a.nodeType};N.prototype.d=h("f");N.prototype.toString=function(){var a="Kind Test: "+this.f;null===this.c||(a+=Q(this.c));return a};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function qb(a){t.call(this,3);this.c=a.substring(1,a.length-1)}r(qb);qb.prototype.a=h("c");qb.prototype.toString=function(){return"Literal: "+this.c};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function L(a,b){this.h=a.toLowerCase();this.c=b?b.toLowerCase():"http://www.w3.org/1999/xhtml"}L.prototype.a=function(a){var b=a.nodeType;return 1!=b&&2!=b?!1:"*"!=this.h&&this.h!=a.nodeName.toLowerCase()?!1:this.c==(a.namespaceURI?a.namespaceURI.toLowerCase():"http://www.w3.org/1999/xhtml")};L.prototype.d=h("h");L.prototype.toString=function(){return"Name Test: "+("http://www.w3.org/1999/xhtml"==this.c?"":this.c+":")+this.h};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function rb(a){t.call(this,1);this.c=a}r(rb);rb.prototype.a=h("c");rb.prototype.toString=function(){return"Number: "+this.c};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function sb(a,b){t.call(this,a.g);this.f=a;this.c=b;this.e=a.e;this.b=a.b;if(1==this.c.length){var c=this.c[0];c.m||c.c!=tb||(c=c.k,"*"!=c.d()&&(this.d={name:c.d(),l:null}))}}r(sb);function ub(){t.call(this,4)}r(ub);ub.prototype.a=function(a){var b=new K;a=a.a;9==a.nodeType?M(b,a):M(b,a.ownerDocument);return b};ub.prototype.toString=l("Root Helper Expression");function vb(){t.call(this,4)}r(vb);vb.prototype.a=function(a){var b=new K;M(b,a.a);return b};vb.prototype.toString=l("Context Helper Expression");
function wb(a){return"/"==a||"//"==a}sb.prototype.a=function(a){var b=this.f.a(a);if(!(b instanceof K))throw Error("Filter expression must evaluate to nodeset.");a=this.c;for(var c=0,d=a.length;c<d&&b.i;c++){var e=a[c],f=O(b,e.c.a),g;if(e.e||e.c!=xb)if(e.e||e.c!=yb)for(g=P(f),b=e.a(new u(g));null!=(g=P(f));)g=e.a(new u(g)),b=Va(b,g);else g=P(f),b=e.a(new u(g));else{for(g=P(f);(b=P(f))&&(!g.contains||g.contains(b))&&b.compareDocumentPosition(g)&8;g=b);b=e.a(new u(g))}}return b};
sb.prototype.toString=function(){var a;a="Path Expression:"+Q(this.f);if(this.c.length){var b=z(this.c,function(a,b){return a+Q(b)},"Steps:");a+=Q(b)}return a};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function zb(a,b){this.a=a;this.b=!!b}
function lb(a,b,c){for(c=c||0;c<a.a.length;c++)for(var d=a.a[c],e=O(b),f=b.i,g,k=0;g=P(e);k++){var p=a.b?f-k:k+1;g=d.a(new u(g,p,f));if("number"==typeof g)p=p==g;else if("string"==typeof g||"boolean"==typeof g)p=!!g;else if(g instanceof K)p=0<g.i;else throw Error("Predicate.evaluate returned an unexpected type.");if(!p){p=e;g=p.d;var y=p.a;if(!y)throw Error("Next must be called at least once before remove.");var F=y.b,y=y.a;F?F.a=y:g.a=y;y?y.b=F:g.b=F;g.i--;p.a=null}}return b}
zb.prototype.toString=function(){return z(this.a,function(a,b){return a+Q(b)},"Predicates:")};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function V(a,b,c,d){t.call(this,4);this.c=a;this.k=b;this.f=c||new zb([]);this.m=!!d;b=this.f;b=0<b.a.length?b.a[0].d:null;a.b&&b&&(a=b.name,a=D?a.toLowerCase():a,this.d={name:a,l:b.l});a:{a=this.f;for(b=0;b<a.a.length;b++)if(c=a.a[b],c.e||1==c.g||0==c.g){a=!0;break a}a=!1}this.e=a}r(V);
V.prototype.a=function(a){var b=a.a,c=null,c=this.d,d=null,e=null,f=0;c&&(d=c.name,e=c.l?S(c.l,a):null,f=1);if(this.m)if(this.e||this.c!=Ab)if(a=O((new V(Bb,new N("node"))).a(a)),b=P(a))for(c=this.j(b,d,e,f);null!=(b=P(a));)c=Va(c,this.j(b,d,e,f));else c=new K;else c=Na(this.k,b,d,e),c=lb(this.f,c,f);else c=this.j(a.a,d,e,f);return c};V.prototype.j=function(a,b,c,d){a=this.c.d(this.k,a,b,c);return a=lb(this.f,a,d)};
V.prototype.toString=function(){var a;a="Step:"+Q("Operator: "+(this.m?"//":"/"));this.c.h&&(a+=Q("Axis: "+this.c));a+=Q(this.k);if(this.f.a.length){var b=z(this.f.a,function(a,b){return a+Q(b)},"Predicates:");a+=Q(b)}return a};function Cb(a,b,c,d){this.h=a;this.d=b;this.a=c;this.b=d}Cb.prototype.toString=h("h");var Db={};function W(a,b,c,d){if(Db.hasOwnProperty(a))throw Error("Axis already created: "+a);b=new Cb(a,b,c,!!d);return Db[a]=b}
W("ancestor",function(a,b){for(var c=new K,d=b;d=d.parentNode;)a.a(d)&&Wa(c,d);return c},!0);W("ancestor-or-self",function(a,b){var c=new K,d=b;do a.a(d)&&Wa(c,d);while(d=d.parentNode);return c},!0);
var tb=W("attribute",function(a,b){var c=new K,d=a.d();if("style"==d&&b.style&&D)return M(c,new E(b.style,b,"style",b.style.cssText)),c;var e=b.attributes;if(e)if(a instanceof N&&null===a.b||"*"==d)for(var d=0,f;f=e[d];d++)D?f.nodeValue&&M(c,Da(b,f)):M(c,f);else(f=e.getNamedItem(d))&&(D?f.nodeValue&&M(c,Da(b,f)):M(c,f));return c},!1),Ab=W("child",function(a,b,c,d,e){return(D?Sa:Ta).call(null,a,b,n(c)?c:null,n(d)?d:null,e||new K)},!1,!0);W("descendant",Na,!1,!0);
var Bb=W("descendant-or-self",function(a,b,c,d){var e=new K;J(b,c,d)&&a.a(b)&&M(e,b);return Na(a,b,c,d,e)},!1,!0),xb=W("following",function(a,b,c,d){var e=new K;do for(var f=b;f=f.nextSibling;)J(f,c,d)&&a.a(f)&&M(e,f),e=Na(a,f,c,d,e);while(b=b.parentNode);return e},!1,!0);W("following-sibling",function(a,b){for(var c=new K,d=b;d=d.nextSibling;)a.a(d)&&M(c,d);return c},!1);W("namespace",function(){return new K},!1);
var Eb=W("parent",function(a,b){var c=new K;if(9==b.nodeType)return c;if(2==b.nodeType)return M(c,b.ownerElement),c;var d=b.parentNode;a.a(d)&&M(c,d);return c},!1),yb=W("preceding",function(a,b,c,d){var e=new K,f=[];do f.unshift(b);while(b=b.parentNode);for(var g=1,k=f.length;g<k;g++){var p=[];for(b=f[g];b=b.previousSibling;)p.unshift(b);for(var y=0,F=p.length;y<F;y++)b=p[y],J(b,c,d)&&a.a(b)&&M(e,b),e=Na(a,b,c,d,e)}return e},!0,!0);
W("preceding-sibling",function(a,b){for(var c=new K,d=b;d=d.previousSibling;)a.a(d)&&Wa(c,d);return c},!0);var Fb=W("self",function(a,b){var c=new K;a.a(b)&&M(c,b);return c},!1);/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function Gb(a){t.call(this,1);this.c=a;this.e=a.e;this.b=a.b}r(Gb);Gb.prototype.a=function(a){return-R(this.c,a)};Gb.prototype.toString=function(){return"Unary Expression: -"+Q(this.c)};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function Hb(a){t.call(this,4);this.c=a;cb(this,ja(this.c,function(a){return a.e}));db(this,ja(this.c,function(a){return a.b}))}r(Hb);Hb.prototype.a=function(a){var b=new K;x(this.c,function(c){c=c.a(a);if(!(c instanceof K))throw Error("Path expression must evaluate to NodeSet.");b=Va(b,c)});return b};Hb.prototype.toString=function(){return z(this.c,function(a,b){return a+Q(b)},"Union Expression:")};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function Ib(a,b){this.a=a;this.b=b}function Jb(a){for(var b,c=[];;){X(a,"Missing right hand side of binary expression.");b=Kb(a);var d=H(a.a);if(!d)break;var e=(d=jb[d]||null)&&d.p;if(!e){a.a.a--;break}for(;c.length&&e<=c[c.length-1].p;)b=new fb(c.pop(),c.pop(),b);c.push(b,d)}for(;c.length;)b=new fb(c.pop(),c.pop(),b);return b}function X(a,b){if(Ia(a.a))throw Error(b);}function Lb(a,b){var c=H(a.a);if(c!=b)throw Error("Bad token, expected: "+b+" got: "+c);}
function Mb(a){a=H(a.a);if(")"!=a)throw Error("Bad token: "+a);}function Nb(a){a=H(a.a);if(2>a.length)throw Error("Unclosed literal string");return new qb(a)}function Ob(a){var b=H(a.a),c=b.indexOf(":");if(-1==c)return new L(b);var d=b.substring(0,c);a=a.b(d);if(!a)throw Error("Namespace prefix not declared: "+d);b=b.substr(c+1);return new L(b,a)}
function Pb(a){var b,c=[],d;if(wb(G(a.a))){b=H(a.a);d=G(a.a);if("/"==b&&(Ia(a.a)||"."!=d&&".."!=d&&"@"!=d&&"*"!=d&&!/(?![0-9])[\w]/.test(d)))return new ub;d=new ub;X(a,"Missing next location step.");b=Qb(a,b);c.push(b)}else{a:{b=G(a.a);d=b.charAt(0);switch(d){case "$":throw Error("Variable reference not allowed in HTML XPath");case "(":H(a.a);b=Jb(a);X(a,'unclosed "("');Lb(a,")");break;case '"':case "'":b=Nb(a);break;default:if(isNaN(+b))if(!pb(b)&&/(?![0-9])[\w]/.test(d)&&"("==G(a.a,1)){b=H(a.a);
b=ob[b]||null;H(a.a);for(d=[];")"!=G(a.a);){X(a,"Missing function argument list.");d.push(Jb(a));if(","!=G(a.a))break;H(a.a)}X(a,"Unclosed function argument list.");Mb(a);b=new mb(b,d)}else{b=null;break a}else b=new rb(+H(a.a))}"["==G(a.a)&&(d=new zb(Rb(a)),b=new kb(b,d))}if(b)if(wb(G(a.a)))d=b;else return b;else b=Qb(a,"/"),d=new vb,c.push(b)}for(;wb(G(a.a));)b=H(a.a),X(a,"Missing next location step."),b=Qb(a,b),c.push(b);return new sb(d,c)}
function Qb(a,b){var c,d,e;if("/"!=b&&"//"!=b)throw Error('Step op should be "/" or "//"');if("."==G(a.a))return d=new V(Fb,new N("node")),H(a.a),d;if(".."==G(a.a))return d=new V(Eb,new N("node")),H(a.a),d;var f;if("@"==G(a.a))f=tb,H(a.a),X(a,"Missing attribute name");else if("::"==G(a.a,1)){if(!/(?![0-9])[\w]/.test(G(a.a).charAt(0)))throw Error("Bad token: "+H(a.a));c=H(a.a);f=Db[c]||null;if(!f)throw Error("No axis with name: "+c);H(a.a);X(a,"Missing node name")}else f=Ab;c=G(a.a);if(/(?![0-9])[\w]/.test(c.charAt(0)))if("("==
G(a.a,1)){if(!pb(c))throw Error("Invalid node type: "+c);c=H(a.a);if(!pb(c))throw Error("Invalid type name: "+c);Lb(a,"(");X(a,"Bad nodetype");e=G(a.a).charAt(0);var g=null;if('"'==e||"'"==e)g=Nb(a);X(a,"Bad nodetype");Mb(a);c=new N(c,g)}else c=Ob(a);else if("*"==c)c=Ob(a);else throw Error("Bad token: "+H(a.a));e=new zb(Rb(a),f.a);return d||new V(f,c,e,"//"==b)}
function Rb(a){for(var b=[];"["==G(a.a);){H(a.a);X(a,"Missing predicate expression.");var c=Jb(a);b.push(c);X(a,"Unclosed predicate expression.");Lb(a,"]")}return b}function Kb(a){if("-"==G(a.a))return H(a.a),new Gb(Kb(a));var b=Pb(a);if("|"!=G(a.a))a=b;else{for(b=[b];"|"==H(a.a);)X(a,"Missing next union location path."),b.push(Pb(a));a.a.a--;a=new Hb(b)}return a};/*

 Copyright 2014 Software Freedom Conservancy

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function Sb(a,b){if(!a.length)throw Error("Empty XPath expression.");var c=Fa(a);if(Ia(c))throw Error("Invalid XPath expression.");b?"function"==aa(b)||(b=q(b.lookupNamespaceURI,b)):b=l(null);var d=Jb(new Ib(c,b));if(!Ia(c))throw Error("Bad token: "+H(c));this.evaluate=function(a,b){var c=d.a(new u(a));return new Y(c,b)}}
function Y(a,b){if(0==b)if(a instanceof K)b=4;else if("string"==typeof a)b=2;else if("number"==typeof a)b=1;else if("boolean"==typeof a)b=3;else throw Error("Unexpected evaluation result.");if(2!=b&&1!=b&&3!=b&&!(a instanceof K))throw Error("value could not be converted to the specified type");this.resultType=b;var c;switch(b){case 2:this.stringValue=a instanceof K?Ya(a):""+a;break;case 1:this.numberValue=a instanceof K?+Ya(a):+a;break;case 3:this.booleanValue=a instanceof K?0<a.i:!!a;break;case 4:case 5:case 6:case 7:var d=
O(a);c=[];for(var e=P(d);e;e=P(d))c.push(e instanceof E?e.a:e);this.snapshotLength=a.i;this.invalidIteratorState=!1;break;case 8:case 9:d=Xa(a);this.singleNodeValue=d instanceof E?d.a:d;break;default:throw Error("Unknown XPathResult type.");}var f=0;this.iterateNext=function(){if(4!=b&&5!=b)throw Error("iterateNext called with wrong result type");return f>=c.length?null:c[f++]};this.snapshotItem=function(a){if(6!=b&&7!=b)throw Error("snapshotItem called with wrong result type");return a>=c.length||
0>a?null:c[a]}}Y.ANY_TYPE=0;Y.NUMBER_TYPE=1;Y.STRING_TYPE=2;Y.BOOLEAN_TYPE=3;Y.UNORDERED_NODE_ITERATOR_TYPE=4;Y.ORDERED_NODE_ITERATOR_TYPE=5;Y.UNORDERED_NODE_SNAPSHOT_TYPE=6;Y.ORDERED_NODE_SNAPSHOT_TYPE=7;Y.ANY_UNORDERED_NODE_TYPE=8;Y.FIRST_ORDERED_NODE_TYPE=9;function Tb(a){this.lookupNamespaceURI=$a(a)}
function Ub(a){a=a||m;var b=a.document;b.evaluate||(a.XPathResult=Y,b.evaluate=function(a,b,e,f){return(new Sb(a,e)).evaluate(b,f)},b.createExpression=function(a,b){return new Sb(a,b)},b.createNSResolver=function(a){return new Tb(a)})}var Vb=["wgxpath","install"],Z=m;Vb[0]in Z||!Z.execScript||Z.execScript("var "+Vb[0]);for(var Wb;Vb.length&&(Wb=Vb.shift());)Vb.length||void 0===Ub?Z[Wb]?Z=Z[Wb]:Z=Z[Wb]={}:Z[Wb]=Ub;})()

},{}],96:[function(require,module,exports){
'use strict';

/**
 * This module defines the set of global events that are dispatched
 * across the bridge between the sidebar and annotator
 */

module.exports = {
  // Events that the sidebar sends to the annotator
  // ----------------------------------------------

  /**
   * The updated feature flags for the user
   */
  FEATURE_FLAGS_UPDATED: 'featureFlagsUpdated',

  /**
   * The sidebar is asking the annotator to open the partner site help page.
   */
  HELP_REQUESTED: 'helpRequested',

  /** The sidebar is asking the annotator to do a partner site log in
   *  (for example, pop up a log in window). This is used when the client is
   *  embedded in a partner site and a log in button in the client is clicked.
   */
  LOGIN_REQUESTED: 'loginRequested',

  /** The sidebar is asking the annotator to do a partner site log out.
   *  This is used when the client is embedded in a partner site and a log out
   *  button in the client is clicked.
   */
  LOGOUT_REQUESTED: 'logoutRequested',

  /**
   * The sidebar is asking the annotator to open the partner site profile page.
   */
  PROFILE_REQUESTED: 'profileRequested',

  /**
   * The set of annotations was updated.
   */
  PUBLIC_ANNOTATION_COUNT_CHANGED: 'publicAnnotationCountChanged',

  /**
   * The sidebar is asking the annotator to do a partner site sign-up.
   */
  SIGNUP_REQUESTED: 'signupRequested'

  // Events that the annotator sends to the sidebar
  // ----------------------------------------------
};

},{}],97:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var extend = require('extend');

var RPC = require('./frame-rpc');

/**
 * The Bridge service sets up a channel between frames and provides an events
 * API on top of it.
 */

var Bridge = function () {
  function Bridge() {
    _classCallCheck(this, Bridge);

    this.links = [];
    this.channelListeners = {};
    this.onConnectListeners = [];
  }

  /**
   * Destroy all channels created with `createChannel`.
   *
   * This removes the event listeners for messages arriving from other windows.
   */


  _createClass(Bridge, [{
    key: 'destroy',
    value: function destroy() {
      Array.from(this.links).map(function (link) {
        return link.channel.destroy();
      });
    }

    /**
     * Create a communication channel between this window and `source`.
     *
     * The created channel is added to the list of channels which `call`
     * and `on` send and receive messages over.
     *
     * @param {Window} source - The source window.
     * @param {string} origin - The origin of the document in `source`.
     * @param {string} token
     * @return {RPC} - Channel for communicating with the window.
     */

  }, {
    key: 'createChannel',
    value: function createChannel(source, origin, token) {
      var _this = this;

      var channel = null;
      var connected = false;

      var ready = function ready() {
        if (connected) {
          return;
        }
        connected = true;
        Array.from(_this.onConnectListeners).forEach(function (cb) {
          return cb.call(null, channel, source);
        });
      };

      var connect = function connect(_token, cb) {
        if (_token === token) {
          cb();
          ready();
        }
      };

      var listeners = extend({ connect: connect }, this.channelListeners);

      // Set up a channel
      channel = new RPC(window, source, origin, listeners);

      // Fire off a connection attempt
      channel.call('connect', token, ready);

      // Store the newly created channel in our collection
      this.links.push({
        channel: channel,
        window: source
      });

      return channel;
    }

    /**
     * Make a method call on all channels, collect the results and pass them to a
     * callback when all results are collected.
     *
     * @param {string} method - Name of remote method to call.
     * @param {any[]} args - Arguments to method.
     * @param [Function] callback - Called with an array of results.
     */

  }, {
    key: 'call',
    value: function call(method) {
      var _this2 = this;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var cb;
      if (typeof args[args.length - 1] === 'function') {
        cb = args[args.length - 1];
        args = args.slice(0, -1);
      }

      var _makeDestroyFn = function _makeDestroyFn(c) {
        return function (error) {
          c.destroy();
          _this2.links = Array.from(_this2.links).filter(function (l) {
            return l.channel !== c;
          }).map(function (l) {
            return l;
          });
          throw error;
        };
      };

      var promises = this.links.map(function (l) {
        var p = new Promise(function (resolve, reject) {
          var timeout = setTimeout(function () {
            return resolve(null);
          }, 1000);
          try {
            var _l$channel;

            return (_l$channel = l.channel).call.apply(_l$channel, [method].concat(_toConsumableArray(Array.from(args)), [function (err, result) {
              clearTimeout(timeout);
              if (err) {
                return reject(err);
              } else {
                return resolve(result);
              }
            }]));
          } catch (error) {
            var err = error;
            return reject(err);
          }
        });

        // Don't assign here. The disconnect is handled asynchronously.
        return p.catch(_makeDestroyFn(l.channel));
      });

      var resultPromise = Promise.all(promises);

      if (cb) {
        resultPromise = resultPromise.then(function (results) {
          return cb(null, results);
        }).catch(function (error) {
          return cb(error);
        });
      }

      return resultPromise;
    }

    /**
     * Register a callback to be invoked when any connected channel sends a
     * message to this `Bridge`.
     *
     * @param {string} method
     * @param {Function} callback
     */

  }, {
    key: 'on',
    value: function on(method, callback) {
      if (this.channelListeners[method]) {
        throw new Error('Listener \'' + method + '\' already bound in Bridge');
      }
      this.channelListeners[method] = callback;
      return this;
    }

    /**
     * Unregister any callbacks registered with `on`.
     *
     * @param {string} method
     */

  }, {
    key: 'off',
    value: function off(method) {
      delete this.channelListeners[method];
      return this;
    }

    /**
     * Add a function to be called upon a new connection.
     *
     * @param {Function} callback
     */

  }, {
    key: 'onConnect',
    value: function onConnect(callback) {
      this.onConnectListeners.push(callback);
      return this;
    }
  }]);

  return Bridge;
}();

module.exports = Bridge;

},{"./frame-rpc":99,"extend":34}],98:[function(require,module,exports){
var Discovery,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports = Discovery = (function() {
  Discovery.prototype.server = false;

  Discovery.prototype.origin = '*';

  Discovery.prototype.onDiscovery = null;

  Discovery.prototype.requestInProgress = false;

  function Discovery(target, options) {
    this.target = target;
    if (options == null) {
      options = {};
    }
    this._onMessage = bind(this._onMessage, this);
    this.stopDiscovery = bind(this.stopDiscovery, this);
    if (options.server) {
      this.server = options.server;
    }
    if (options.origin) {
      this.origin = options.origin;
    }
  }

  Discovery.prototype.startDiscovery = function(onDiscovery) {
    if (this.onDiscovery) {
      throw new Error('Discovery is already in progress, call .stopDiscovery() first');
    }
    this.onDiscovery = onDiscovery;
    this.target.addEventListener('message', this._onMessage, false);
    this._beacon();
  };

  Discovery.prototype.stopDiscovery = function() {
    this.onDiscovery = null;
    this.target.removeEventListener('message', this._onMessage);
  };

  Discovery.prototype._beacon = function() {
    var beaconMessage, child, i, len, parent, queue, ref;
    beaconMessage = this.server ? '__cross_frame_dhcp_offer' : '__cross_frame_dhcp_discovery';
    queue = [this.target.top];
    while (queue.length) {
      parent = queue.shift();
      if (parent !== this.target) {
        parent.postMessage(beaconMessage, this.origin);
      }
      ref = parent.frames;
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        queue.push(child);
      }
    }
  };

  Discovery.prototype._onMessage = function(event) {
    var data, discovered, match, messageType, origin, ref, reply, source, token;
    source = event.source, origin = event.origin, data = event.data;
    if (origin === 'null' || origin.match('moz-extension:') || window.location.protocol === 'moz-extension:') {
      origin = '*';
    }
    match = typeof data.match === "function" ? data.match(/^__cross_frame_dhcp_(discovery|offer|request|ack)(?::(\d+))?$/) : void 0;
    if (!match) {
      return;
    }
    messageType = match[1];
    token = match[2];
    ref = this._processMessage(messageType, token, origin), reply = ref.reply, discovered = ref.discovered, token = ref.token;
    if (reply) {
      source.postMessage('__cross_frame_dhcp_' + reply, origin);
    }
    if (discovered) {
      this.onDiscovery.call(null, source, origin, token);
    }
  };

  Discovery.prototype._processMessage = function(messageType, token, origin) {
    var discovered, reply;
    reply = null;
    discovered = false;
    if (this.server) {
      if (messageType === 'discovery') {
        reply = 'offer';
      } else if (messageType === 'request') {
        token = this._generateToken();
        reply = 'ack' + ':' + token;
        discovered = true;
      } else if (messageType === 'offer' || messageType === 'ack') {
        throw new Error("A second Discovery server has been detected at " + origin + ".\nThis is unsupported and will cause unexpected behaviour.");
      }
    } else {
      if (messageType === 'offer') {
        if (!this.requestInProgress) {
          this.requestInProgress = true;
          reply = 'request';
        }
      } else if (messageType === 'ack') {
        this.requestInProgress = false;
        discovered = true;
      }
    }
    return {
      reply: reply,
      discovered: discovered,
      token: token
    };
  };

  Discovery.prototype._generateToken = function() {
    return ('' + Math.random()).replace(/\D/g, '');
  };

  return Discovery;

})();


},{}],99:[function(require,module,exports){
'use strict';

/* eslint-disable */

/** This software is released under the MIT license:

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
 */

/**
 * This is a modified copy of index.js from
 * https://github.com/substack/frame-rpc (see git log for the modifications),
 * upstream license above.
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var VERSION = '1.0.0';

module.exports = RPC;

function RPC(src, dst, origin, methods) {
    if (!(this instanceof RPC)) return new RPC(src, dst, origin, methods);
    var self = this;
    this.src = src;
    this.dst = dst;

    if (origin === '*') {
        this.origin = '*';
    } else {
        var uorigin = new URL(origin);
        this.origin = uorigin.protocol + '//' + uorigin.host;
    }

    this._sequence = 0;
    this._callbacks = {};

    this._onmessage = function (ev) {
        if (self._destroyed) return;
        if (self.dst !== ev.source) return;
        if (self.origin !== '*' && ev.origin !== self.origin) return;
        if (!ev.data || _typeof(ev.data) !== 'object') return;
        if (ev.data.protocol !== 'frame-rpc') return;
        if (!Array.isArray(ev.data.arguments)) return;
        self._handle(ev.data);
    };
    this.src.addEventListener('message', this._onmessage);
    this._methods = (typeof methods === 'function' ? methods(this) : methods) || {};
}

RPC.prototype.destroy = function () {
    this._destroyed = true;
    this.src.removeEventListener('message', this._onmessage);
};

RPC.prototype.call = function (method) {
    var args = [].slice.call(arguments, 1);
    return this.apply(method, args);
};

RPC.prototype.apply = function (method, args) {
    if (this._destroyed) return;
    var seq = this._sequence++;
    if (typeof args[args.length - 1] === 'function') {
        this._callbacks[seq] = args[args.length - 1];
        args = args.slice(0, -1);
    }
    this.dst.postMessage({
        protocol: 'frame-rpc',
        version: VERSION,
        sequence: seq,
        method: method,
        arguments: args
    }, this.origin);
};

RPC.prototype._handle = function (msg) {
    var self = this;
    if (self._destroyed) return;
    if (msg.hasOwnProperty('method')) {
        if (!this._methods.hasOwnProperty(msg.method)) return;
        var args = msg.arguments.concat(function () {
            self.dst.postMessage({
                protocol: 'frame-rpc',
                version: VERSION,
                response: msg.sequence,
                arguments: [].slice.call(arguments)
            }, self.origin);
        });
        this._methods[msg.method].apply(this._methods, args);
    } else if (msg.hasOwnProperty('response')) {
        var cb = this._callbacks[msg.response];
        delete this._callbacks[msg.response];
        if (cb) cb.apply(null, msg.arguments);
    }
};

},{}],100:[function(require,module,exports){
/* jshint node: true */
'use strict';

var Polyglot = require('node-polyglot');
var configFrom = require('../annotator/config/index');

function polyglot() {
  // Default Language Settings
  var phrases = {};
  // NOTE : This is a temporary solution. We get the locale value from the script but it's
  // going to be fetched from the cookie. It's not going to affect how you receive and mine the data
  var locale = configFrom(window).locale || 'en';

  function getValidPhrases(locale) {
    return {
      'en': require('../sidebar/translations/english_en'),
      'ja': require('../sidebar/translations/japanese_ja')
    }[locale];
  }

  phrases = getValidPhrases(locale);

  return new Polyglot({ locale: locale, phrases: phrases });
}
module.exports = polyglot;

},{"../annotator/config/index":68,"../sidebar/translations/english_en":103,"../sidebar/translations/japanese_ja":104,"node-polyglot":45}],101:[function(require,module,exports){
'use strict';

// `Object.assign()`-like helper. Used because this script needs to work
// in IE 10/11 without polyfills.

function assign(dest, src) {
  for (var k in src) {
    if (src.hasOwnProperty(k)) {
      dest[k] = src[k];
    }
  }
  return dest;
}

/**
 * Return a parsed `js-hypothesis-config` object from the document, or `{}`.
 *
 * Find all `<script class="js-hypothesis-config">` tags in the given document,
 * parse them as JSON, and return the parsed object.
 *
 * If there are no `js-hypothesis-config` tags in the document then return
 * `{}`.
 *
 * If there are multiple `js-hypothesis-config` tags in the document then merge
 * them into a single returned object (when multiple scripts contain the same
 * setting names, scripts further down in the document override those further
 * up).
 *
 * @param {Document|Element} document - The root element to search.
 */
function jsonConfigsFrom(document) {
  var config = {};
  var settingsElements = document.querySelectorAll('script.js-hypothesis-config');

  for (var i = 0; i < settingsElements.length; i++) {
    var settings;
    try {
      settings = JSON.parse(settingsElements[i].textContent);
    } catch (err) {
      console.warn('Could not parse settings from js-hypothesis-config tags', err);
      settings = {};
    }
    assign(config, settings);
  }

  return config;
}

module.exports = {
  jsonConfigsFrom: jsonConfigsFrom
};

},{}],102:[function(require,module,exports){
'use strict';

/**
 * Return the className according to the given parameters.
 *
 * @param {String} feedback_user - The user of the feedback
 * @param {String} user_id - Id of loggedin user
 * @param {String} type - hover, card or text
 *
 */

function getProperClassName(feedback_user, user_id, type) {
  if (feedback_user === user_id) {
    return { 'hover': 'annotator-hl-hover-yours', 'card': 'users__card-selected', 'text': 'annotator-hl-selected-yours' }[type];
  } else {
    return { 'hover': 'annotator-hl-hover-public', 'card': 'default__card-selected', 'text': 'annotator-hl-selected-public' }[type];
  }
}

module.exports = getProperClassName;

},{}],103:[function(require,module,exports){
module.exports={
    "This feedback is visible only to you.": "This feedback is visible only to you.",
    "Only me": "Only me",
    "This is a highlight. Click \\": "This is a highlight. Click \\",
    "Share": "Share",
    "Tweet link": "Tweet link",
    "Share on Facebook": "Share on Facebook",
    "Post on Google Plus": "Post on Google Plus",
    "Share via email": "Share via email",
    "Group.": "Group.",
    "Only group members will be able to view this annotation.": "Only group members will be able to view this annotation.",
    "Only me.": "Only me.",
    "No one else will be able to view this annotation.": "No one else will be able to view this annotation.",
    "Expand": "Expand",
    "Message not available.": "Message not available.",
    "You must be logged in to leave feedback.": "You must be logged in to leave feedback.",
    "View more information about the Creative Commons Public Domain dedication": "View more information about the Creative Commons Public Domain dedication",
    "Feedback can be freely reused by anyone for any purpose.": "Feedback can be freely reused by anyone for any purpose.",
    "Show replies": "Show replies",
    "Saving...": "Saving...",
    "Edit": "Edit",
    "Delete": "Delete",
    "Show the full excerpt": "Show the full excerpt",
    "More": "More",
    "Show the first few lines only": "Show the first few lines only",
    "Less": "Less",
    "Change the selected group": "Change the selected group",
    "Show public annotations": "Show public annotations",
    "View group activity and invite others": "View group activity and invite others",
    "Create a new group to share annotations": "Create a new group to share annotations",
    "New group": "New group",
    "Send us an email": "Send us an email",
    "Close": "Close",
    "Help": "Help",
    "About this version": "About this version",
    "Version": "Version",
    "User agent": "User agent",
    "URL": "URL",
    "PDF fingerprint": "PDF fingerprint",
    "Username": "Username",
    "Date": "Date",
    "Change the language": "Change the language",
    "Select the language": "Select the language",
    "This is a public annotation created with Hypothesis.": "This is a public annotation created with Hypothesis.",
    "Sign up": "Sign up",
    "Log in": "Log in",
    "View all your annotations": "View all your annotations",
    "account.settings": "account.settings",
    "Log out": "Log out",
    "My Annotations": "My Annotations",
    "Parsed as Markdown": "Parsed as Markdown",
    "Preview": "Preview",
    "Write": "Write",
    "Embolden text": "Embolden text",
    "Italicize text": "Italicize text",
    "Quote text": "Quote text",
    "Insert link": "Insert link",
    "Insert image": "Insert image",
    "Insert mathematical notation (LaTex is supported)": "Insert mathematical notation (LaTex is supported)",
    "Insert numbered list": "Insert numbered list",
    "Insert list": "Insert list",
    "Hidden from users.": "Hidden from users.",
    "Hide this feedback from non-moderators": "Hide this feedback from non-moderators",
    "Hide": "Hide",
    "Make this feedback visible to everyone": "Make this feedback visible to everyone",
    "Unhide": "Unhide",
    "New note": "New note",
    "Publish this feedback to": "Publish this feedback to",
    "Change annotation sharing setting": "Change annotation sharing setting",
    "Cancel changes to this feedback": "Cancel changes to this feedback",
    "Cancel": "Cancel",
    "Loading": "Loading",
    "Clear the search filter and show all feedback": "Clear the search filter and show all feedback",
    "Clear search": "Clear search",
    "Show all feedback and notes": "Show all feedback and notes",
    "Show all feedback": "Show all feedback",
    "Show all notes": "Show all notes",
    "Feedback": "Feedback",
    "Page Notes": "Page Notes",
    "Orphans": "Orphans",
    "There are no page notes in this group.": "There are no page notes in this group.",
    "There is no feedback in this group.": "There is no feedback in this group.",
    "Share the link below to show anyone these annotations and invite them to contribute their own.": "Share the link below to show anyone these annotations and invite them to contribute their own.",
    "This feedback is not available.": "This feedback is not available.",
    "You do not have permission to view this feedback.": "You do not have permission to view this feedback.",
    "How to get started": "How to get started",
    "Start annotating": "Start annotating",
    "Create page level notes": "Create page level notes",
    "View feedback through your profile": "View feedback through your profile",
    "Sort by": "Sort by",
    "Filter the feedback list": "Filter the feedback list",
    "Share this page": "Share this page",
    "Show feedback": "Show %{bucketLength} feedback",
    "Toggle or Resize Sidebar":"Toggle or Resize Sidebar",
    "Close Sidebar":"Close Sidebar",
    "Hide Highlights":"Hide Highlights",
    "Highlight": "Highlight"
}
},{}],104:[function(require,module,exports){
module.exports={
    "Feedback": "注釈",
    "Filter the feedback list": "アノテーションリストをフィルタリングする",
    "This feedback is visible only to you.": "このフィードバックはあなたにしか見えません。",
    "Change the selected group": "選択したグループを変更する",
    "Change the language": "言語を変更する",
    "Only me": "Only me",
    "This is a highlight. Click \\": "This is a highlight. Click \\",
    "Share": "Share",
    "Tweet link": "Tweet link",
    "Share on Facebook": "Share on Facebook",
    "Post on Google Plus": "Post on Google Plus",
    "Share via email": "Share via email",
    "Group.": "Group.",
    "Only group members will be able to view this annotation.": "Only group members will be able to view this annotation.",
    "Only me.": "Only me.",
    "No one else will be able to view this annotation.": "No one else will be able to view this annotation.",
    "Expand": "Expand",
    "Message not available.": "Message not available.",
    "You must be logged in to leave feedback.": "You must be logged in to leave feedback.",
    "View more information about the Creative Commons Public Domain dedication": "View more information about the Creative Commons Public Domain dedication",
    "Feedback can be freely reused by anyone for any purpose.": "Feedback can be freely reused by anyone for any purpose.",
    "Show replies": "Show replies",
    "Saving...": "Saving...",
    "Edit": "編集します",
    "Delete": "削除",
    "Show the full excerpt": "Show the full excerpt",
    "More": "More",
    "Show the first few lines only": "Show the first few lines only",
    "Less": "Less",
    "Show public annotations": "Show public annotations",
    "View group activity and invite others": "View group activity and invite others",
    "Create a new group to share annotations": "Create a new group to share annotations",
    "New group": "New group",
    "Send us an email": "Send us an email",
    "Close": "Close",
    "Help": "Help",
    "About this version": "About this version",
    "Version": "Version",
    "User agent": "User agent",
    "URL": "URL",
    "PDF fingerprint": "PDF fingerprint",
    "Username": "Username",
    "Date": "Date",
    "Select the language": "Select the language",
    "This is a public annotation created with Hypothesis.": "This is a public annotation created with Hypothesis.",
    "Sign up": "Sign up",
    "Log in": "Log in",
    "View all your annotations": "View all your annotations",
    "account.settings": "account.settings",
    "Log out": "Log out",
    "My Annotations": "My Annotations",
    "Parsed as Markdown": "Parsed as Markdown",
    "Preview": "Preview",
    "Write": "Write",
    "Embolden text": "Embolden text",
    "Italicize text": "Italicize text",
    "Quote text": "Quote text",
    "Insert link": "Insert link",
    "Insert image": "Insert image",
    "Insert mathematical notation (LaTex is supported)": "Insert mathematical notation (LaTex is supported)",
    "Insert numbered list": "Insert numbered list",
    "Insert list": "Insert list",
    "Hidden from users.": "Hidden from users.",
    "Hide this feedback from non-moderators": "Hide this feedback from non-moderators",
    "Hide": "Hide",
    "Make this feedback visible to everyone": "Make this feedback visible to everyone",
    "Unhide": "Unhide",
    "New note": "New note",
    "Publish this feedback to": "Publish this feedback to",
    "Change annotation sharing setting": "Change annotation sharing setting",
    "Cancel changes to this feedback": "Cancel changes to this feedback",
    "Cancel": "Cancel",
    "Loading": "Loading",
    "Clear the search filter and show all feedback": "Clear the search filter and show all feedback",
    "Clear search": "Clear search",
    "Show all feedback and notes": "Show all feedback and notes",
    "Show all feedback": "Show all feedback",
    "Show all notes": "Show all notes",
    "Page Notes": "Page Notes",
    "Orphans": "Orphans",
    "There are no page notes in this group.": "There are no page notes in this group.",
    "There is no feedback in this group.": "There is no feedback in this group.",
    "Share the link below to show anyone these annotations and invite them to contribute their own.": "Share the link below to show anyone these annotations and invite them to contribute their own.",
    "This feedback is not available.": "This feedback is not available.",
    "You do not have permission to view this feedback.": "You do not have permission to view this feedback.",
    "How to get started": "How to get started",
    "Start annotating": "Start annotating",
    "Create page level notes": "Create page level notes",
    "View feedback through your profile": "View feedback through your profile",
    "Sort by": "Sort by",
    "Share this page": "Share this page",
    "Show one annotation": "1つの注釈を表示する",
    "Show feedback": "%{bucketLength} つのフィードバックを表示",
    "Toggle or Resize Sidebar":"サイドバーの表示/非表示"
}
},{}]},{},[79])
//# sourceMappingURL=annotator.bundle.js.map

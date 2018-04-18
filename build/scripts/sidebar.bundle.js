(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/**
 * @license Angulartics v0.17.2
 * (c) 2013 Luis Farzati http://luisfarzati.github.io/angulartics
 * License: MIT
 */
(function(angular, analytics) {
'use strict';

var angulartics = window.angulartics || (window.angulartics = {});
angulartics.waitForVendorCount = 0;
angulartics.waitForVendorApi = function (objectName, delay, containsField, registerFn, onTimeout) {
  if (!onTimeout) { angulartics.waitForVendorCount++; }
  if (!registerFn) { registerFn = containsField; containsField = undefined; }
  if (!Object.prototype.hasOwnProperty.call(window, objectName) || (containsField !== undefined && window[objectName][containsField] === undefined)) {
    setTimeout(function () { angulartics.waitForVendorApi(objectName, delay, containsField, registerFn, true); }, delay);
  }
  else {
    angulartics.waitForVendorCount--;
    registerFn(window[objectName]);
  }
};

/**
 * @ngdoc overview
 * @name angulartics
 */
angular.module('angulartics', [])
.provider('$analytics', function () {
  var settings = {
    pageTracking: {
      autoTrackFirstPage: true,
      autoTrackVirtualPages: true,
      trackRelativePath: false,
      autoBasePath: false,
      basePath: ''
    },
    eventTracking: {},
    bufferFlushDelay: 1000, // Support only one configuration for buffer flush delay to simplify buffering
    developerMode: false // Prevent sending data in local/development environment
  };

  // List of known handlers that plugins can register themselves for
  var knownHandlers = [
    'pageTrack',
    'eventTrack',
    'setAlias',
    'setUsername',
    'setAlias',
    'setUserProperties',
    'setUserPropertiesOnce',
    'setSuperProperties',
    'setSuperPropertiesOnce'
  ];
  // Cache and handler properties will match values in 'knownHandlers' as the buffering functons are installed.
  var cache = {};
  var handlers = {};

  // General buffering handler
  var bufferedHandler = function(handlerName){
    return function(){
      if(angulartics.waitForVendorCount){
        if(!cache[handlerName]){ cache[handlerName] = []; }
        cache[handlerName].push(arguments);
      }
    };
  };

  // As handlers are installed by plugins, they get pushed into a list and invoked in order.
  var updateHandlers = function(handlerName, fn){
    if(!handlers[handlerName]){
      handlers[handlerName] = [];
    }
    handlers[handlerName].push(fn);
    return function(){
      var handlerArgs = arguments;
      angular.forEach(handlers[handlerName], function(handler){
        handler.apply(this, handlerArgs);
      }, this);
    };
  };

  // The api (returned by this provider) gets populated with handlers below.
  var api = {
    settings: settings
  };

  // Will run setTimeout if delay is > 0
  // Runs immediately if no delay to make sure cache/buffer is flushed before anything else.
  // Plugins should take care to register handlers by order of precedence.
  var onTimeout = function(fn, delay){
    if(delay){
      setTimeout(fn, delay);
    } else {
      fn();
    }
  };

  var provider = {
    $get: function() { return api; },
    api: api,
    settings: settings,
    virtualPageviews: function (value) { this.settings.pageTracking.autoTrackVirtualPages = value; },
    firstPageview: function (value) { this.settings.pageTracking.autoTrackFirstPage = value; },
    withBase: function (value) { this.settings.pageTracking.basePath = (value) ? angular.element('base').attr('href').slice(0, -1) : ''; },
    withAutoBase: function (value) { this.settings.pageTracking.autoBasePath = value; },
    developerMode: function(value) { this.settings.developerMode = value; }
  };

  // General function to register plugin handlers. Flushes buffers immediately upon registration according to the specified delay.
  var register = function(handlerName, fn){
    api[handlerName] = updateHandlers(handlerName, fn);
    var handlerSettings = settings[handlerName];
    var handlerDelay = (handlerSettings) ? handlerSettings.bufferFlushDelay : null;
    var delay = (handlerDelay !== null) ? handlerDelay : settings.bufferFlushDelay;
    angular.forEach(cache[handlerName], function (args, index) {
      onTimeout(function () { fn.apply(this, args); }, index * delay);
    });
  };

  var capitalize = function (input) {
      return input.replace(/^./, function (match) {
          return match.toUpperCase();
      });
  };

  // Adds to the provider a 'register#{handlerName}' function that manages multiple plugins and buffer flushing.
  var installHandlerRegisterFunction = function(handlerName){
    var registerName = 'register'+capitalize(handlerName);
    provider[registerName] = function(fn){
      register(handlerName, fn);
    };
    api[handlerName] = updateHandlers(handlerName, bufferedHandler(handlerName));
  };

  // Set up register functions for each known handler
  angular.forEach(knownHandlers, installHandlerRegisterFunction);
  return provider;
})

.run(['$rootScope', '$window', '$analytics', '$injector', function ($rootScope, $window, $analytics, $injector) {
  if ($analytics.settings.pageTracking.autoTrackFirstPage) {
    $injector.invoke(['$location', function ($location) {
      /* Only track the 'first page' if there are no routes or states on the page */
      var noRoutesOrStates = true;
      if ($injector.has('$route')) {
         var $route = $injector.get('$route');
         for (var route in $route.routes) {
           noRoutesOrStates = false;
           break;
         }
      } else if ($injector.has('$state')) {
        var $state = $injector.get('$state');
        for (var state in $state.get()) {
          noRoutesOrStates = false;
          break;
        }
      }
      if (noRoutesOrStates) {
        if ($analytics.settings.pageTracking.autoBasePath) {
          $analytics.settings.pageTracking.basePath = $window.location.pathname;
        }
        if ($analytics.settings.trackRelativePath) {
          var url = $analytics.settings.pageTracking.basePath + $location.url();
          $analytics.pageTrack(url, $location);
        } else {
          $analytics.pageTrack($location.absUrl(), $location);
        }
      }
    }]);
  }

  if ($analytics.settings.pageTracking.autoTrackVirtualPages) {
    $injector.invoke(['$location', function ($location) {
      if ($analytics.settings.pageTracking.autoBasePath) {
        /* Add the full route to the base. */
        $analytics.settings.pageTracking.basePath = $window.location.pathname + "#";
      }
      if ($injector.has('$route')) {
        $rootScope.$on('$routeChangeSuccess', function (event, current) {
          if (current && (current.$$route||current).redirectTo) return;
          var url = $analytics.settings.pageTracking.basePath + $location.url();
          $analytics.pageTrack(url, $location);
        });
      }
      if ($injector.has('$state')) {
        $rootScope.$on('$stateChangeSuccess', function (event, current) {
          var url = $analytics.settings.pageTracking.basePath + $location.url();
          $analytics.pageTrack(url, $location);
        });
      }
    }]);
  }
  if ($analytics.settings.developerMode) {
    angular.forEach($analytics, function(attr, name) {
      if (typeof attr === 'function') {
        $analytics[name] = function(){};
      }
    });
  }
}])

.directive('analyticsOn', ['$analytics', function ($analytics) {
  function isCommand(element) {
    return ['a:','button:','button:button','button:submit','input:button','input:submit'].indexOf(
      element.tagName.toLowerCase()+':'+(element.type||'')) >= 0;
  }

  function inferEventType(element) {
    if (isCommand(element)) return 'click';
    return 'click';
  }

  function inferEventName(element) {
    if (isCommand(element)) return element.innerText || element.value;
    return element.id || element.name || element.tagName;
  }

  function isProperty(name) {
    return name.substr(0, 9) === 'analytics' && ['On', 'Event', 'If', 'Properties', 'EventType'].indexOf(name.substr(9)) === -1;
  }

  function propertyName(name) {
    var s = name.slice(9); // slice off the 'analytics' prefix
    if (typeof s !== 'undefined' && s!==null && s.length > 0) {
      return s.substring(0, 1).toLowerCase() + s.substring(1);
    }
    else {
      return s;
    }
  }

  return {
    restrict: 'A',
    link: function ($scope, $element, $attrs) {
      var eventType = $attrs.analyticsOn || inferEventType($element[0]);
      var trackingData = {};

      angular.forEach($attrs.$attr, function(attr, name) {
        if (isProperty(name)) {
          trackingData[propertyName(name)] = $attrs[name];
          $attrs.$observe(name, function(value){
            trackingData[propertyName(name)] = value;
          });
        }
      });

      angular.element($element[0]).bind(eventType, function ($event) {
        var eventName = $attrs.analyticsEvent || inferEventName($element[0]);
        trackingData.eventType = $event.type;

        if($attrs.analyticsIf){
          if(! $scope.$eval($attrs.analyticsIf)){
            return; // Cancel this event if we don't pass the analytics-if condition
          }
        }
        // Allow components to pass through an expression that gets merged on to the event properties
        // eg. analytics-properites='myComponentScope.someConfigExpression.$analyticsProperties'
        if($attrs.analyticsProperties){
          angular.extend(trackingData, $scope.$eval($attrs.analyticsProperties));
        }
        $analytics.eventTrack(eventName, trackingData);
      });
    }
  };
}]);
})(angular);

},{}],2:[function(require,module,exports){
/**
 * Autofill event polyfill ##version:1.0.0##
 * (c) 2014 Google, Inc.
 * License: MIT
 */
(function(window) {
  var $ = window.jQuery || window.angular.element;
  var rootElement = window.document.documentElement,
    $rootElement = $(rootElement);

  addGlobalEventListener('change', markValue);
  addValueChangeByJsListener(markValue);

  $.prototype.checkAndTriggerAutoFillEvent = jqCheckAndTriggerAutoFillEvent;

  // Need to use blur and not change event
  // as Chrome does not fire change events in all cases an input is changed
  // (e.g. when starting to type and then finish the input by auto filling a username)
  addGlobalEventListener('blur', function(target) {
    // setTimeout needed for Chrome as it fills other
    // form fields a little later...
    window.setTimeout(function() {
      findParentForm(target).find('input').checkAndTriggerAutoFillEvent();
    }, 20);
  });

  window.document.addEventListener('DOMContentLoaded', function() {
    // mark all values that are present when the DOM is ready.
    // We don't need to trigger a change event here,
    // as js libs start with those values already being set!
    forEach(document.getElementsByTagName('input'), markValue);

    // The timeout is needed for Chrome as it auto fills
    // login forms some time after DOMContentLoaded!
    window.setTimeout(function() {
      $rootElement.find('input').checkAndTriggerAutoFillEvent();
    }, 200);
  }, false);

  return;

  // ----------

  function jqCheckAndTriggerAutoFillEvent() {
    var i, el;
    for (i=0; i<this.length; i++) {
      el = this[i];
      if (!valueMarked(el)) {
        markValue(el);
        triggerChangeEvent(el);
      }
    }
  }

  function valueMarked(el) {
    if (! ("$$currentValue" in el) ) {
      // First time we see an element we take it's value attribute
      // as real value. This might have been filled in the backend,
      // ...
      // Note: it's important to not use the value property here!
      el.$$currentValue = el.getAttribute('value');
    }

    var val = el.value,
         $$currentValue = el.$$currentValue;
    if (!val && !$$currentValue) {
      return true;
    }
    return val === $$currentValue;
  }

  function markValue(el) {
    el.$$currentValue = el.value;
  }

  function addValueChangeByJsListener(listener) {
    var jq = window.jQuery || window.angular.element,
        jqProto = jq.prototype;
    var _val = jqProto.val;
    jqProto.val = function(newValue) {
      var res = _val.apply(this, arguments);
      if (arguments.length > 0) {
        forEach(this, function(el) {
          listener(el, newValue);
        });
      }
      return res;
    };
  }

  function addGlobalEventListener(eventName, listener) {
    // Use a capturing event listener so that
    // we also get the event when it's stopped!
    // Also, the blur event does not bubble.
    rootElement.addEventListener(eventName, onEvent, true);

    function onEvent(event) {
      var target = event.target;
      listener(target);
    }
  }

  function findParentForm(el) {
    while (el) {
      if (el.nodeName === 'FORM') {
        return $(el);
      }
      el = el.parentNode;
    }
    return $();
  }

  function forEach(arr, listener) {
    if (arr.forEach) {
      return arr.forEach(listener);
    }
    var i;
    for (i=0; i<arr.length; i++) {
      listener(arr[i]);
    }
  }

  function triggerChangeEvent(element) {
    var doc = window.document;
    var event = doc.createEvent("HTMLEvents");
    event.initEvent("change", true, true);
    element.dispatchEvent(event);
  }



})(window);

},{}],3:[function(require,module,exports){
/*!
 * escape-html
 * Copyright(c) 2012-2013 TJ Holowaychuk
 * Copyright(c) 2015 Andreas Lubbe
 * Copyright(c) 2015 Tiancheng "Timothy" Gu
 * MIT Licensed
 */

'use strict';

/**
 * Module variables.
 * @private
 */

var matchHtmlRegExp = /["'&<>]/;

/**
 * Module exports.
 * @public
 */

module.exports = escapeHtml;

/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} string The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

function escapeHtml(string) {
  var str = '' + string;
  var match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html;
}

},{}],4:[function(require,module,exports){
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


},{}],5:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/,
    reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function(string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
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
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

}).call(this,window)

},{}],8:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;

},{"./_root":15}],9:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;

},{"./_Symbol":8,"./_getRawTag":12,"./_objectToString":13}],10:[function(require,module,exports){
(function (global){
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

}).call(this,window)

},{}],11:[function(require,module,exports){
var overArg = require('./_overArg');

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

module.exports = getPrototype;

},{"./_overArg":14}],12:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;

},{"./_Symbol":8}],13:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;

},{}],14:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],15:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;

},{"./_freeGlobal":10}],16:[function(require,module,exports){
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
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],17:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    getPrototype = require('./_getPrototype'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

module.exports = isPlainObject;

},{"./_baseGetTag":9,"./_getPrototype":11,"./isObjectLike":16}],18:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

/*global window, require, define */
(function(_window) {
  'use strict';

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng, _mathRNG, _nodeRNG, _whatwgRNG, _previousRoot;

  function setupBrowser() {
    // Allow for MSIE11 msCrypto
    var _crypto = _window.crypto || _window.msCrypto;

    if (!_rng && _crypto && _crypto.getRandomValues) {
      // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
      //
      // Moderately fast, high quality
      try {
        var _rnds8 = new Uint8Array(16);
        _whatwgRNG = _rng = function whatwgRNG() {
          _crypto.getRandomValues(_rnds8);
          return _rnds8;
        };
        _rng();
      } catch(e) {}
    }

    if (!_rng) {
      // Math.random()-based (RNG)
      //
      // If all else fails, use Math.random().  It's fast, but is of unspecified
      // quality.
      var  _rnds = new Array(16);
      _mathRNG = _rng = function() {
        for (var i = 0, r; i < 16; i++) {
          if ((i & 0x03) === 0) { r = Math.random() * 0x100000000; }
          _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
        }

        return _rnds;
      };
      if ('undefined' !== typeof console && console.warn) {
        console.warn("[SECURITY] node-uuid: crypto not usable, falling back to insecure Math.random()");
      }
    }
  }

  function setupNode() {
    // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
    //
    // Moderately fast, high quality
    if ('function' === typeof require) {
      try {
        var _rb = require('crypto').randomBytes;
        _nodeRNG = _rng = _rb && function() {return _rb(16);};
        _rng();
      } catch(e) {}
    }
  }

  if (_window) {
    setupBrowser();
  } else {
    setupNode();
  }

  // Buffer class to use
  var BufferClass = ('function' === typeof Buffer) ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = (options.clockseq != null) ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = (options.msecs != null) ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = (options.nsecs != null) ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) === 'string') {
      buf = (options === 'binary') ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;
  uuid._rng = _rng;
  uuid._mathRNG = _mathRNG;
  uuid._nodeRNG = _nodeRNG;
  uuid._whatwgRNG = _whatwgRNG;

  if (('undefined' !== typeof module) && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});


  } else {
    // Publish as global (in browsers)
    _previousRoot = _window.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _window.uuid = _previousRoot;
      return uuid;
    };

    _window.uuid = uuid;
  }
})('undefined' !== typeof window ? window : null);

},{"crypto":undefined}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
'use strict';
var strictUriEncode = require('strict-uri-encode');

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str) {
	if (typeof str !== 'string') {
		return {};
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return {};
	}

	return str.split('&').reduce(function (ret, param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (!ret.hasOwnProperty(key)) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}

		return ret;
	}, {});
};

exports.stringify = function (obj) {
	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return key;
		}

		if (Array.isArray(val)) {
			return val.slice().sort().map(function (val2) {
				return strictUriEncode(key) + '=' + strictUriEncode(val2);
			}).join('&');
		}

		return strictUriEncode(key) + '=' + strictUriEncode(val);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

},{"strict-uri-encode":37}],21:[function(require,module,exports){
/**
 * Angular.js plugin
 *
 * Provides an $exceptionHandler for Angular.js
 */
var wrappedCallback = require('../src/utils').wrappedCallback;

// See https://github.com/angular/angular.js/blob/v1.4.7/src/minErr.js
var angularPattern = /^\[((?:[$a-zA-Z0-9]+:)?(?:[$a-zA-Z0-9]+))\] (.*?)\n?(\S+)$/;
var moduleName = 'ngRaven';

function angularPlugin(Raven, angular) {
  angular = angular || window.angular;

  if (!angular) return;

  function RavenProvider() {
    this.$get = [
      '$window',
      function($window) {
        return Raven;
      }
    ];
  }

  function ExceptionHandlerProvider($provide) {
    $provide.decorator('$exceptionHandler', ['Raven', '$delegate', exceptionHandler]);
  }

  function exceptionHandler(R, $delegate) {
    return function(ex, cause) {
      R.captureException(ex, {
        extra: {cause: cause}
      });
      $delegate(ex, cause);
    };
  }

  angular
    .module(moduleName, [])
    .provider('Raven', RavenProvider)
    .config(['$provide', ExceptionHandlerProvider]);

  Raven.setDataCallback(
    wrappedCallback(function(data) {
      return angularPlugin._normalizeData(data);
    })
  );
}

angularPlugin._normalizeData = function(data) {
  // We only care about mutating an exception
  var exception = data.exception;
  if (exception) {
    exception = exception.values[0];
    var matches = angularPattern.exec(exception.value);

    if (matches) {
      // This type now becomes something like: $rootScope:inprog
      exception.type = matches[1];
      exception.value = matches[2];

      data.message = exception.type + ': ' + exception.value;
      // auto set a new tag specifically for the angular error url
      data.extra.angularDocs = matches[3].substr(0, 250);
    }
  }

  return data;
};

angularPlugin.moduleName = moduleName;

module.exports = angularPlugin;

},{"../src/utils":22}],22:[function(require,module,exports){
(function (global){
var stringify = require('../vendor/json-stringify-safe/stringify');

var _window =
  typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function isObject(what) {
  return typeof what === 'object' && what !== null;
}

// Yanked from https://git.io/vS8DV re-used under CC0
// with some tiny modifications
function isError(value) {
  switch ({}.toString.call(value)) {
    case '[object Error]':
      return true;
    case '[object Exception]':
      return true;
    case '[object DOMException]':
      return true;
    default:
      return value instanceof Error;
  }
}

function isErrorEvent(value) {
  return supportsErrorEvent() && {}.toString.call(value) === '[object ErrorEvent]';
}

function isUndefined(what) {
  return what === void 0;
}

function isFunction(what) {
  return typeof what === 'function';
}

function isPlainObject(what) {
  return Object.prototype.toString.call(what) === '[object Object]';
}

function isString(what) {
  return Object.prototype.toString.call(what) === '[object String]';
}

function isArray(what) {
  return Object.prototype.toString.call(what) === '[object Array]';
}

function isEmptyObject(what) {
  if (!isPlainObject(what)) return false;

  for (var _ in what) {
    if (what.hasOwnProperty(_)) {
      return false;
    }
  }
  return true;
}

function supportsErrorEvent() {
  try {
    new ErrorEvent(''); // eslint-disable-line no-new
    return true;
  } catch (e) {
    return false;
  }
}

function supportsFetch() {
  if (!('fetch' in _window)) return false;

  try {
    new Headers(); // eslint-disable-line no-new
    new Request(''); // eslint-disable-line no-new
    new Response(); // eslint-disable-line no-new
    return true;
  } catch (e) {
    return false;
  }
}

// Despite all stars in the sky saying that Edge supports old draft syntax, aka 'never', 'always', 'origin' and 'default
// https://caniuse.com/#feat=referrer-policy
// It doesn't. And it throw exception instead of ignoring this parameter...
// REF: https://github.com/getsentry/raven-js/issues/1233
function supportsReferrerPolicy() {
  if (!supportsFetch()) return false;

  try {
    // eslint-disable-next-line no-new
    new Request('pickleRick', {
      referrerPolicy: 'origin'
    });
    return true;
  } catch (e) {
    return false;
  }
}

function supportsPromiseRejectionEvent() {
  return typeof PromiseRejectionEvent === 'function';
}

function wrappedCallback(callback) {
  function dataCallback(data, original) {
    var normalizedData = callback(data) || data;
    if (original) {
      return original(normalizedData) || normalizedData;
    }
    return normalizedData;
  }

  return dataCallback;
}

function each(obj, callback) {
  var i, j;

  if (isUndefined(obj.length)) {
    for (i in obj) {
      if (hasKey(obj, i)) {
        callback.call(null, i, obj[i]);
      }
    }
  } else {
    j = obj.length;
    if (j) {
      for (i = 0; i < j; i++) {
        callback.call(null, i, obj[i]);
      }
    }
  }
}

function objectMerge(obj1, obj2) {
  if (!obj2) {
    return obj1;
  }
  each(obj2, function(key, value) {
    obj1[key] = value;
  });
  return obj1;
}

/**
 * This function is only used for react-native.
 * react-native freezes object that have already been sent over the
 * js bridge. We need this function in order to check if the object is frozen.
 * So it's ok that objectFrozen returns false if Object.isFrozen is not
 * supported because it's not relevant for other "platforms". See related issue:
 * https://github.com/getsentry/react-native-sentry/issues/57
 */
function objectFrozen(obj) {
  if (!Object.isFrozen) {
    return false;
  }
  return Object.isFrozen(obj);
}

function truncate(str, max) {
  return !max || str.length <= max ? str : str.substr(0, max) + '\u2026';
}

/**
 * hasKey, a better form of hasOwnProperty
 * Example: hasKey(MainHostObject, property) === true/false
 *
 * @param {Object} host object to check property
 * @param {string} key to check
 */
function hasKey(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function joinRegExp(patterns) {
  // Combine an array of regular expressions and strings into one large regexp
  // Be mad.
  var sources = [],
    i = 0,
    len = patterns.length,
    pattern;

  for (; i < len; i++) {
    pattern = patterns[i];
    if (isString(pattern)) {
      // If it's a string, we need to escape it
      // Taken from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
      sources.push(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'));
    } else if (pattern && pattern.source) {
      // If it's a regexp already, we want to extract the source
      sources.push(pattern.source);
    }
    // Intentionally skip other cases
  }
  return new RegExp(sources.join('|'), 'i');
}

function urlencode(o) {
  var pairs = [];
  each(o, function(key, value) {
    pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  });
  return pairs.join('&');
}

// borrowed from https://tools.ietf.org/html/rfc3986#appendix-B
// intentionally using regex and not <a/> href parsing trick because React Native and other
// environments where DOM might not be available
function parseUrl(url) {
  if (typeof url !== 'string') return {};
  var match = url.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);

  // coerce to undefined values to empty string so we don't get 'undefined'
  var query = match[6] || '';
  var fragment = match[8] || '';
  return {
    protocol: match[2],
    host: match[4],
    path: match[5],
    relative: match[5] + query + fragment // everything minus origin
  };
}
function uuid4() {
  var crypto = _window.crypto || _window.msCrypto;

  if (!isUndefined(crypto) && crypto.getRandomValues) {
    // Use window.crypto API if available
    // eslint-disable-next-line no-undef
    var arr = new Uint16Array(8);
    crypto.getRandomValues(arr);

    // set 4 in byte 7
    arr[3] = (arr[3] & 0xfff) | 0x4000;
    // set 2 most significant bits of byte 9 to '10'
    arr[4] = (arr[4] & 0x3fff) | 0x8000;

    var pad = function(num) {
      var v = num.toString(16);
      while (v.length < 4) {
        v = '0' + v;
      }
      return v;
    };

    return (
      pad(arr[0]) +
      pad(arr[1]) +
      pad(arr[2]) +
      pad(arr[3]) +
      pad(arr[4]) +
      pad(arr[5]) +
      pad(arr[6]) +
      pad(arr[7])
    );
  } else {
    // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Given a child DOM element, returns a query-selector statement describing that
 * and its ancestors
 * e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
 * @param elem
 * @returns {string}
 */
function htmlTreeAsString(elem) {
  /* eslint no-extra-parens:0*/
  var MAX_TRAVERSE_HEIGHT = 5,
    MAX_OUTPUT_LEN = 80,
    out = [],
    height = 0,
    len = 0,
    separator = ' > ',
    sepLength = separator.length,
    nextStr;

  while (elem && height++ < MAX_TRAVERSE_HEIGHT) {
    nextStr = htmlElementAsString(elem);
    // bail out if
    // - nextStr is the 'html' element
    // - the length of the string that would be created exceeds MAX_OUTPUT_LEN
    //   (ignore this limit if we are on the first iteration)
    if (
      nextStr === 'html' ||
      (height > 1 && len + out.length * sepLength + nextStr.length >= MAX_OUTPUT_LEN)
    ) {
      break;
    }

    out.push(nextStr);

    len += nextStr.length;
    elem = elem.parentNode;
  }

  return out.reverse().join(separator);
}

/**
 * Returns a simple, query-selector representation of a DOM element
 * e.g. [HTMLElement] => input#foo.btn[name=baz]
 * @param HTMLElement
 * @returns {string}
 */
function htmlElementAsString(elem) {
  var out = [],
    className,
    classes,
    key,
    attr,
    i;

  if (!elem || !elem.tagName) {
    return '';
  }

  out.push(elem.tagName.toLowerCase());
  if (elem.id) {
    out.push('#' + elem.id);
  }

  className = elem.className;
  if (className && isString(className)) {
    classes = className.split(/\s+/);
    for (i = 0; i < classes.length; i++) {
      out.push('.' + classes[i]);
    }
  }
  var attrWhitelist = ['type', 'name', 'title', 'alt'];
  for (i = 0; i < attrWhitelist.length; i++) {
    key = attrWhitelist[i];
    attr = elem.getAttribute(key);
    if (attr) {
      out.push('[' + key + '="' + attr + '"]');
    }
  }
  return out.join('');
}

/**
 * Returns true if either a OR b is truthy, but not both
 */
function isOnlyOneTruthy(a, b) {
  return !!(!!a ^ !!b);
}

/**
 * Returns true if both parameters are undefined
 */
function isBothUndefined(a, b) {
  return isUndefined(a) && isUndefined(b);
}

/**
 * Returns true if the two input exception interfaces have the same content
 */
function isSameException(ex1, ex2) {
  if (isOnlyOneTruthy(ex1, ex2)) return false;

  ex1 = ex1.values[0];
  ex2 = ex2.values[0];

  if (ex1.type !== ex2.type || ex1.value !== ex2.value) return false;

  // in case both stacktraces are undefined, we can't decide so default to false
  if (isBothUndefined(ex1.stacktrace, ex2.stacktrace)) return false;

  return isSameStacktrace(ex1.stacktrace, ex2.stacktrace);
}

/**
 * Returns true if the two input stack trace interfaces have the same content
 */
function isSameStacktrace(stack1, stack2) {
  if (isOnlyOneTruthy(stack1, stack2)) return false;

  var frames1 = stack1.frames;
  var frames2 = stack2.frames;

  // Exit early if frame count differs
  if (frames1.length !== frames2.length) return false;

  // Iterate through every frame; bail out if anything differs
  var a, b;
  for (var i = 0; i < frames1.length; i++) {
    a = frames1[i];
    b = frames2[i];
    if (
      a.filename !== b.filename ||
      a.lineno !== b.lineno ||
      a.colno !== b.colno ||
      a['function'] !== b['function']
    )
      return false;
  }
  return true;
}

/**
 * Polyfill a method
 * @param obj object e.g. `document`
 * @param name method name present on object e.g. `addEventListener`
 * @param replacement replacement function
 * @param track {optional} record instrumentation to an array
 */
function fill(obj, name, replacement, track) {
  if (obj == null) return;
  var orig = obj[name];
  obj[name] = replacement(orig);
  obj[name].__raven__ = true;
  obj[name].__orig__ = orig;
  if (track) {
    track.push([obj, name, orig]);
  }
}

/**
 * Join values in array
 * @param input array of values to be joined together
 * @param delimiter string to be placed in-between values
 * @returns {string}
 */
function safeJoin(input, delimiter) {
  if (!isArray(input)) return '';

  var output = [];

  for (var i = 0; i < input.length; i++) {
    try {
      output.push(String(input[i]));
    } catch (e) {
      output.push('[value cannot be serialized]');
    }
  }

  return output.join(delimiter);
}

// Default Node.js REPL depth
var MAX_SERIALIZE_EXCEPTION_DEPTH = 3;
// 50kB, as 100kB is max payload size, so half sounds reasonable
var MAX_SERIALIZE_EXCEPTION_SIZE = 50 * 1024;
var MAX_SERIALIZE_KEYS_LENGTH = 40;

function utf8Length(value) {
  return ~-encodeURI(value).split(/%..|./).length;
}

function jsonSize(value) {
  return utf8Length(JSON.stringify(value));
}

function serializeValue(value) {
  var maxLength = 40;

  if (typeof value === 'string') {
    return value.length <= maxLength ? value : value.substr(0, maxLength - 1) + '\u2026';
  } else if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }

  var type = Object.prototype.toString.call(value);

  // Node.js REPL notation
  if (type === '[object Object]') return '[Object]';
  if (type === '[object Array]') return '[Array]';
  if (type === '[object Function]')
    return value.name ? '[Function: ' + value.name + ']' : '[Function]';

  return value;
}

function serializeObject(value, depth) {
  if (depth === 0) return serializeValue(value);

  if (isPlainObject(value)) {
    return Object.keys(value).reduce(function(acc, key) {
      acc[key] = serializeObject(value[key], depth - 1);
      return acc;
    }, {});
  } else if (Array.isArray(value)) {
    return value.map(function(val) {
      return serializeObject(val, depth - 1);
    });
  }

  return serializeValue(value);
}

function serializeException(ex, depth, maxSize) {
  if (!isPlainObject(ex)) return ex;

  depth = typeof depth !== 'number' ? MAX_SERIALIZE_EXCEPTION_DEPTH : depth;
  maxSize = typeof depth !== 'number' ? MAX_SERIALIZE_EXCEPTION_SIZE : maxSize;

  var serialized = serializeObject(ex, depth);

  if (jsonSize(stringify(serialized)) > maxSize) {
    return serializeException(ex, depth - 1);
  }

  return serialized;
}

function serializeKeysForMessage(keys, maxLength) {
  if (typeof keys === 'number' || typeof keys === 'string') return keys.toString();
  if (!Array.isArray(keys)) return '';

  keys = keys.filter(function(key) {
    return typeof key === 'string';
  });
  if (keys.length === 0) return '[object has no keys]';

  maxLength = typeof maxLength !== 'number' ? MAX_SERIALIZE_KEYS_LENGTH : maxLength;
  if (keys[0].length >= maxLength) return keys[0];

  for (var usedKeys = keys.length; usedKeys > 0; usedKeys--) {
    var serialized = keys.slice(0, usedKeys).join(', ');
    if (serialized.length > maxLength) continue;
    if (usedKeys === keys.length) return serialized;
    return serialized + '\u2026';
  }

  return '';
}

function sanitize(input, sanitizeKeys) {
  if (!isArray(sanitizeKeys) || (isArray(sanitizeKeys) && sanitizeKeys.length === 0))
    return input;

  var sanitizeRegExp = joinRegExp(sanitizeKeys);
  var sanitizeMask = '********';
  var safeInput;

  try {
    safeInput = JSON.parse(stringify(input));
  } catch (o_O) {
    return input;
  }

  function sanitizeWorker(workerInput) {
    if (isArray(workerInput)) {
      return workerInput.map(function(val) {
        return sanitizeWorker(val);
      });
    }

    if (isPlainObject(workerInput)) {
      return Object.keys(workerInput).reduce(function(acc, k) {
        if (sanitizeRegExp.test(k)) {
          acc[k] = sanitizeMask;
        } else {
          acc[k] = sanitizeWorker(workerInput[k]);
        }
        return acc;
      }, {});
    }

    return workerInput;
  }

  return sanitizeWorker(safeInput);
}

module.exports = {
  isObject: isObject,
  isError: isError,
  isErrorEvent: isErrorEvent,
  isUndefined: isUndefined,
  isFunction: isFunction,
  isPlainObject: isPlainObject,
  isString: isString,
  isArray: isArray,
  isEmptyObject: isEmptyObject,
  supportsErrorEvent: supportsErrorEvent,
  supportsFetch: supportsFetch,
  supportsReferrerPolicy: supportsReferrerPolicy,
  supportsPromiseRejectionEvent: supportsPromiseRejectionEvent,
  wrappedCallback: wrappedCallback,
  each: each,
  objectMerge: objectMerge,
  truncate: truncate,
  objectFrozen: objectFrozen,
  hasKey: hasKey,
  joinRegExp: joinRegExp,
  urlencode: urlencode,
  uuid4: uuid4,
  htmlTreeAsString: htmlTreeAsString,
  htmlElementAsString: htmlElementAsString,
  isSameException: isSameException,
  isSameStacktrace: isSameStacktrace,
  parseUrl: parseUrl,
  fill: fill,
  safeJoin: safeJoin,
  serializeException: serializeException,
  serializeKeysForMessage: serializeKeysForMessage,
  sanitize: sanitize
};

}).call(this,window)

},{"../vendor/json-stringify-safe/stringify":23}],23:[function(require,module,exports){
/*
 json-stringify-safe
 Like JSON.stringify, but doesn't throw on circular references.

 Originally forked from https://github.com/isaacs/json-stringify-safe
 version 5.0.1 on 3/8/2017 and modified to handle Errors serialization
 and IE8 compatibility. Tests for this are in test/vendor.

 ISC license: https://github.com/isaacs/json-stringify-safe/blob/master/LICENSE
*/

exports = module.exports = stringify;
exports.getSerialize = serializer;

function indexOf(haystack, needle) {
  for (var i = 0; i < haystack.length; ++i) {
    if (haystack[i] === needle) return i;
  }
  return -1;
}

function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces);
}

// https://github.com/ftlabs/js-abbreviate/blob/fa709e5f139e7770a71827b1893f22418097fbda/index.js#L95-L106
function stringifyError(value) {
  var err = {
    // These properties are implemented as magical getters and don't show up in for in
    stack: value.stack,
    message: value.message,
    name: value.name
  };

  for (var i in value) {
    if (Object.prototype.hasOwnProperty.call(value, i)) {
      err[i] = value[i];
    }
  }

  return err;
}

function serializer(replacer, cycleReplacer) {
  var stack = [];
  var keys = [];

  if (cycleReplacer == null) {
    cycleReplacer = function(key, value) {
      if (stack[0] === value) {
        return '[Circular ~]';
      }
      return '[Circular ~.' + keys.slice(0, indexOf(stack, value)).join('.') + ']';
    };
  }

  return function(key, value) {
    if (stack.length > 0) {
      var thisPos = indexOf(stack, this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);

      if (~indexOf(stack, value)) {
        value = cycleReplacer.call(this, key, value);
      }
    } else {
      stack.push(value);
    }

    return replacer == null
      ? value instanceof Error ? stringifyError(value) : value
      : replacer.call(this, key, value);
  };
}

},{}],24:[function(require,module,exports){
'use strict';

exports.__esModule = true;
function createThunkMiddleware(extraArgument) {
  return function (_ref) {
    var dispatch = _ref.dispatch,
        getState = _ref.getState;
    return function (next) {
      return function (action) {
        if (typeof action === 'function') {
          return action(dispatch, getState, extraArgument);
        }

        return next(action);
      };
    };
  };
}

var thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

exports['default'] = thunk;
},{}],25:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports['default'] = applyMiddleware;

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
function applyMiddleware() {
  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function (reducer, preloadedState, enhancer) {
      var store = createStore(reducer, preloadedState, enhancer);
      var _dispatch = store.dispatch;
      var chain = [];

      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch(action) {
          return _dispatch(action);
        }
      };
      chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = _compose2['default'].apply(undefined, chain)(store.dispatch);

      return _extends({}, store, {
        dispatch: _dispatch
      });
    };
  };
}
},{"./compose":28}],26:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = bindActionCreators;
function bindActionCreator(actionCreator, dispatch) {
  return function () {
    return dispatch(actionCreator.apply(undefined, arguments));
  };
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
  }

  var keys = Object.keys(actionCreators);
  var boundActionCreators = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }
  return boundActionCreators;
}
},{}],27:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports['default'] = combineReducers;

var _createStore = require('./createStore');

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state. ' + 'If you want this reducer to hold no value, you can return null instead of undefined.';
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === _createStore.ActionTypes.INIT ? 'preloadedState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!(0, _isPlainObject2['default'])(inputState)) {
    return 'The ' + argumentName + ' has unexpected type of "' + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
  });

  unexpectedKeys.forEach(function (key) {
    unexpectedKeyCache[key] = true;
  });

  if (unexpectedKeys.length > 0) {
    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
  }
}

function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, { type: _createStore.ActionTypes.INIT });

    if (typeof initialState === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined. If you don\'t want to set a value for this reducer, ' + 'you can use null instead of undefined.');
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
    if (typeof reducer(undefined, { type: type }) === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + _createStore.ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined, but can be null.');
    }
  });
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        (0, _warning2['default'])('No reducer provided for key "' + key + '"');
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  var finalReducerKeys = Object.keys(finalReducers);

  var unexpectedKeyCache = void 0;
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {};
  }

  var shapeAssertionError = void 0;
  try {
    assertReducerShape(finalReducers);
  } catch (e) {
    shapeAssertionError = e;
  }

  return function combination() {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var action = arguments[1];

    if (shapeAssertionError) {
      throw shapeAssertionError;
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
      if (warningMessage) {
        (0, _warning2['default'])(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};
    for (var _i = 0; _i < finalReducerKeys.length; _i++) {
      var _key = finalReducerKeys[_i];
      var reducer = finalReducers[_key];
      var previousStateForKey = state[_key];
      var nextStateForKey = reducer(previousStateForKey, action);
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(_key, action);
        throw new Error(errorMessage);
      }
      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
}).call(this,require('_process'))

},{"./createStore":29,"./utils/warning":31,"_process":19,"lodash/isPlainObject":17}],28:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = compose;
/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

function compose() {
  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(function (a, b) {
    return function () {
      return a(b.apply(undefined, arguments));
    };
  });
}
},{}],29:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.ActionTypes = undefined;
exports['default'] = createStore;

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var ActionTypes = exports.ActionTypes = {
  INIT: '@@redux/INIT'

  /**
   * Creates a Redux store that holds the state tree.
   * The only way to change the data in the store is to call `dispatch()` on it.
   *
   * There should only be a single store in your app. To specify how different
   * parts of the state tree respond to actions, you may combine several reducers
   * into a single reducer function by using `combineReducers`.
   *
   * @param {Function} reducer A function that returns the next state tree, given
   * the current state tree and the action to handle.
   *
   * @param {any} [preloadedState] The initial state. You may optionally specify it
   * to hydrate the state from the server in universal apps, or to restore a
   * previously serialized user session.
   * If you use `combineReducers` to produce the root reducer function, this must be
   * an object with the same shape as `combineReducers` keys.
   *
   * @param {Function} [enhancer] The store enhancer. You may optionally specify it
   * to enhance the store with third-party capabilities such as middleware,
   * time travel, persistence, etc. The only store enhancer that ships with Redux
   * is `applyMiddleware()`.
   *
   * @returns {Store} A Redux store that lets you read the state, dispatch actions
   * and subscribe to changes.
   */
};function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState;
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!(0, _isPlainObject2['default'])(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }

    return action;
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT });
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return { unsubscribe: unsubscribe };
      }
    }, _ref[_symbolObservable2['default']] = function () {
      return this;
    }, _ref;
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT });

  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[_symbolObservable2['default']] = observable, _ref2;
}
},{"lodash/isPlainObject":17,"symbol-observable":38}],30:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports.compose = exports.applyMiddleware = exports.bindActionCreators = exports.combineReducers = exports.createStore = undefined;

var _createStore = require('./createStore');

var _createStore2 = _interopRequireDefault(_createStore);

var _combineReducers = require('./combineReducers');

var _combineReducers2 = _interopRequireDefault(_combineReducers);

var _bindActionCreators = require('./bindActionCreators');

var _bindActionCreators2 = _interopRequireDefault(_bindActionCreators);

var _applyMiddleware = require('./applyMiddleware');

var _applyMiddleware2 = _interopRequireDefault(_applyMiddleware);

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*
* This is a dummy function to check if the function name has been altered by minification.
* If the function has been minified and NODE_ENV !== 'production', warn the user.
*/
function isCrushed() {}

if (process.env.NODE_ENV !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  (0, _warning2['default'])('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
}

exports.createStore = _createStore2['default'];
exports.combineReducers = _combineReducers2['default'];
exports.bindActionCreators = _bindActionCreators2['default'];
exports.applyMiddleware = _applyMiddleware2['default'];
exports.compose = _compose2['default'];
}).call(this,require('_process'))

},{"./applyMiddleware":25,"./bindActionCreators":26,"./combineReducers":27,"./compose":28,"./createStore":29,"./utils/warning":31,"_process":19}],31:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = warning;
/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}
},{}],32:[function(require,module,exports){
module.exports = require('./lib/retry');
},{"./lib/retry":33}],33:[function(require,module,exports){
var RetryOperation = require('./retry_operation');

exports.operation = function(options) {
  var retryForever = false;
  if (options && options.forever === true) retryForever = true;
  var timeouts = exports.timeouts(options);
  return new RetryOperation(timeouts, retryForever);
};

exports.timeouts = function(options) {
  if (options instanceof Array) {
    return [].concat(options);
  }

  var opts = {
    retries: 10,
    factor: 2,
    minTimeout: 1 * 1000,
    maxTimeout: Infinity,
    randomize: false
  };
  for (var key in options) {
    opts[key] = options[key];
  }

  if (opts.minTimeout > opts.maxTimeout) {
    throw new Error('minTimeout is greater than maxTimeout');
  }

  var timeouts = [];
  for (var i = 0; i < opts.retries; i++) {
    timeouts.push(this.createTimeout(i, opts));
  }

  // sort the array numerically ascending
  timeouts.sort(function(a,b) {
    return a - b;
  });

  return timeouts;
};

exports.createTimeout = function(attempt, opts) {
  var random = (opts.randomize)
    ? (Math.random() + 1)
    : 1;

  var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
  timeout = Math.min(timeout, opts.maxTimeout);

  return timeout;
};

exports.wrap = function(obj, options, methods) {
  if (options instanceof Array) {
    methods = options;
    options = null;
  }

  if (!methods) {
    methods = [];
    for (var key in obj) {
      if (typeof obj[key] === 'function') {
        methods.push(key);
      }
    }
  }

  for (var i = 0; i < methods.length; i++) {
    var method   = methods[i];
    var original = obj[method];

    obj[method] = function retryWrapper() {
      var op       = exports.operation(options);
      var args     = Array.prototype.slice.call(arguments);
      var callback = args.pop();

      args.push(function(err) {
        if (op.retry(err)) {
          return;
        }
        if (err) {
          arguments[0] = op.mainError();
        }
        callback.apply(this, arguments);
      });

      op.attempt(function() {
        original.apply(obj, args);
      });
    };
    obj[method].options = options;
  }
};

},{"./retry_operation":34}],34:[function(require,module,exports){
function RetryOperation(timeouts, retryForever) {
  this._timeouts = timeouts;
  this._fn = null;
  this._errors = [];
  this._attempts = 1;
  this._operationTimeout = null;
  this._operationTimeoutCb = null;
  this._timeout = null;

  if (!!retryForever) {
    this._cachedTimeouts = this._timeouts.slice(0);
  }
}
module.exports = RetryOperation;

RetryOperation.prototype.retry = function(err) {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }

  if (!err) {
    return false;
  }

  this._errors.push(err);

  var timeout = this._timeouts.shift();
  if (timeout === undefined) {
    if (this._cachedTimeouts) {
      // retry forever, only keep last error
      this._errors.splice(this._errors.length - 1, this._errors.length);
      this._timeouts = this._cachedTimeouts.slice(0);
      timeout = this._timeouts.shift();
    } else {
      return false;
    }
  }

  var self = this;
  setTimeout(function() {
    self._attempts++;

    if (self._operationTimeoutCb) {
      self._timeout = setTimeout(function() {
        self._operationTimeoutCb(self._attempts);
      }, self._operationTimeout);
    }

    self._fn(self._attempts);
  }, timeout);

  return true;
};

RetryOperation.prototype.attempt = function(fn, timeoutOps) {
  this._fn = fn;

  if (timeoutOps) {
    if (timeoutOps.timeout) {
      this._operationTimeout = timeoutOps.timeout;
    }
    if (timeoutOps.cb) {
      this._operationTimeoutCb = timeoutOps.cb;
    }
  }

  var self = this;
  if (this._operationTimeoutCb) {
    this._timeout = setTimeout(function() {
      self._operationTimeoutCb();
    }, self._operationTimeout);
  }

  this._fn(this._attempts);
};

RetryOperation.prototype.try = function(fn) {
  console.log('Using RetryOperation.try() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = function(fn) {
  console.log('Using RetryOperation.start() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = RetryOperation.prototype.try;

RetryOperation.prototype.errors = function() {
  return this._errors;
};

RetryOperation.prototype.attempts = function() {
  return this._attempts;
};

RetryOperation.prototype.mainError = function() {
  if (this._errors.length === 0) {
    return null;
  }

  var counts = {};
  var mainError = null;
  var mainErrorCount = 0;

  for (var i = 0; i < this._errors.length; i++) {
    var error = this._errors[i];
    var message = error.message;
    var count = (counts[message] || 0) + 1;

    counts[message] = count;

    if (count >= mainErrorCount) {
      mainError = error;
      mainErrorCount = count;
    }
  }

  return mainError;
};

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
(function (process,global){
(function() {
  "use strict";

  // https://github.com/facebook/react/blob/v15.0.1/src/isomorphic/classic/element/ReactElement.js#L21
  var REACT_ELEMENT_TYPE = typeof Symbol === 'function' && Symbol.for && Symbol.for('react.element');
  var REACT_ELEMENT_TYPE_FALLBACK = 0xeac7;

  function addPropertyTo(target, methodName, value) {
    Object.defineProperty(target, methodName, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: value
    });
  }

  function banProperty(target, methodName) {
    addPropertyTo(target, methodName, function() {
      throw new ImmutableError("The " + methodName +
        " method cannot be invoked on an Immutable data structure.");
    });
  }

  var immutabilityTag = "__immutable_invariants_hold";

  function addImmutabilityTag(target) {
    addPropertyTo(target, immutabilityTag, true);
  }

  function isImmutable(target) {
    if (typeof target === "object") {
      return target === null || Boolean(
        Object.getOwnPropertyDescriptor(target, immutabilityTag)
      );
    } else {
      // In JavaScript, only objects are even potentially mutable.
      // strings, numbers, null, and undefined are all naturally immutable.
      return true;
    }
  }

  function isEqual(a, b) {
    // Avoid false positives due to (NaN !== NaN) evaluating to true
    return (a === b || (a !== a && b !== b));
  }

  function isMergableObject(target) {
    return target !== null && typeof target === "object" && !(Array.isArray(target)) && !(target instanceof Date);
  }

  var mutatingObjectMethods = [
    "setPrototypeOf"
  ];

  var nonMutatingObjectMethods = [
    "keys"
  ];

  var mutatingArrayMethods = mutatingObjectMethods.concat([
    "push", "pop", "sort", "splice", "shift", "unshift", "reverse"
  ]);

  var nonMutatingArrayMethods = nonMutatingObjectMethods.concat([
    "map", "filter", "slice", "concat", "reduce", "reduceRight"
  ]);

  var mutatingDateMethods = mutatingObjectMethods.concat([
    "setDate", "setFullYear", "setHours", "setMilliseconds", "setMinutes", "setMonth", "setSeconds",
    "setTime", "setUTCDate", "setUTCFullYear", "setUTCHours", "setUTCMilliseconds", "setUTCMinutes",
    "setUTCMonth", "setUTCSeconds", "setYear"
  ]);

  function ImmutableError(message) {
    var err       = new Error(message);
    // TODO: Consider `Object.setPrototypeOf(err, ImmutableError);`
    err.__proto__ = ImmutableError;

    return err;
  }
  ImmutableError.prototype = Error.prototype;

  function makeImmutable(obj, bannedMethods) {
    // Tag it so we can quickly tell it's immutable later.
    addImmutabilityTag(obj);

    if (process.env.NODE_ENV !== "production") {
      // Make all mutating methods throw exceptions.
      for (var index in bannedMethods) {
        if (bannedMethods.hasOwnProperty(index)) {
          banProperty(obj, bannedMethods[index]);
        }
      }

      // Freeze it and return it.
      Object.freeze(obj);
    }

    return obj;
  }

  function makeMethodReturnImmutable(obj, methodName) {
    var currentMethod = obj[methodName];

    addPropertyTo(obj, methodName, function() {
      return Immutable(currentMethod.apply(obj, arguments));
    });
  }

  function arraySet(idx, value, config) {
    var deep          = config && config.deep;

    if (idx in this) {
      if (deep && this[idx] !== value && isMergableObject(value) && isMergableObject(this[idx])) {
        value = this[idx].merge(value, {deep: true, mode: 'replace'});
      }
      if (isEqual(this[idx], value)) {
        return this;
      }
    }

    var mutable = asMutableArray.call(this);
    mutable[idx] = Immutable(value);
    return makeImmutableArray(mutable);
  }

  var immutableEmptyArray = Immutable([]);

  function arraySetIn(pth, value, config) {
    var head = pth[0];

    if (pth.length === 1) {
      return arraySet.call(this, head, value, config);
    } else {
      var tail = pth.slice(1);
      var thisHead = this[head];
      var newValue;

      if (typeof(thisHead) === "object" && thisHead !== null && typeof(thisHead.setIn) === "function") {
        // Might (validly) be object or array
        newValue = thisHead.setIn(tail, value);
      } else {
        var nextHead = tail[0];
        // If the next path part is a number, then we are setting into an array, else an object.
        if (nextHead !== '' && isFinite(nextHead)) {
          newValue = arraySetIn.call(immutableEmptyArray, tail, value);
        } else {
          newValue = objectSetIn.call(immutableEmptyObject, tail, value);
        }
      }

      if (head in this && thisHead === newValue) {
        return this;
      }

      var mutable = asMutableArray.call(this);
      mutable[head] = newValue;
      return makeImmutableArray(mutable);
    }
  }

  function makeImmutableArray(array) {
    // Don't change their implementations, but wrap these functions to make sure
    // they always return an immutable value.
    for (var index in nonMutatingArrayMethods) {
      if (nonMutatingArrayMethods.hasOwnProperty(index)) {
        var methodName = nonMutatingArrayMethods[index];
        makeMethodReturnImmutable(array, methodName);
      }
    }

    addPropertyTo(array, "flatMap",  flatMap);
    addPropertyTo(array, "asObject", asObject);
    addPropertyTo(array, "asMutable", asMutableArray);
    addPropertyTo(array, "set", arraySet);
    addPropertyTo(array, "setIn", arraySetIn);
    addPropertyTo(array, "update", update);
    addPropertyTo(array, "updateIn", updateIn);

    for(var i = 0, length = array.length; i < length; i++) {
      array[i] = Immutable(array[i]);
    }

    return makeImmutable(array, mutatingArrayMethods);
  }

  function makeImmutableDate(date) {
    addPropertyTo(date, "asMutable", asMutableDate);

    return makeImmutable(date, mutatingDateMethods);
  }

  function asMutableDate() {
    return new Date(this.getTime());
  }

  /**
   * Effectively performs a map() over the elements in the array, using the
   * provided iterator, except that whenever the iterator returns an array, that
   * array's elements are added to the final result instead of the array itself.
   *
   * @param {function} iterator - The iterator function that will be invoked on each element in the array. It will receive three arguments: the current value, the current index, and the current object.
   */
  function flatMap(iterator) {
    // Calling .flatMap() with no arguments is a no-op. Don't bother cloning.
    if (arguments.length === 0) {
      return this;
    }

    var result = [],
        length = this.length,
        index;

    for (index = 0; index < length; index++) {
      var iteratorResult = iterator(this[index], index, this);

      if (Array.isArray(iteratorResult)) {
        // Concatenate Array results into the return value we're building up.
        result.push.apply(result, iteratorResult);
      } else {
        // Handle non-Array results the same way map() does.
        result.push(iteratorResult);
      }
    }

    return makeImmutableArray(result);
  }

  /**
   * Returns an Immutable copy of the object without the given keys included.
   *
   * @param {array} keysToRemove - A list of strings representing the keys to exclude in the return value. Instead of providing a single array, this method can also be called by passing multiple strings as separate arguments.
   */
  function without(remove) {
    // Calling .without() with no arguments is a no-op. Don't bother cloning.
    if (typeof remove === "undefined" && arguments.length === 0) {
      return this;
    }

    if (typeof remove !== "function") {
      // If we weren't given an array, use the arguments list.
      var keysToRemoveArray = (Array.isArray(remove)) ?
         remove.slice() : Array.prototype.slice.call(arguments);

      // Convert numeric keys to strings since that's how they'll
      // come from the enumeration of the object.
      keysToRemoveArray.forEach(function(el, idx, arr) {
        if(typeof(el) === "number") {
          arr[idx] = el.toString();
        }
      });

      remove = function(val, key) {
        return keysToRemoveArray.indexOf(key) !== -1;
      };
    }

    var result = this.instantiateEmptyObject();

    for (var key in this) {
      if (this.hasOwnProperty(key) && remove(this[key], key) === false) {
        result[key] = this[key];
      }
    }

    return makeImmutableObject(result,
      {instantiateEmptyObject: this.instantiateEmptyObject});
  }

  function asMutableArray(opts) {
    var result = [], i, length;

    if(opts && opts.deep) {
      for(i = 0, length = this.length; i < length; i++) {
        result.push(asDeepMutable(this[i]));
      }
    } else {
      for(i = 0, length = this.length; i < length; i++) {
        result.push(this[i]);
      }
    }

    return result;
  }

  /**
   * Effectively performs a [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) over the elements in the array, expecting that the iterator function
   * will return an array of two elements - the first representing a key, the other
   * a value. Then returns an Immutable Object constructed of those keys and values.
   *
   * @param {function} iterator - A function which should return an array of two elements - the first representing the desired key, the other the desired value.
   */
  function asObject(iterator) {
    // If no iterator was provided, assume the identity function
    // (suggesting this array is already a list of key/value pairs.)
    if (typeof iterator !== "function") {
      iterator = function(value) { return value; };
    }

    var result = {},
        length = this.length,
        index;

    for (index = 0; index < length; index++) {
      var pair  = iterator(this[index], index, this),
          key   = pair[0],
          value = pair[1];

      result[key] = value;
    }

    return makeImmutableObject(result);
  }

  function asDeepMutable(obj) {
    if (
      (!obj) ||
      (typeof obj !== 'object') ||
      (!Object.getOwnPropertyDescriptor(obj, immutabilityTag)) ||
      (obj instanceof Date)
    ) { return obj; }
    return obj.asMutable({deep: true});
  }

  function quickCopy(src, dest) {
    for (var key in src) {
      if (Object.getOwnPropertyDescriptor(src, key)) {
        dest[key] = src[key];
      }
    }

    return dest;
  }

  /**
   * Returns an Immutable Object containing the properties and values of both
   * this object and the provided object, prioritizing the provided object's
   * values whenever the same key is present in both objects.
   *
   * @param {object} other - The other object to merge. Multiple objects can be passed as an array. In such a case, the later an object appears in that list, the higher its priority.
   * @param {object} config - Optional config object that contains settings. Supported settings are: {deep: true} for deep merge and {merger: mergerFunc} where mergerFunc is a function
   *                          that takes a property from both objects. If anything is returned it overrides the normal merge behaviour.
   */
  function merge(other, config) {
    // Calling .merge() with no arguments is a no-op. Don't bother cloning.
    if (arguments.length === 0) {
      return this;
    }

    if (other === null || (typeof other !== "object")) {
      throw new TypeError("Immutable#merge can only be invoked with objects or arrays, not " + JSON.stringify(other));
    }

    var receivedArray = (Array.isArray(other)),
        deep          = config && config.deep,
        mode          = config && config.mode || 'merge',
        merger        = config && config.merger,
        result;

    // Use the given key to extract a value from the given object, then place
    // that value in the result object under the same key. If that resulted
    // in a change from this object's value at that key, set anyChanges = true.
    function addToResult(currentObj, otherObj, key) {
      var immutableValue = Immutable(otherObj[key]);
      var mergerResult = merger && merger(currentObj[key], immutableValue, config);
      var currentValue = currentObj[key];

      if ((result !== undefined) ||
        (mergerResult !== undefined) ||
        (!currentObj.hasOwnProperty(key)) ||
        !isEqual(immutableValue, currentValue)) {

        var newValue;

        if (mergerResult) {
          newValue = mergerResult;
        } else if (deep && isMergableObject(currentValue) && isMergableObject(immutableValue)) {
          newValue = currentValue.merge(immutableValue, config);
        } else {
          newValue = immutableValue;
        }

        if (!isEqual(currentValue, newValue) || !currentObj.hasOwnProperty(key)) {
          if (result === undefined) {
            // Make a shallow clone of the current object.
            result = quickCopy(currentObj, currentObj.instantiateEmptyObject());
          }

          result[key] = newValue;
        }
      }
    }

    function clearDroppedKeys(currentObj, otherObj) {
      for (var key in currentObj) {
        if (!otherObj.hasOwnProperty(key)) {
          if (result === undefined) {
            // Make a shallow clone of the current object.
            result = quickCopy(currentObj, currentObj.instantiateEmptyObject());
          }
          delete result[key];
        }
      }
    }

    var key;

    // Achieve prioritization by overriding previous values that get in the way.
    if (!receivedArray) {
      // The most common use case: just merge one object into the existing one.
      for (key in other) {
        if (Object.getOwnPropertyDescriptor(other, key)) {
          addToResult(this, other, key);
        }
      }
      if (mode === 'replace') {
        clearDroppedKeys(this, other);
      }
    } else {
      // We also accept an Array
      for (var index = 0, length = other.length; index < length; index++) {
        var otherFromArray = other[index];

        for (key in otherFromArray) {
          if (otherFromArray.hasOwnProperty(key)) {
            addToResult(result !== undefined ? result : this, otherFromArray, key);
          }
        }
      }
    }

    if (result === undefined) {
      return this;
    } else {
      return makeImmutableObject(result,
        {instantiateEmptyObject: this.instantiateEmptyObject});
    }
  }

  function objectReplace(value, config) {
    var deep          = config && config.deep;

    // Calling .replace() with no arguments is a no-op. Don't bother cloning.
    if (arguments.length === 0) {
      return this;
    }

    if (value === null || typeof value !== "object") {
      throw new TypeError("Immutable#replace can only be invoked with objects or arrays, not " + JSON.stringify(value));
    }

    return this.merge(value, {deep: deep, mode: 'replace'});
  }

  var immutableEmptyObject = Immutable({});

  function objectSetIn(path, value, config) {
    var head = path[0];
    if (path.length === 1) {
      return objectSet.call(this, head, value, config);
    }

    var tail = path.slice(1);
    var newValue;
    var thisHead = this[head];

    if (this.hasOwnProperty(head) && typeof(thisHead) === "object" && thisHead !== null && typeof(thisHead.setIn) === "function") {
      // Might (validly) be object or array
      newValue = thisHead.setIn(tail, value);
    } else {
      newValue = objectSetIn.call(immutableEmptyObject, tail, value);
    }

    if (this.hasOwnProperty(head) && thisHead === newValue) {
      return this;
    }

    var mutable = quickCopy(this, this.instantiateEmptyObject());
    mutable[head] = newValue;
    return makeImmutableObject(mutable, this);
  }

  function objectSet(property, value, config) {
    var deep          = config && config.deep;

    if (this.hasOwnProperty(property)) {
      if (deep && this[property] !== value && isMergableObject(value) && isMergableObject(this[property])) {
        value = this[property].merge(value, {deep: true, mode: 'replace'});
      }
      if (isEqual(this[property], value)) {
        return this;
      }
    }

    var mutable = quickCopy(this, this.instantiateEmptyObject());
    mutable[property] = Immutable(value);
    return makeImmutableObject(mutable, this);
  }

  function update(property, updater) {
    var restArgs = Array.prototype.slice.call(arguments, 2);
    var initialVal = this[property];
    return this.set(property, updater.apply(initialVal, [initialVal].concat(restArgs)));
  }

  function getInPath(obj, path) {
    /*jshint eqnull:true */
    for (var i = 0, l = path.length; obj != null && i < l; i++) {
      obj = obj[path[i]];
    }

    return (i && i == l) ? obj : undefined;
  }

  function updateIn(path, updater) {
    var restArgs = Array.prototype.slice.call(arguments, 2);
    var initialVal = getInPath(this, path);

    return this.setIn(path, updater.apply(initialVal, [initialVal].concat(restArgs)));
  }

  function asMutableObject(opts) {
    var result = this.instantiateEmptyObject(), key;

    if(opts && opts.deep) {
      for (key in this) {
        if (this.hasOwnProperty(key)) {
          result[key] = asDeepMutable(this[key]);
        }
      }
    } else {
      for (key in this) {
        if (this.hasOwnProperty(key)) {
          result[key] = this[key];
        }
      }
    }

    return result;
  }

  // Creates plain object to be used for cloning
  function instantiatePlainObject() {
    return {};
  }

  // Finalizes an object with immutable methods, freezes it, and returns it.
  function makeImmutableObject(obj, options) {
    var instantiateEmptyObject =
      (options && options.instantiateEmptyObject) ?
        options.instantiateEmptyObject : instantiatePlainObject;

    addPropertyTo(obj, "merge", merge);
    addPropertyTo(obj, "replace", objectReplace);
    addPropertyTo(obj, "without", without);
    addPropertyTo(obj, "asMutable", asMutableObject);
    addPropertyTo(obj, "instantiateEmptyObject", instantiateEmptyObject);
    addPropertyTo(obj, "set", objectSet);
    addPropertyTo(obj, "setIn", objectSetIn);
    addPropertyTo(obj, "update", update);
    addPropertyTo(obj, "updateIn", updateIn);

    return makeImmutable(obj, mutatingObjectMethods);
  }

  // Returns true if object is a valid react element
  // https://github.com/facebook/react/blob/v15.0.1/src/isomorphic/classic/element/ReactElement.js#L326
  function isReactElement(obj) {
    return typeof obj === 'object' &&
           obj !== null &&
           (obj.$$typeof === REACT_ELEMENT_TYPE_FALLBACK || obj.$$typeof === REACT_ELEMENT_TYPE);
  }

  function Immutable(obj, options, stackRemaining) {
    if (isImmutable(obj) || isReactElement(obj)) {
      return obj;
    } else if (Array.isArray(obj)) {
      return makeImmutableArray(obj.slice());
    } else if (obj instanceof Date) {
      return makeImmutableDate(new Date(obj.getTime()));
    } else {
      // Don't freeze the object we were given; make a clone and use that.
      var prototype = options && options.prototype;
      var instantiateEmptyObject =
        (!prototype || prototype === Object.prototype) ?
          instantiatePlainObject : (function() { return Object.create(prototype); });
      var clone = instantiateEmptyObject();

      if (process.env.NODE_ENV !== "production") {
        /*jshint eqnull:true */
        if (stackRemaining == null) {
          stackRemaining = 64;
        }
        if (stackRemaining <= 0) {
          throw new ImmutableError("Attempt to construct Immutable from a deeply nested object was detected." +
            " Have you tried to wrap an object with circular references (e.g. React element)?" +
            " See https://github.com/rtfeldman/seamless-immutable/wiki/Deeply-nested-object-was-detected for details.");
        }
        stackRemaining -= 1;
      }

      for (var key in obj) {
        if (Object.getOwnPropertyDescriptor(obj, key)) {
          clone[key] = Immutable(obj[key], undefined, stackRemaining);
        }
      }

      return makeImmutableObject(clone,
        {instantiateEmptyObject: instantiateEmptyObject});
    }
  }

  // Wrapper to allow the use of object methods as static methods of Immutable.
  function toStatic(fn) {
    function staticWrapper() {
      var args = [].slice.call(arguments);
      var self = args.shift();
      return fn.apply(self, args);
    }

    return staticWrapper;
  }

  // Wrapper to allow the use of object methods as static methods of Immutable.
  // with the additional condition of choosing which function to call depending
  // if argument is an array or an object.
  function toStaticObjectOrArray(fnObject, fnArray) {
    function staticWrapper() {
      var args = [].slice.call(arguments);
      var self = args.shift();
      if (Array.isArray(self)) {
          return fnArray.apply(self, args);
      } else {
          return fnObject.apply(self, args);
      }
    }

    return staticWrapper;
  }

  // Export the library
  Immutable.from           = Immutable;
  Immutable.isImmutable    = isImmutable;
  Immutable.ImmutableError = ImmutableError;
  Immutable.merge          = toStatic(merge);
  Immutable.replace        = toStatic(objectReplace);
  Immutable.without        = toStatic(without);
  Immutable.asMutable      = toStaticObjectOrArray(asMutableObject, asMutableArray);
  Immutable.set            = toStaticObjectOrArray(objectSet, arraySet);
  Immutable.setIn          = toStaticObjectOrArray(objectSetIn, arraySetIn);
  Immutable.update         = toStatic(update);
  Immutable.updateIn       = toStatic(updateIn);
  Immutable.flatMap        = toStatic(flatMap);
  Immutable.asObject       = toStatic(asObject);

  Object.freeze(Immutable);

  /* istanbul ignore if */
  if (typeof module === "object") {
    module.exports = Immutable;
  } else if (typeof exports === "object") {
    exports.Immutable = Immutable;
  } else if (typeof window === "object") {
    window.Immutable = Immutable;
  } else if (typeof global === "object") {
    global.Immutable = Immutable;
  }
})();

}).call(this,require('_process'),window)

},{"_process":19}],37:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],38:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ponyfill = require('./ponyfill.js');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var root; /* global window */


if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;
}).call(this,window)

},{"./ponyfill.js":39}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};
},{}],40:[function(require,module,exports){
function E () {
  // Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
  on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;

},{}],41:[function(require,module,exports){
module.exports = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<svg width=\"10px\" height=\"30px\" viewBox=\"0 0 10 30\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <!-- Generator: Sketch 46.2 (44496) - http://www.bohemiancoding.com/sketch -->\n    <title>Shape</title>\n    <desc>Created with Sketch.</desc>\n    <defs></defs>\n    <g id=\"Symbols\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g id=\"Start-annotating---eLife\" transform=\"translate(-239.000000, -73.000000)\" fill-rule=\"nonzero\" fill=\"#000000\">\n            <g id=\"Group-10\" transform=\"translate(1.000000, 1.000000)\">\n                <path d=\"M243.3125,75.186875 C243.3125,73.535 243.3125,72.625 246.434687,72.625 L248,72.625 L248,72 L246.434687,72 C244.324375,72 243.402813,72.4684375 243,73.183125 C242.597187,72.4684375 241.675625,72 239.565313,72 L238,72 L238,72.625 L239.565313,72.625 C242.6875,72.6246875 242.6875,73.5346875 242.6875,75.186875 L242.6875,82 L242.6875,86.6875 L240.929375,86.6875 L240.929375,87.3125 L242.6875,87.3125 L242.6875,92 L242.6875,98.5434375 C242.6875,100.187188 242.6875,101.375 239.565313,101.375 L238,101.375 L238,102 L239.565313,102 C241.675625,102 242.5975,101.442813 243,100.6525 C243.402813,101.442813 244.324375,102 246.434687,102 L248,102 L248,101.375 L246.434687,101.375 C243.3125,101.374688 243.3125,100.187188 243.3125,98.5434375 L243.3125,91.9996875 L243.3125,87.3121875 L245.070312,87.3121875 L245.070312,86.6871875 L243.3125,86.6871875 L243.3125,81.9996875 L243.3125,75.186875 Z\" id=\"Shape\"></path>\n            </g>\n        </g>\n    </g>\n</svg>";

},{}],42:[function(require,module,exports){
module.exports = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<svg width=\"16px\" height=\"16px\" viewBox=\"0 0 16 16\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <!-- Generator: Sketch 39.1 (31720) - http://www.bohemiancoding.com/sketch -->\n    <defs/>\n    <g id=\"Page-1\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g id=\"Artboard\" fill=\"#D00032\">\n            <g id=\"Group\">\n                <path d=\"M0,8 C0,12.418278 3.581722,16 8,16 C12.418278,16 16,12.418278 16,8 C16,4.89580324 14.2154684,2.11256098 11.4682644,0.789110134 L10.6002482,2.59092808 C12.661769,3.58405472 14,5.6712248 14,8 C14,11.3137085 11.3137085,14 8,14 C4.6862915,14 2,11.3137085 2,8 C2,5.65296151 3.35941993,3.55225774 5.44569583,2.56903563 L4.59307587,0.759881355 C1.81273067,2.07020511 0,4.87140735 0,8 Z\" id=\"Oval\"/>\n                <polygon id=\"Combined-Shape\" points=\"7 8.58578644 7 0 9 0 9 8.58578644 10.2928932 7.29289322 11 6.58578644 12.4142136 8 11.7071068 8.70710678 8.70710678 11.7071068 8 12.4142136 7.64644661 12.0606602 7.29289322 11.7071068 4.29289322 8.70710678 3.58578644 8 5 6.58578644 5.70710678 7.29289322\"/>\n            </g>\n        </g>\n    </g>\n</svg>\n";

},{}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{"./frame-rpc":46,"extend":4}],45:[function(require,module,exports){
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


},{}],46:[function(require,module,exports){
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

},{}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
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
    "Show one annotation": "Show one annotation"
}
},{}],49:[function(require,module,exports){
module.exports={
    "Feedback": "注釈タリングする",
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
},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
'use strict';

analytics.$inject = ["$analytics", "$window", "settings"];
var VIA_REFERRER = /^https:\/\/(qa-)?via.hypothes.is\//;

var globalGAOptions = function globalGAOptions(win, settings) {

  settings = settings || {};

  var globalOpts = {
    category: ''
  };

  var validTypes = ['chrome-extension', 'firefox-extension', 'embed', 'bookmarklet', 'via'];

  // The preferred method for deciding what type of app is running is
  // through the setting of the appType to one of the valid types above.
  // However, we also want to capture app types where we were not given
  // the appType setting explicitly - these are the app types that were
  // added before we added the analytics logic
  if (validTypes.indexOf((settings.appType || '').toLowerCase()) > -1) {
    globalOpts.category = settings.appType.toLowerCase();
  } else if (win.location.protocol === 'chrome-extension:') {
    globalOpts.category = 'chrome-extension';
  } else if (VIA_REFERRER.test(win.document.referrer)) {
    globalOpts.category = 'via';
  } else {
    globalOpts.category = 'embed';
  }

  return globalOpts;
};

/**
 * Analytics API to simplify and standardize the values that we
 * pass to the Angulartics service.
 *
 * These analytics are based on google analytics and need to conform to its
 * requirements. Specifically, we are required to send the event and a category.
 *
 * We will standardize the category to be the appType of the client settings
 */
// @ngInject
function analytics($analytics, $window, settings) {
  var options = $window ? globalGAOptions($window, settings) : {};

  return {

    /**
     * @param  {string} event This is the event name that we are capturing
     *  in our analytics. Example: 'sidebarOpened'. Use camelCase to track multiple
     *  words.
     */
    track: function track(event, label, metricValue) {
      $analytics.eventTrack(event, Object.assign({}, {
        label: label || undefined,
        metricValue: isNaN(metricValue) ? undefined : metricValue
      }, options));
    },

    events: {
      ANNOTATION_CREATED: 'annotationCreated',
      ANNOTATION_DELETED: 'annotationDeleted',
      ANNOTATION_FLAGGED: 'annotationFlagged',
      ANNOTATION_SHARED: 'annotationShared',
      ANNOTATION_UPDATED: 'annotationUpdated',
      DOCUMENT_SHARED: 'documentShared',
      GROUP_LEAVE: 'groupLeave',
      GROUP_SWITCH: 'groupSwitch',
      GROUP_VIEW_ACTIVITY: 'groupViewActivity',
      HIGHLIGHT_CREATED: 'highlightCreated',
      HIGHLIGHT_UPDATED: 'highlightUpdated',
      HIGHLIGHT_DELETED: 'highlightDeleted',
      LOGIN_FAILURE: 'loginFailure',
      LOGIN_SUCCESS: 'loginSuccessful',
      LOGOUT_FAILURE: 'logoutFailure',
      LOGOUT_SUCCESS: 'logoutSuccessful',
      PAGE_NOTE_CREATED: 'pageNoteCreated',
      PAGE_NOTE_UPDATED: 'pageNoteUpdated',
      PAGE_NOTE_DELETED: 'pageNoteDeleted',
      REPLY_CREATED: 'replyCreated',
      REPLY_UPDATED: 'replyUpdated',
      REPLY_DELETED: 'replyDeleted',
      SIDEBAR_OPENED: 'sidebarOpened',
      SIGN_UP_REQUESTED: 'signUpRequested'
    }
  };
}

module.exports = analytics;

},{}],52:[function(require,module,exports){
'use strict';

annotationMapper.$inject = ["$rootScope", "annotationUI", "store"];
var angular = require('angular');

var events = require('./events');

function getExistingAnnotation(annotationUI, id) {
  return annotationUI.getState().annotations.find(function (annot) {
    return annot.id === id;
  });
}

// Wraps the annotation store to trigger events for the CRUD actions
// @ngInject
function annotationMapper($rootScope, annotationUI, store) {
  function loadAnnotations(annotations, replies) {
    annotations = annotations.concat(replies || []);

    var loaded = [];
    annotations.forEach(function (annotation) {
      var existing = getExistingAnnotation(annotationUI, annotation.id);
      if (existing) {
        $rootScope.$broadcast(events.ANNOTATION_UPDATED, annotation);
        return;
      }
      loaded.push(annotation);
    });

    $rootScope.$broadcast(events.ANNOTATIONS_LOADED, loaded);
  }

  function unloadAnnotations(annotations) {
    var unloaded = annotations.map(function (annotation) {
      var existing = getExistingAnnotation(annotationUI, annotation.id);
      if (existing && annotation !== existing) {
        annotation = angular.copy(annotation, existing);
      }
      return annotation;
    });
    $rootScope.$broadcast(events.ANNOTATIONS_UNLOADED, unloaded);
  }

  function createAnnotation(annotation) {
    $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annotation);
    return annotation;
  }

  function deleteAnnotation(annotation) {
    return store.annotation.delete({
      id: annotation.id
    }).then(function () {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, annotation);
      return annotation;
    });
  }

  function flagAnnotation(annot) {
    return store.annotation.flag({
      id: annot.id
    }).then(function () {
      $rootScope.$broadcast(events.ANNOTATION_FLAGGED, annot);
      return annot;
    });
  }

  return {
    loadAnnotations: loadAnnotations,
    unloadAnnotations: unloadAnnotations,
    createAnnotation: createAnnotation,
    deleteAnnotation: deleteAnnotation,
    flagAnnotation: flagAnnotation
  };
}

module.exports = annotationMapper;

},{"./events":97,"angular":"angular"}],53:[function(require,module,exports){
'use strict';

/**
 * Utility functions for querying annotation metadata.
 */

/** Extract a URI, domain and title from the given domain model object.
 *
 * @param {object} annotation An annotation domain model object as received
 *   from the server-side API.
 * @returns {object} An object with three properties extracted from the model:
 *   uri, domain and title.
 *
 */

function documentMetadata(annotation) {
  var uri = annotation.uri;
  var domain = new URL(uri).hostname;
  var title = domain;

  if (annotation.document && annotation.document.title) {
    title = annotation.document.title[0];
  }

  if (domain === 'localhost') {
    domain = '';
  }

  return {
    uri: uri,
    domain: domain,
    title: title
  };
}

/**
 * Return the domain and title of an annotation for display on an annotation
 * card.
 */
function domainAndTitle(annotation) {
  return {
    domain: domainTextFromAnnotation(annotation),
    titleText: titleTextFromAnnotation(annotation),
    titleLink: titleLinkFromAnnotation(annotation)
  };
}

function titleLinkFromAnnotation(annotation) {
  var titleLink = annotation.uri;

  if (titleLink && !(titleLink.indexOf('http://') === 0 || titleLink.indexOf('https://') === 0)) {
    // We only link to http(s) URLs.
    titleLink = null;
  }

  if (annotation.links && annotation.links.incontext) {
    titleLink = annotation.links.incontext;
  }

  return titleLink;
}

function domainTextFromAnnotation(annotation) {
  var document = documentMetadata(annotation);

  var domainText = '';
  if (document.uri && document.uri.indexOf('file://') === 0 && document.title) {
    var parts = document.uri.split('/');
    var filename = parts[parts.length - 1];
    if (filename) {
      domainText = filename;
    }
  } else if (document.domain && document.domain !== document.title) {
    domainText = document.domain;
  }

  return domainText;
}

function titleTextFromAnnotation(annotation) {
  var document = documentMetadata(annotation);

  var titleText = document.title;
  if (titleText.length > 30) {
    titleText = titleText.slice(0, 30) + '…';
  }

  return titleText;
}

/** Return `true` if the given annotation is a reply, `false` otherwise. */
function isReply(annotation) {
  return (annotation.references || []).length > 0;
}

/** Return `true` if the given annotation is new, `false` otherwise.
 *
 * "New" means this annotation has been newly created client-side and not
 * saved to the server yet.
 */
function isNew(annotation) {
  return !annotation.id;
}

/** Return `true` if the given annotation is public, `false` otherwise. */
function isPublic(annotation) {
  var isPublic = false;

  if (!annotation.permissions) {
    return isPublic;
  }

  annotation.permissions.read.forEach(function (perm) {
    var readPermArr = perm.split(':');
    if (readPermArr.length === 2 && readPermArr[0] === 'group') {
      isPublic = true;
    }
  });

  return isPublic;
}

/**
 * Return `true` if `annotation` has a selector.
 *
 * An annotation which has a selector refers to a specific part of a document,
 * as opposed to a Page Note which refers to the whole document or a reply,
 * which refers to another annotation.
 */
function hasSelector(annotation) {
  return !!(annotation.target && annotation.target.length > 0 && annotation.target[0].selector);
}

/**
 * Return `true` if the given annotation is not yet anchored.
 *
 * Returns false if anchoring is still in process but the flag indicating that
 * the initial timeout allowed for anchoring has expired.
 */
function isWaitingToAnchor(annotation) {
  return hasSelector(annotation) && typeof annotation.$orphan === 'undefined' && !annotation.$anchorTimeout;
}

/** Return `true` if the given annotation is an orphan. */
function isOrphan(annotation) {
  return hasSelector(annotation) && annotation.$orphan;
}

/** Return `true` if the given annotation is a page note. */
function isPageNote(annotation) {
  return !hasSelector(annotation) && !isReply(annotation);
}

/** Return `true` if the given annotation is a top level annotation, `false` otherwise. */
function isAnnotation(annotation) {
  return !!(hasSelector(annotation) && !isOrphan(annotation));
}

/** Return a numeric key that can be used to sort annotations by location.
 *
 * @return {number} - A key representing the location of the annotation in
 *                    the document, where lower numbers mean closer to the
 *                    start.
 */
function location(annotation) {
  if (annotation) {
    var targets = annotation.target || [];
    for (var i = 0; i < targets.length; i++) {
      var selectors = targets[i].selector || [];
      for (var k = 0; k < selectors.length; k++) {
        if (selectors[k].type === 'TextPositionSelector') {
          return selectors[k].start;
        }
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Return the number of times the annotation has been flagged
 * by other users. If moderation metadata is not present, returns `null`.
 *
 * @return {number|null}
 */
function flagCount(ann) {
  if (!ann.moderation) {
    return null;
  }
  return ann.moderation.flagCount;
}

module.exports = {
  documentMetadata: documentMetadata,
  domainAndTitle: domainAndTitle,
  flagCount: flagCount,
  isAnnotation: isAnnotation,
  isNew: isNew,
  isOrphan: isOrphan,
  isPageNote: isPageNote,
  isPublic: isPublic,
  isReply: isReply,
  isWaitingToAnchor: isWaitingToAnchor,
  location: location
};

},{}],54:[function(require,module,exports){
'use strict';

/**
 * AnnotationUI is the central store of state for the sidebar application,
 * managed using [Redux](http://redux.js.org/).
 *
 * State management in Redux apps work as follows:
 *
 *  1. All important application state is stored in a single, immutable object.
 *  2. The user interface is a presentation of this state. Interaction with the
 *     UI triggers updates by creating `actions`.
 *  3. Actions are plain JS objects which describe some event that happened in
 *     the application. Updates happen by passing actions to a `reducer`
 *     function which takes the current application state, the action and
 *     returns the new application state.
 *
 *     The process of updating the app state using an action is known as
 *     'dispatching' the action.
 *  4. Other parts of the app can subscribe to changes in the app state.
 *     This is used to to update the UI etc.
 *
 * "middleware" functions can wrap the dispatch process in order to implement
 *  logging, trigger side effects etc.
 *
 * Tests for a given action consist of:
 *
 *  1. Checking that the UI (or other event source) dispatches the correct
 *     action when something happens.
 *  2. Checking that given an initial state, and an action, a reducer returns
 *     the correct resulting state.
 *  3. Checking that the UI correctly presents a given state.
 */

var redux = require('redux');

// `.default` is needed because 'redux-thunk' is built as an ES2015 module
var thunk = require('redux-thunk').default;

var reducers = require('./reducers');
var annotationsReducer = require('./reducers/annotations');
var framesReducer = require('./reducers/frames');
var linksReducer = require('./reducers/links');
var selectionReducer = require('./reducers/selection');
var sessionReducer = require('./reducers/session');
var viewerReducer = require('./reducers/viewer');
var util = require('./reducers/util');

var debugMiddleware = require('./reducers/debug-middleware');

/**
 * Redux middleware which triggers an Angular change-detection cycle
 * if no cycle is currently in progress.
 *
 * This ensures that Angular UI components are updated after the UI
 * state changes in response to external inputs (eg. WebSocket messages,
 * messages arriving from other frames in the page, async network responses).
 *
 * See http://redux.js.org/docs/advanced/Middleware.html
 */
function angularDigestMiddleware($rootScope) {
  return function (next) {
    return function (action) {
      next(action);

      // '$$phase' is set if Angular is in the middle of a digest cycle already
      if (!$rootScope.$$phase) {
        // $applyAsync() is similar to $apply() but provides debouncing.
        // See http://stackoverflow.com/questions/30789177
        $rootScope.$applyAsync(function () {});
      }
    };
  };
}

// @ngInject
module.exports = function ($rootScope, settings) {
  var enhancer = redux.applyMiddleware(
  // The `thunk` middleware handles actions which are functions.
  // This is used to implement actions which have side effects or are
  // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
  thunk, debugMiddleware, angularDigestMiddleware.bind(null, $rootScope));
  var store = redux.createStore(reducers.update, reducers.init(settings), enhancer);

  // Expose helper functions that create actions as methods of the
  // `annotationUI` service to make using them easier from app code. eg.
  //
  // Instead of:
  //   annotationUI.dispatch(annotations.actions.addAnnotations(annotations))
  // You can use:
  //   annotationUI.addAnnotations(annotations)
  //
  var actionCreators = redux.bindActionCreators(Object.assign({}, annotationsReducer.actions, framesReducer.actions, linksReducer.actions, selectionReducer.actions, sessionReducer.actions, viewerReducer.actions), store.dispatch);

  // Expose selectors as methods of the `annotationUI` to make using them easier
  // from app code.
  //
  // eg. Instead of:
  //   selection.isAnnotationSelected(annotationUI.getState(), id)
  // You can use:
  //   annotationUI.isAnnotationSelected(id)
  var selectors = util.bindSelectors({
    isAnnotationSelected: selectionReducer.isAnnotationSelected,
    hasSelectedAnnotations: selectionReducer.hasSelectedAnnotations,

    annotationExists: annotationsReducer.annotationExists,
    findAnnotationByID: annotationsReducer.findAnnotationByID,
    findIDsForTags: annotationsReducer.findIDsForTags,
    savedAnnotations: annotationsReducer.savedAnnotations,

    frames: framesReducer.frames,
    searchUris: framesReducer.searchUris,

    isSidebar: viewerReducer.isSidebar,

    isFeatureEnabled: sessionReducer.isFeatureEnabled,
    profile: sessionReducer.profile
  }, store.getState);

  return Object.assign(store, actionCreators, selectors);
};
module.exports.$inject = ["$rootScope", "settings"];

},{"./reducers":118,"./reducers/annotations":115,"./reducers/debug-middleware":116,"./reducers/frames":117,"./reducers/links":119,"./reducers/selection":120,"./reducers/session":121,"./reducers/util":122,"./reducers/viewer":123,"redux":30,"redux-thunk":24}],55:[function(require,module,exports){
'use strict';

apiRoutes.$inject = ["$http", "settings"];
var _require = require('./retry-util'),
    retryPromiseOperation = _require.retryPromiseOperation;

/**
 * A service which fetches and caches API route metadata.
 */
// @ngInject


function apiRoutes($http, settings) {
  // Cache of route name => route metadata from API root.
  var routeCache;
  // Cache of links to pages on the service fetched from the API's "links"
  // endpoint.
  var linkCache;

  function getJSON(url) {
    return $http.get(url).then(function (_ref) {
      var status = _ref.status,
          data = _ref.data;

      if (status !== 200) {
        throw new Error('Fetching ' + url + ' failed');
      }
      return data;
    });
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return {Promise<Object>} - Map of routes to route metadata.
   */
  function routes() {
    if (!routeCache) {
      routeCache = retryPromiseOperation(function () {
        return getJSON(settings.apiUrl);
      }).then(function (index) {
        return index.links;
      });
    }
    return routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   *
   * @return {Promise<Object>} - Map of link name to URL
   */
  function links() {
    if (!linkCache) {
      linkCache = routes().then(function (routes) {
        return getJSON(routes.links.url);
      });
    }
    return linkCache;
  }

  return { routes: routes, links: links };
}

module.exports = apiRoutes;

},{"./retry-util":125}],56:[function(require,module,exports){
'use strict';

/** Default state for new threads, before applying filters etc. */

var DEFAULT_THREAD_STATE = {
  /**
   * The ID of this thread. This will be the same as the annotation ID for
   * created annotations or the `$tag` property for new annotations.
   */
  id: undefined,
  /**
   * The Annotation which is displayed by this thread.
   *
   * This may be null if the existence of an annotation is implied by the
   * `references` field in an annotation but the referenced parent annotation
   * does not exist.
   */
  annotation: undefined,
  /** The parent thread ID */
  parent: undefined,
  /** True if this thread is collapsed, hiding replies to this annotation. */
  collapsed: false,
  /** True if this annotation matches the current filters. */
  visible: true,
  /** Replies to this annotation. */
  children: [],
  /**
    * The total number of children of this annotation,
    * including any which have been hidden by filters.
    */
  totalChildren: 0,
  /**
   * The highlight state of this annotation:
   *  undefined - Do not (de-)emphasize this annotation
   *  'dim' - De-emphasize this annotation
   *  'highlight' - Emphasize this annotation
   */
  highlightState: undefined
};

/**
 * Returns a persistent identifier for an Annotation.
 * If the Annotation has been created on the server, it will have
 * an ID assigned, otherwise we fall back to the local-only '$tag'
 * property.
 */
function id(annotation) {
  return annotation.id || annotation.$tag;
}

/**
 * Link the annotation with ID `id` to its parent thread.
 *
 * @param {string} id
 * @param {Array<string>} parents - IDs of parent annotations, from the
 *        annotation's `references` field.
 */
function setParentID(threads, id, parents) {
  if (threads[id].parent || !parents.length) {
    // Parent already assigned, do not try to change it.
    return;
  }
  var parentID = parents[parents.length - 1];
  if (!threads[parentID]) {
    // Parent does not exist. This may be a reply to an annotation which has
    // been deleted. Create a placeholder Thread with no annotation to
    // represent the missing annotation.
    threads[parentID] = Object.assign({}, DEFAULT_THREAD_STATE, {
      id: parentID,
      children: []
    });
    setParentID(threads, parentID, parents.slice(0, -1));
  }

  var grandParentID = threads[parentID].parent;
  while (grandParentID) {
    if (grandParentID === id) {
      // There is a loop in the `references` field, abort.
      return;
    } else {
      grandParentID = threads[grandParentID].parent;
    }
  }

  threads[id].parent = parentID;
  threads[parentID].children.push(threads[id]);
}

/**
 * Creates a thread of annotations from a list of annotations.
 *
 * Given a flat list of annotations and replies, this generates a hierarchical
 * thread, using the `references` field of an annotation to link together
 * annotations and their replies. The `references` field is a possibly
 * incomplete ordered list of the parents of an annotation, from furthest to
 * nearest ancestor.
 *
 * @param {Array<Annotation>} annotations - The input annotations to thread.
 * @return {Thread} - The input annotations threaded into a tree structure.
 */
function threadAnnotations(annotations) {
  // Map of annotation ID -> container
  var threads = {};

  // Build mapping of annotation ID -> thread
  annotations.forEach(function (annotation) {
    threads[id(annotation)] = Object.assign({}, DEFAULT_THREAD_STATE, {
      id: id(annotation),
      annotation: annotation,
      children: []
    });
  });

  // Set each thread's parent based on the references field
  annotations.forEach(function (annotation) {
    if (!annotation.references) {
      return;
    }
    setParentID(threads, id(annotation), annotation.references);
  });

  // Collect the set of threads which have no parent as
  // children of the thread root
  var roots = [];
  Object.keys(threads).forEach(function (id) {
    if (!threads[id].parent) {
      // Top-level threads are collapsed by default
      threads[id].collapsed = true;
      roots.push(threads[id]);
    }
  });

  var root = {
    annotation: undefined,
    children: roots,
    visible: true,
    collapsed: false,
    totalChildren: roots.length
  };

  return root;
}

/**
 * Returns a copy of `thread` with the thread
 * and each of its children transformed by mapFn(thread).
 *
 * @param {Thread} thread
 * @param {(Thread) => Thread} mapFn
 */
function mapThread(thread, mapFn) {
  return Object.assign({}, mapFn(thread), {
    children: thread.children.map(function (child) {
      return mapThread(child, mapFn);
    })
  });
}

/**
 * Return a sorted copy of an array of threads.
 *
 * @param {Array<Thread>} threads - The list of threads to sort
 * @param {(Annotation,Annotation) => boolean} compareFn
 * @return {Array<Thread>} Sorted list of threads
 */
function sort(threads, compareFn) {
  return threads.slice().sort(function (a, b) {
    // Threads with no annotation always sort to the top
    if (!a.annotation || !b.annotation) {
      if (!a.annotation && !b.annotation) {
        return 0;
      } else {
        return !a.annotation ? -1 : 1;
      }
    }

    if (compareFn(a.annotation, b.annotation)) {
      return -1;
    } else if (compareFn(b.annotation, a.annotation)) {
      return 1;
    } else {
      return 0;
    }
  });
}

/**
 * Return a copy of `thread` with siblings of the top-level thread sorted according
 * to `compareFn` and replies sorted by `replyCompareFn`.
 */
function sortThread(thread, compareFn, replyCompareFn) {
  var children = thread.children.map(function (child) {
    return sortThread(child, replyCompareFn, replyCompareFn);
  });

  return Object.assign({}, thread, {
    children: sort(children, compareFn)
  });
}

/**
 * Return a copy of @p thread with the `replyCount` and `depth` properties
 * updated.
 */
function countRepliesAndDepth(thread, depth) {
  var children = thread.children.map(function (c) {
    return countRepliesAndDepth(c, depth + 1);
  });
  return Object.assign({}, thread, {
    children: children,
    depth: depth,
    replyCount: children.reduce(function (total, child) {
      return total + 1 + child.replyCount;
    }, 0)
  });
}

/** Return true if a thread has any visible children. */
function hasVisibleChildren(thread) {
  return thread.children.some(function (child) {
    return child.visible || hasVisibleChildren(child);
  });
}

/**
 * Default options for buildThread()
 */
var defaultOpts = {
  /** List of currently selected annotation IDs */
  selected: [],
  /**
   * List of IDs of annotations that should be shown even if they
   * do not match the current filter.
   */
  forceVisible: undefined,
  /**
   * Predicate function that returns true if an annotation should be
   * displayed.
   */
  filterFn: undefined,
  /**
   * A filter function which should return true if a given annotation and
   * its replies should be displayed.
   */
  threadFilterFn: undefined,
  /**
   * Mapping of annotation IDs to expansion states.
   */
  expanded: {},
  /** List of highlighted annotation IDs */
  highlighted: [],
  /**
   * Less-than comparison function used to compare annotations in order to sort
   * the top-level thread.
   */
  sortCompareFn: function sortCompareFn(a, b) {
    return a.id < b.id;
  },
  /**
   * Less-than comparison function used to compare annotations in order to sort
   * replies.
   */
  replySortCompareFn: function replySortCompareFn(a, b) {
    return a.created < b.created;
  }
};

/**
 * Project, filter and sort a list of annotations into a thread structure for
 * display by the <annotation-thread> directive.
 *
 * buildThread() takes as inputs a flat list of annotations,
 * the current visibility filters and sort function and returns
 * the thread structure that should be rendered.
 *
 * @param {Array<Annotation>} annotations - A list of annotations and replies
 * @param {Options} opts
 * @return {Thread} - The root thread, whose children are the top-level
 *                    annotations to display.
 */
function buildThread(annotations, opts) {
  opts = Object.assign({}, defaultOpts, opts);

  var thread = threadAnnotations(annotations);

  // Mark annotations as visible or hidden depending on whether
  // they are being edited and whether they match the current filter
  // criteria
  var shouldShowThread = function shouldShowThread(annotation) {
    if (opts.forceVisible && opts.forceVisible.indexOf(id(annotation)) !== -1) {
      return true;
    }
    if (opts.filterFn && !opts.filterFn(annotation)) {
      return false;
    }
    return true;
  };

  // When there is a selection, only include top-level threads (annotations)
  // that are selected
  if (opts.selected.length > 0) {
    thread = Object.assign({}, thread, {
      children: thread.children.filter(function (child) {
        return opts.selected.indexOf(child.id) !== -1;
      })
    });
  }

  // Set the visibility and highlight states of threads
  thread = mapThread(thread, function (thread) {
    var highlightState;
    if (opts.highlighted.length > 0) {
      var isHighlighted = thread.annotation && opts.highlighted.indexOf(thread.id) !== -1;
      highlightState = isHighlighted ? 'highlight' : 'dim';
    }

    return Object.assign({}, thread, {
      highlightState: highlightState,
      visible: thread.visible && thread.annotation && shouldShowThread(thread.annotation)
    });
  });

  // Expand any threads which:
  // 1) Have been explicitly expanded OR
  // 2) Have children matching the filter
  thread = mapThread(thread, function (thread) {
    var id = thread.id;

    // If the thread was explicitly expanded or collapsed, respect that option
    if (opts.expanded.hasOwnProperty(id)) {
      return Object.assign({}, thread, { collapsed: !opts.expanded[id] });
    }

    var hasUnfilteredChildren = opts.filterFn && hasVisibleChildren(thread);

    return Object.assign({}, thread, {
      collapsed: thread.collapsed && !hasUnfilteredChildren
    });
  });

  // Remove top-level threads which contain no visible annotations
  thread.children = thread.children.filter(function (child) {
    return child.visible || hasVisibleChildren(child);
  });

  // Get annotations which are of type notes or annotations depending
  // on the filter.
  if (opts.threadFilterFn) {
    thread.children = thread.children.filter(opts.threadFilterFn);
  }

  // Sort the root thread according to the current search criteria
  thread = sortThread(thread, opts.sortCompareFn, opts.replySortCompareFn);

  // Update `replyCount` and `depth` properties
  thread = countRepliesAndDepth(thread, -1);

  return thread;
}

module.exports = buildThread;

},{}],57:[function(require,module,exports){
'use strict';

module.exports = {
  controllerAs: 'vm',
  bindings: {
    icon: '<',
    isDisabled: '<',
    label: '<',
    onClick: '&'
  },
  template: require('../templates/annotation-action-button.html')
};

},{"../templates/annotation-action-button.html":137}],58:[function(require,module,exports){
'use strict';

AnnotationHeaderController.$inject = ["features", "groups", "settings", "serviceUrl"];
var annotationMetadata = require('../annotation-metadata');
var memoize = require('../util/memoize');

var _require = require('../util/account-id'),
    isThirdPartyUser = _require.isThirdPartyUser,
    username = _require.username;

// @ngInject


function AnnotationHeaderController(features, groups, settings, serviceUrl) {
  var _this = this;

  var self = this;

  this.user = function () {
    return self.annotation.user;
  };

  this.displayName = function () {
    var userInfo = _this.annotation.user_info;
    var isThirdPartyUser_ = isThirdPartyUser(_this.annotation.user, settings.authDomain);
    if (features.flagEnabled('client_display_names') || isThirdPartyUser_) {
      // userInfo is undefined if the api_render_user_info feature flag is off.
      if (userInfo) {
        // display_name is null if the user doesn't have a display name.
        if (userInfo.display_name) {
          return userInfo.display_name;
        }
      }
    }
    return username(_this.annotation.user);
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(self.annotation.user, settings.authDomain);
  };

  this.thirdPartyUsernameLink = function () {
    return settings.usernameUrl ? settings.usernameUrl + username(this.annotation.user) : null;
  };

  this.serviceUrl = serviceUrl;

  this.group = function () {
    return groups.get(self.annotation.group);
  };

  var documentMeta = memoize(annotationMetadata.domainAndTitle);
  this.documentMeta = function () {
    return documentMeta(self.annotation);
  };

  this.updated = function () {
    return self.annotation.updated;
  };

  this.htmlLink = function () {
    if (self.annotation.links && self.annotation.links.html) {
      return self.annotation.links.html;
    }
    return '';
  };
}

/**
 * Header component for an annotation card.
 *
 * Header which displays the username, last update timestamp and other key
 * metadata about an annotation.
 */
module.exports = {
  controller: AnnotationHeaderController,
  controllerAs: 'vm',
  bindings: {
    /**
     * The saved annotation
     */
    annotation: '<',

    /**
     * True if the annotation is private or will become private when the user
     * saves their changes.
     */
    isPrivate: '<',

    /** True if the user is currently editing the annotation. */
    isEditing: '<',

    /**
     * True if the annotation is a highlight.
     * FIXME: This should determined in AnnotationHeaderController
     */
    isHighlight: '<',
    onReplyCountClick: '&',
    replyCount: '<',

    /** True if document metadata should be shown. */
    showDocumentInfo: '<'
  },
  template: require('../templates/annotation-header.html')
};

},{"../annotation-metadata":53,"../templates/annotation-header.html":138,"../util/account-id":171,"../util/memoize":176}],59:[function(require,module,exports){
'use strict';

AnnotationShareDialogController.$inject = ["$element", "$scope", "analytics"];
var angular = require('angular');

var scopeTimeout = require('../util/scope-timeout');

// @ngInject
function AnnotationShareDialogController($element, $scope, analytics) {
  var self = this;
  var shareLinkInput = $element.find('input')[0];

  $scope.$watch('vm.isOpen', function (isOpen) {
    if (isOpen) {
      // Focus the input and select it once the dialog has become visible
      scopeTimeout($scope, function () {
        shareLinkInput.focus();
        shareLinkInput.select();
      });
    }
  });

  this.copyToClipboard = function (event) {
    var $container = angular.element(event.currentTarget).parent();
    var shareLinkInput = $container.find('input')[0];

    try {
      shareLinkInput.select();

      // In some browsers, execCommand() returns false if it fails,
      // in others, it may throw an exception instead.
      if (!document.execCommand('copy')) {
        throw new Error('Copying link failed');
      }

      self.copyToClipboardMessage = 'Link copied to clipboard!';
    } catch (ex) {
      self.copyToClipboardMessage = 'Select and copy to share.';
    } finally {
      setTimeout(function () {
        self.copyToClipboardMessage = null;
        $scope.$digest();
      }, 1000);
    }
  };

  this.onShareClick = function (target) {
    if (target) {
      analytics.track(analytics.events.ANNOTATION_SHARED, target);
    }
  };
}

module.exports = {
  controller: AnnotationShareDialogController,
  controllerAs: 'vm',
  bindings: {
    group: '<',
    uri: '<',
    isPrivate: '<',
    isOpen: '<',
    onClose: '&'
  },
  template: require('../templates/annotation-share-dialog.html')
};

},{"../templates/annotation-share-dialog.html":139,"../util/scope-timeout":179,"angular":"angular"}],60:[function(require,module,exports){
'use strict';

function hiddenCount(thread) {
  var isHidden = thread.annotation && !thread.visible;
  return thread.children.reduce(function (count, reply) {
    return count + hiddenCount(reply);
  }, isHidden ? 1 : 0);
}

function visibleCount(thread) {
  var isVisible = thread.annotation && thread.visible;
  return thread.children.reduce(function (count, reply) {
    return count + visibleCount(reply);
  }, isVisible ? 1 : 0);
}

function showAllChildren(thread, showFn) {
  thread.children.forEach(function (child) {
    showFn({ thread: child });
    showAllChildren(child, showFn);
  });
}

function showAllParents(thread, showFn) {
  while (thread.parent && thread.parent.annotation) {
    showFn({ thread: thread.parent });
    thread = thread.parent;
  }
}

// @ngInject
function AnnotationThreadController() {
  // Flag that tracks whether the content of the annotation is hovered,
  // excluding any replies.
  this.annotationHovered = false;

  this.toggleCollapsed = function () {
    this.onChangeCollapsed({
      id: this.thread.id,
      collapsed: !this.thread.collapsed
    });
  };

  this.threadClasses = function () {
    return {
      'annotation-thread': true,
      'annotation-thread--reply': this.thread.depth > 0,
      'annotation-thread--top-reply': this.thread.depth === 1
    };
  };

  this.threadToggleClasses = function () {
    return {
      'annotation-thread__collapse-toggle': true,
      'is-open': !this.thread.collapsed,
      'is-hovered': this.annotationHovered
    };
  };

  this.annotationClasses = function () {
    return {
      annotation: true,
      'annotation--reply': this.thread.depth > 0,
      'is-collapsed': this.thread.collapsed,
      'is-highlighted': this.thread.highlightState === 'highlight',
      'is-dimmed': this.thread.highlightState === 'dim'
    };
  };

  /**
   * Show this thread and any of its children
   */
  this.showThreadAndReplies = function () {
    showAllParents(this.thread, this.onForceVisible);
    this.onForceVisible({ thread: this.thread });
    showAllChildren(this.thread, this.onForceVisible);
  };

  this.isTopLevelThread = function () {
    return !this.thread.parent;
  };

  /**
   * Return the total number of annotations in the current
   * thread which have been hidden because they do not match the current
   * search filter.
   */
  this.hiddenCount = function () {
    return hiddenCount(this.thread);
  };

  this.shouldShowReply = function (child) {
    return visibleCount(child) > 0;
  };
}

/**
 * Renders a thread of annotations.
 */
module.exports = {
  controllerAs: 'vm',
  controller: AnnotationThreadController,
  bindings: {
    /** The annotation thread to render. */
    thread: '<',
    /**
     * Specify whether document information should be shown
     * on annotation cards.
     */
    showDocumentInfo: '<',
    /** Called when the user clicks on the expand/collapse replies toggle. */
    onChangeCollapsed: '&',
    /**
     * Called when the user clicks the button to show this thread or
     * one of its replies.
     */
    onForceVisible: '&'
  },
  template: require('../templates/annotation-thread.html')
};

},{"../templates/annotation-thread.html":140}],61:[function(require,module,exports){
'use strict';

/**
 * Fetch all annotations in the same thread as `id`.
 *
 * @return Promise<Array<Annotation>>
 */

AnnotationViewerContentController.$inject = ["$location", "$routeParams", "annotationUI", "rootThread", "streamer", "store", "streamFilter", "annotationMapper"];
function fetchThread(store, id) {
  var annot;
  return store.annotation.get({ id: id }).then(function (annot) {
    if (annot.references && annot.references.length) {
      // This is a reply, fetch the top-level annotation
      return store.annotation.get({ id: annot.references[0] });
    } else {
      return annot;
    }
  }).then(function (annot_) {
    annot = annot_;
    return store.search({ references: annot.id });
  }).then(function (searchResult) {
    return [annot].concat(searchResult.rows);
  });
}

// @ngInject
function AnnotationViewerContentController($location, $routeParams, annotationUI, rootThread, streamer, store, streamFilter, annotationMapper) {
  var self = this;

  annotationUI.setAppIsSidebar(false);

  var id = $routeParams.id;

  this.search.update = function (query) {
    $location.path('/stream').search('q', query);
  };

  annotationUI.subscribe(function () {
    self.rootThread = rootThread.thread(annotationUI.getState());
  });

  this.setCollapsed = function (id, collapsed) {
    annotationUI.setCollapsed(id, collapsed);
  };

  this.ready = fetchThread(store, id).then(function (annots) {
    annotationMapper.loadAnnotations(annots);

    var topLevelAnnot = annots.filter(function (annot) {
      return (annot.references || []).length === 0;
    })[0];

    if (!topLevelAnnot) {
      return;
    }

    streamFilter.setMatchPolicyIncludeAny().addClause('/references', 'one_of', topLevelAnnot.id, true).addClause('/id', 'equals', topLevelAnnot.id, true);
    streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    streamer.connect();

    annots.forEach(function (annot) {
      annotationUI.setCollapsed(annot.id, false);
    });

    if (topLevelAnnot.id !== id) {
      annotationUI.highlightAnnotations([id]);
    }
  });
}

module.exports = {
  controller: AnnotationViewerContentController,
  controllerAs: 'vm',
  bindings: {
    search: '<'
  },
  template: require('../templates/annotation-viewer-content.html')
};

},{"../templates/annotation-viewer-content.html":141}],62:[function(require,module,exports){
'use strict';

AnnotationController.$inject = ["$document", "$rootScope", "$scope", "$timeout", "$window", "analytics", "annotationUI", "annotationMapper", "drafts", "flash", "groups", "permissions", "serviceUrl", "session", "settings", "store", "streamer", "$filter"];
var annotationMetadata = require('../annotation-metadata');
var events = require('../events');

var _require = require('../util/account-id'),
    isThirdPartyUser = _require.isThirdPartyUser;

var isNew = annotationMetadata.isNew;
var isReply = annotationMetadata.isReply;
var isPageNote = annotationMetadata.isPageNote;

/**
 * Return a copy of `annotation` with changes made in the editor applied.
 */
function updateModel(annotation, changes, permissions) {
  var userid = annotation.user;

  return Object.assign({}, annotation, {
    // Apply changes from the draft
    tags: changes.tags,
    text: changes.text,
    permissions: changes.isPrivate ? permissions.private(userid) : permissions.shared(userid, annotation.group)
  });
}

// @ngInject
function AnnotationController($document, $rootScope, $scope, $timeout, $window, analytics, annotationUI, annotationMapper, drafts, flash, groups, permissions, serviceUrl, session, settings, store, streamer, $filter) {

  var self = this;
  var newlyCreatedByHighlightButton;
  this.isThemeCustom = settings.theme === 'custom';

  /** Save an annotation to the server. */
  function save(annot) {
    var saved;
    var updating = !!annot.id;

    if (updating) {
      saved = store.annotation.update({ id: annot.id }, annot);
    } else {
      saved = store.annotation.create({}, annot);
    }

    return saved.then(function (savedAnnot) {

      var event;

      // Copy across internal properties which are not part of the annotation
      // model saved on the server
      savedAnnot.$tag = annot.$tag;
      Object.keys(annot).forEach(function (k) {
        if (k[0] === '$') {
          savedAnnot[k] = annot[k];
        }
      });

      if (self.isReply()) {
        event = updating ? analytics.events.REPLY_UPDATED : analytics.events.REPLY_CREATED;
      } else if (self.isHighlight()) {
        event = updating ? analytics.events.HIGHLIGHT_UPDATED : analytics.events.HIGHLIGHT_CREATED;
      } else if (isPageNote(self.annotation)) {
        event = updating ? analytics.events.PAGE_NOTE_UPDATED : analytics.events.PAGE_NOTE_CREATED;
      } else {
        event = updating ? analytics.events.ANNOTATION_UPDATED : analytics.events.ANNOTATION_CREATED;
      }

      analytics.track(event);

      return savedAnnot;
    });
  }

  /**
    * Initialize the controller instance.
    *
    * All initialization code except for assigning the controller instance's
    * methods goes here.
    */
  function init() {
    /** Determines whether controls to expand/collapse the annotation body
     * are displayed adjacent to the tags field.
     */
    self.canCollapseBody = false;

    /** Determines whether the annotation body should be collapsed. */
    self.collapseBody = true;

    /** True if the annotation is currently being saved. */
    self.isSaving = false;

    /** True if the 'Share' dialog for this annotation is currently open. */
    self.showShareDialog = false;

    /**
      * `true` if this AnnotationController instance was created as a result of
      * the highlight button being clicked.
      *
      * `false` if the annotation button was clicked, or if this is a highlight
      * or annotation that was fetched from the server (as opposed to created
      * new client-side).
      */
    newlyCreatedByHighlightButton = self.annotation.$highlight || false;

    // New annotations (just created locally by the client, rather then
    // received from the server) have some fields missing. Add them.
    //
    // FIXME: This logic should go in the `addAnnotations` Redux action once all
    // required state is in the store.
    self.annotation.user = self.annotation.user || session.state.userid;
    self.annotation.user_info = self.annotation.user_info || session.state.user_info;
    self.annotation.group = self.annotation.group || groups.focused().id;
    if (!self.annotation.permissions) {
      self.annotation.permissions = permissions.default(self.annotation.user, self.annotation.group);
    }
    self.annotation.text = self.annotation.text || '';
    if (!Array.isArray(self.annotation.tags)) {
      self.annotation.tags = [];
    }

    // Automatically save new highlights to the server when they're created.
    // Note that this line also gets called when the user logs in (since
    // AnnotationController instances are re-created on login) so serves to
    // automatically save highlights that were created while logged out when you
    // log in.
    saveNewHighlight();

    // If this annotation is not a highlight and if it's new (has just been
    // created by the annotate button) or it has edits not yet saved to the
    // server - then open the editor on AnnotationController instantiation.
    if (!newlyCreatedByHighlightButton) {
      if (isNew(self.annotation) || drafts.get(self.annotation)) {
        self.edit();
      }
    }
  }

  /** Save this annotation if it's a new highlight.
   *
   * The highlight will be saved to the server if the user is logged in,
   * saved to drafts if they aren't.
   *
   * If the annotation is not new (it has already been saved to the server) or
   * is not a highlight then nothing will happen.
   *
   */
  function saveNewHighlight() {
    if (!isNew(self.annotation)) {
      // Already saved.
      return;
    }

    if (!self.isHighlight()) {
      // Not a highlight,
      return;
    }

    if (self.annotation.user) {
      // User is logged in, save to server.
      // Highlights are always private.
      self.annotation.permissions = permissions.private(self.annotation.user);
      save(self.annotation).then(function (model) {
        model.$tag = self.annotation.$tag;
        $rootScope.$broadcast(events.ANNOTATION_CREATED, model);
      });
    } else {
      // User isn't logged in, save to drafts.
      drafts.update(self.annotation, self.state());
    }
  }

  this.authorize = function (action) {
    return permissions.permits(self.annotation.permissions, action, session.state.userid);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#flag
    * @description Flag the annotation.
    */
  this.flag = function () {
    if (!session.state.userid) {
      var msg = $filter('translate')('You must be logged in to report an annotation to the moderators. Login to flag annotations');
      flash.error(msg);
      return;
    }

    var onRejected = function onRejected(err) {
      var msg = $filter('translate')('Flagging annotation failed');
      flash.error(err.message, msg);
    };
    annotationMapper.flagAnnotation(self.annotation).then(function () {
      analytics.track(analytics.events.ANNOTATION_FLAGGED);
      annotationUI.updateFlagStatus(self.annotation.id, true);
    }, onRejected);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#delete
    * @description Deletes the annotation.
    */
  this.delete = function () {
    return $timeout(function () {
      // Don't use confirm inside the digest cycle.
      var msg = $filter('translate')('Are you sure you want to delete this annotation?');
      if ($window.confirm(msg)) {

        var onRejected = function onRejected(err) {
          var msg = $filter('translate')('Deleting annotation failed');
          flash.error(err.message, msg);
        };
        $scope.$apply(function () {
          annotationMapper.deleteAnnotation(self.annotation).then(function () {
            var event;

            if (self.isReply()) {
              event = analytics.events.REPLY_DELETED;
            } else if (self.isHighlight()) {
              event = analytics.events.HIGHLIGHT_DELETED;
            } else if (isPageNote(self.annotation)) {
              event = analytics.events.PAGE_NOTE_DELETED;
            } else {
              event = analytics.events.ANNOTATION_DELETED;
            }

            analytics.track(event);
          }, onRejected);
        });
      }
    }, true);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#edit
    * @description Switches the view to an editor.
    */
  this.edit = function () {
    if (!drafts.get(self.annotation)) {
      drafts.update(self.annotation, self.state());
    }
  };

  /**
   * @ngdoc method
   * @name annotation.AnnotationController#editing.
   * @returns {boolean} `true` if this annotation is currently being edited
   *   (i.e. the annotation editor form should be open), `false` otherwise.
   */
  this.editing = function () {
    return drafts.get(self.annotation) && !self.isSaving;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#group.
    * @returns {Object} The full group object associated with the annotation.
    */
  this.group = function () {
    return groups.get(self.annotation.group);
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotaitonController#hasContent
    * @returns {boolean} `true` if this annotation has content, `false`
    *   otherwise.
    */
  this.hasContent = function () {
    return self.state().text.length > 0 || self.state().tags.length > 0;
  };

  /**
    * Return the annotation's quote if it has one or `null` otherwise.
    */
  this.quote = function () {
    if (self.annotation.target.length === 0) {
      return null;
    }
    var target = self.annotation.target[0];
    if (!target.selector) {
      return null;
    }
    var quoteSel = target.selector.find(function (sel) {
      return sel.type === 'TextQuoteSelector';
    });
    return quoteSel ? quoteSel.exact : null;
  };

  this.id = function () {
    return self.annotation.id;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#isHighlight.
    * @returns {boolean} true if the annotation is a highlight, false otherwise
    */
  this.isHighlight = function () {
    if (newlyCreatedByHighlightButton) {
      return true;
    } else if (isNew(self.annotation)) {
      return false;
    } else {
      // Once an annotation has been saved to the server there's no longer a
      // simple property that says whether it's a highlight or not. Instead an
      // annotation is considered a highlight if it has a) content and b) is
      // linked to a specific part of the document.
      if (isPageNote(self.annotation) || isReply(self.annotation)) {
        return false;
      }
      if (self.annotation.hidden) {
        // Annotation has been censored so we have to assume that it had
        // content.
        return false;
      }
      return !self.hasContent();
    }
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#isShared
    * @returns {boolean} True if the annotation is shared (either with the
    * current group or with everyone).
    */
  this.isShared = function () {
    return !self.state().isPrivate;
  };

  // Save on Meta + Enter or Ctrl + Enter.
  this.onKeydown = function (event) {
    if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      self.save();
    }
  };

  this.toggleCollapseBody = function (event) {
    event.stopPropagation();
    self.collapseBody = !self.collapseBody;
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#reply
    * @description
    * Creates a new message in reply to this annotation.
    */
  this.reply = function () {
    var references = (self.annotation.references || []).concat(self.annotation.id);
    var group = self.annotation.group;
    var replyPermissions;
    var userid = session.state.userid;
    if (userid) {
      replyPermissions = self.state().isPrivate ? permissions.private(userid) : permissions.shared(userid, group);
    }
    annotationMapper.createAnnotation({
      group: group,
      references: references,
      permissions: replyPermissions,
      target: [{ source: self.annotation.target[0].source }],
      uri: self.annotation.uri
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#revert
    * @description Reverts an edit in progress and returns to the viewer.
    */
  this.revert = function () {
    drafts.remove(self.annotation);
    if (isNew(self.annotation)) {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, self.annotation);
    }
  };

  this.save = function () {
    var info_message;
    if (!self.annotation.user) {
      info_message = $filter('translate')('Please log in to save your annotations.');
      flash.info(info_message);
      return Promise.resolve();
    }
    if (!self.hasContent() && self.isShared()) {
      info_message = $filter('translate')('Please add text or a tag before publishing.');
      flash.info(info_message);
      return Promise.resolve();
    }

    var updatedModel = updateModel(self.annotation, self.state(), permissions);

    // Optimistically switch back to view mode and display the saving
    // indicator
    self.isSaving = true;

    return save(updatedModel).then(function (model) {
      Object.assign(updatedModel, model);

      self.isSaving = false;

      var event = isNew(self.annotation) ? events.ANNOTATION_CREATED : events.ANNOTATION_UPDATED;
      drafts.remove(self.annotation);

      $rootScope.$broadcast(event, updatedModel);
    }).catch(function (err) {
      self.isSaving = false;
      self.edit();
      var msg = $filter('translate')('Saving annotation failed');
      flash.error(err.message, msg);
    });
  };

  /**
    * @ngdoc method
    * @name annotation.AnnotationController#setPrivacy
    *
    * Set the privacy settings on the annotation to a predefined
    * level. The supported levels are 'private' which makes the annotation
    * visible only to its creator and 'shared' which makes the annotation
    * visible to everyone in the group.
    *
    * The changes take effect when the annotation is saved
    */
  this.setPrivacy = function (privacy) {
    // When the user changes the privacy level of an annotation they're
    // creating or editing, we cache that and use the same privacy level the
    // next time they create an annotation.
    // But _don't_ cache it when they change the privacy level of a reply.
    if (!isReply(self.annotation)) {
      permissions.setDefault(privacy);
    }
    drafts.update(self.annotation, {
      tags: self.state().tags,
      text: self.state().text,
      isPrivate: privacy === 'private'
    });
  };

  this.tagSearchURL = function (tag) {
    if (this.isThirdPartyUser()) {
      return null;
    }
    return serviceUrl('search.tag', { tag: tag });
  };

  this.isOrphan = function () {
    if (typeof self.annotation.$orphan === 'undefined') {
      return self.annotation.$anchorTimeout;
    }
    return self.annotation.$orphan;
  };

  this.user = function () {
    return self.annotation.user;
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(self.annotation.user, settings.authDomain);
  };

  this.isDeleted = function () {
    return streamer.hasPendingDeletion(self.annotation.id);
  };

  this.isHiddenByModerator = function () {
    return self.annotation.hidden;
  };

  this.canFlag = function () {
    // Users can flag any annotations except their own.
    return session.state.userid !== self.annotation.user;
  };

  this.isFlagged = function () {
    return self.annotation.flagged;
  };

  this.isReply = function () {
    return isReply(self.annotation);
  };

  this.incontextLink = function () {
    if (self.annotation.links) {
      return self.annotation.links.incontext || self.annotation.links.html || '';
    }
    return '';
  };

  /**
   * Sets whether or not the controls for expanding/collapsing the body of
   * lengthy annotations should be shown.
   */
  this.setBodyCollapsible = function (canCollapse) {
    if (canCollapse === self.canCollapseBody) {
      return;
    }
    self.canCollapseBody = canCollapse;

    // This event handler is called from outside the digest cycle, so
    // explicitly trigger a digest.
    $scope.$digest();
  };

  this.setText = function (text) {
    drafts.update(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: self.state().tags,
      text: text
    });
  };

  this.setTags = function (tags) {
    drafts.update(self.annotation, {
      isPrivate: self.state().isPrivate,
      tags: tags,
      text: self.state().text
    });
  };

  this.state = function () {
    var draft = drafts.get(self.annotation);
    if (draft) {
      return draft;
    }
    return {
      tags: self.annotation.tags,
      text: self.annotation.text,
      isPrivate: !permissions.isShared(self.annotation.permissions, self.annotation.user)
    };
  };

  /**
   * Return true if the CC 0 license notice should be shown beneath the
   * annotation body.
   */
  this.shouldShowLicense = function () {
    if (!self.editing() || !self.isShared()) {
      return false;
    }
    return self.group().public;
  };

  init();
}

module.exports = {
  controller: AnnotationController,
  controllerAs: 'vm',
  bindings: {
    annotation: '<',
    showDocumentInfo: '<',
    onReplyCountClick: '&',
    replyCount: '<',
    isCollapsed: '<'
  },
  template: require('../templates/annotation.html'),

  // Private helper exposed for use in unit tests.
  updateModel: updateModel
};

},{"../annotation-metadata":53,"../events":97,"../templates/annotation.html":142,"../util/account-id":171}],63:[function(require,module,exports){
'use strict';

// @ngInject

DropdownMenuBtnController.$inject = ["$timeout"];
function DropdownMenuBtnController($timeout) {
  var self = this;
  this.toggleDropdown = function ($event) {
    $event.stopPropagation();
    $timeout(function () {
      self.onToggleDropdown();
    }, 0);
  };
}

module.exports = {
  controller: DropdownMenuBtnController,
  controllerAs: 'vm',
  bindings: {
    isDisabled: '<',
    label: '<',
    dropdownMenuLabel: '@',
    onClick: '&',
    onToggleDropdown: '&'
  },
  template: require('../templates/dropdown-menu-btn.html')
};

},{"../templates/dropdown-menu-btn.html":143}],64:[function(require,module,exports){
'use strict';

// @ngInject

ExcerptController.$inject = ["$element", "$scope", "ExcerptOverflowMonitor"];
function ExcerptController($element, $scope, ExcerptOverflowMonitor) {
  var self = this;

  if (this.collapse === undefined) {
    this.collapse = true;
  }

  if (this.animate === undefined) {
    this.animate = true;
  }

  if (this.enabled === undefined) {
    this.enabled = true;
  }

  this.isExpandable = function () {
    return this.overflowing && this.collapse;
  };

  this.isCollapsible = function () {
    return this.overflowing && !this.collapse;
  };

  this.toggle = function (event) {
    // When the user clicks a link explicitly to toggle the collapsed state,
    // the event is not propagated.
    event.stopPropagation();
    this.collapse = !this.collapse;
  };

  this.expand = function () {
    // When the user expands the excerpt 'implicitly' by clicking at the bottom
    // of the collapsed excerpt, the event is allowed to propagate. For
    // annotation cards, this causes clicking on a quote to scroll the view to
    // the selected annotation.
    this.collapse = false;
  };

  this.showInlineControls = function () {
    return this.overflowing && this.inlineControls;
  };

  this.bottomShadowStyles = function () {
    return {
      'excerpt__shadow': true,
      'excerpt__shadow--transparent': this.inlineControls,
      'is-hidden': !this.isExpandable()
    };
  };

  // Test if the element or any of its parents have been hidden by
  // an 'ng-show' directive
  function isElementHidden() {
    var el = $element[0];
    while (el) {
      if (el.classList.contains('ng-hide')) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  var overflowMonitor = new ExcerptOverflowMonitor({
    getState: function getState() {
      return {
        enabled: self.enabled,
        animate: self.animate,
        collapsedHeight: self.collapsedHeight,
        collapse: self.collapse,
        overflowHysteresis: self.overflowHysteresis
      };
    },
    contentHeight: function contentHeight() {
      var contentElem = $element[0].querySelector('.excerpt');
      if (!contentElem) {
        return null;
      }
      return contentElem.scrollHeight;
    },
    onOverflowChanged: function onOverflowChanged(overflowing) {
      self.overflowing = overflowing;
      if (self.onCollapsibleChanged) {
        self.onCollapsibleChanged({ collapsible: overflowing });
      }
      // Even though this change happens outside the framework, we use
      // $digest() rather than $apply() here to avoid a large number of full
      // digest cycles if many excerpts update their overflow state at the
      // same time. The onCollapsibleChanged() handler, if any, is
      // responsible for triggering any necessary digests in parent scopes.
      $scope.$digest();
    }
  }, window.requestAnimationFrame);

  this.contentStyle = overflowMonitor.contentStyle;

  // Listen for document events which might affect whether the excerpt
  // is overflowing, even if its content has not changed.
  $element[0].addEventListener('load', overflowMonitor.check, false /* capture */);
  window.addEventListener('resize', overflowMonitor.check);
  $scope.$on('$destroy', function () {
    window.removeEventListener('resize', overflowMonitor.check);
  });

  // Watch for changes to the visibility of the excerpt.
  // Unfortunately there is no DOM API for this, so we rely on a digest
  // being triggered after the visibility changes.
  $scope.$watch(isElementHidden, function (hidden) {
    if (!hidden) {
      overflowMonitor.check();
    }
  });

  // Watch input properties which may affect the overflow state
  $scope.$watch('vm.contentData', overflowMonitor.check);
  $scope.$watch('vm.enabled', overflowMonitor.check);

  // Trigger an initial calculation of the overflow state.
  //
  // This is performed asynchronously so that the content of the <excerpt>
  // has settled - ie. all Angular directives have been fully applied and
  // the DOM has stopped changing. This may take several $digest cycles.
  overflowMonitor.check();
}

/**
 * @description This component truncates the height of its contents to a
 *              specified number of lines and provides controls for expanding
 *              and collapsing the resulting truncated element.
 */
module.exports = {
  controller: ExcerptController,
  controllerAs: 'vm',
  bindings: {
    /** Whether or not expansion should be animated. Defaults to true. */
    animate: '<?',
    /**
     * The data which is used to generate the excerpt's content.
     * When this changes, the excerpt will recompute whether the content
     * is overflowing.
     */
    contentData: '<',
    /** Whether or not truncation should be enabled */
    enabled: '<?',
    /**
     * Specifies whether controls to expand and collapse
     * the excerpt should be shown inside the <excerpt> component.
     * If false, external controls can expand/collapse the excerpt by
     * setting the 'collapse' property.
     */
    inlineControls: '<',
    /** Sets whether or not the excerpt is collapsed. */
    collapse: '=?',
    /**
     * Called when the collapsibility of the excerpt (that is, whether or
     * not the content height exceeds the collapsed height), changes.
     *
     * Note: This function is *not* called from inside a digest cycle,
     * the caller is responsible for triggering any necessary digests.
     */
    onCollapsibleChanged: '&?',
    /** The height of this container in pixels when collapsed.
     */
    collapsedHeight: '<',
    /**
     * The number of pixels by which the height of the excerpt's content
     * must extend beyond the collapsed height in order for truncation to
     * be activated. This prevents the 'More' link from being shown to expand
     * the excerpt if it has only been truncated by a very small amount, such
     * that expanding the excerpt would reveal no extra lines of text.
     */
    overflowHysteresis: '<?'
  },
  transclude: true,
  template: require('../templates/excerpt.html')
};

},{"../templates/excerpt.html":144}],65:[function(require,module,exports){
'use strict';

GroupListController.$inject = ["$window", "analytics", "groups", "settings", "serviceUrl"];
var _require = require('../util/account-id'),
    isThirdPartyUser = _require.isThirdPartyUser;

var serviceConfig = require('../service-config');

// @ngInject
function GroupListController($window, analytics, groups, settings, serviceUrl) {
  this.groups = groups;

  this.createNewGroup = function () {
    $window.open(serviceUrl('groups.new'), '_blank');
  };

  this.isThirdPartyUser = function () {
    return isThirdPartyUser(this.auth.userid, settings.authDomain);
  };

  this.leaveGroup = function (groupId) {
    var groupName = groups.get(groupId).name;
    var message = 'Are you sure you want to leave the group "' + groupName + '"?';
    if ($window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(groupId);
    }
  };

  this.viewGroupActivity = function () {
    analytics.track(analytics.events.GROUP_VIEW_ACTIVITY);
  };

  this.focusGroup = function (groupId) {
    analytics.track(analytics.events.GROUP_SWITCH);
    groups.focus(groupId);
  };

  var svc = serviceConfig(settings);
  if (svc && svc.icon) {
    this.thirdPartyGroupIcon = svc.icon;
  }
}

module.exports = {
  controller: GroupListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<'
  },
  template: require('../templates/group-list.html')
};

},{"../service-config":129,"../templates/group-list.html":145,"../util/account-id":171}],66:[function(require,module,exports){
'use strict';

module.exports = {
  controllerAs: 'vm',
  template: require('../templates/help-link.html'),
  controller: function controller() {},
  scope: {
    version: '<',
    userAgent: '<',
    url: '<',
    documentFingerprint: '<',
    auth: '<',
    dateTime: '<'
  }
};

},{"../templates/help-link.html":146}],67:[function(require,module,exports){
'use strict';

/**
 * @ngdoc directive
 * @name helpPanel
 * @description Displays product version and environment info
 */
// @ngInject

module.exports = {
  controllerAs: 'vm',
  // @ngInject
  controller: ["$scope", "$window", "annotationUI", "serviceUrl", function controller($scope, $window, annotationUI, serviceUrl) {
    this.userAgent = $window.navigator.userAgent;
    this.version = '1.64.0'; // replaced by versionify
    this.dateTime = new Date();
    this.serviceUrl = serviceUrl;

    $scope.$watch(function () {
      return annotationUI.frames();
    }, function (frames) {
      if (frames.length === 0) {
        return;
      }
      this.url = frames[0].uri;
      this.documentFingerprint = frames[0].metadata.documentFingerprint;
    }.bind(this));
  }],
  template: require('../templates/help-panel.html'),
  bindings: {
    auth: '<',
    onClose: '&'
  }
};

},{"../templates/help-panel.html":147}],68:[function(require,module,exports){
'use strict';

HypothesisAppController.$inject = ["$document", "$location", "$rootScope", "$route", "$scope", "$window", "analytics", "annotationUI", "auth", "bridge", "drafts", "features", "flash", "frameSync", "groups", "serviceUrl", "session", "settings", "streamer"];
var scrollIntoView = require('scroll-into-view');

var events = require('../events');

var _require = require('../util/account-id'),
    parseAccountID = _require.parseAccountID;

var scopeTimeout = require('../util/scope-timeout');
var serviceConfig = require('../service-config');
var bridgeEvents = require('../../shared/bridge-events');

/**
 * Return the user's authentication status from their profile.
 *
 * @param {Profile} profile - The profile object from the API.
 */
function authStateFromProfile(profile) {
  if (profile.userid) {
    var parsed = parseAccountID(profile.userid);
    var displayName = parsed.username;
    if (profile.user_info && profile.user_info.display_name) {
      displayName = profile.user_info.display_name;
    }
    return {
      status: 'logged-in',
      displayName: displayName,
      userid: profile.userid,
      username: parsed.username,
      provider: parsed.provider
    };
  } else {
    return { status: 'logged-out' };
  }
}

// @ngInject
function HypothesisAppController($document, $location, $rootScope, $route, $scope, $window, analytics, annotationUI, auth, bridge, drafts, features, flash, frameSync, groups, serviceUrl, session, settings, streamer) {
  var self = this;

  // This stores information about the current user's authentication status.
  // When the controller instantiates we do not yet know if the user is
  // logged-in or not, so it has an initial status of 'unknown'. This can be
  // used by templates to show an intermediate or loading state.
  this.auth = { status: 'unknown' };

  // App dialogs
  this.shareDialog = { visible: false };
  this.helpPanel = { visible: false };

  // Check to see if we're in the sidebar, or on a standalone page such as
  // the stream page or an individual annotation page.
  this.isSidebar = $window.top !== $window;
  if (this.isSidebar) {
    frameSync.connect();
  }

  this.sortKey = function () {
    return annotationUI.getState().sortKey;
  };

  this.sortKeysAvailable = function () {
    return annotationUI.getState().sortKeysAvailable;
  };

  this.setSortKey = annotationUI.setSortKey;

  // Reload the view when the user switches accounts
  $scope.$on(events.USER_CHANGED, function (event, data) {
    self.auth = authStateFromProfile(data.profile);
  });

  session.load().then(function (profile) {
    self.auth = authStateFromProfile(profile);
  });

  /** Scroll to the view to the element matching the given selector */
  function scrollToView(selector) {
    // Add a timeout so that if the element has just been shown (eg. via ngIf)
    // it is added to the DOM before we try to locate and scroll to it.
    scopeTimeout($scope, function () {
      scrollIntoView($document[0].querySelector(selector));
    }, 0);
  }

  /**
   * Start the login flow. This will present the user with the login dialog.
   *
   * @return {Promise<void>} - A Promise that resolves when the login flow
   *   completes. For non-OAuth logins, always resolves immediately.
   */
  this.login = function () {
    if (serviceConfig(settings)) {
      // Let the host page handle the login request
      bridge.call(bridgeEvents.LOGIN_REQUESTED);
      return Promise.resolve();
    }

    return auth.login().then(function () {
      session.reload();
    }).catch(function (err) {
      flash.error(err.message);
    });
  };

  this.signUp = function () {
    analytics.track(analytics.events.SIGN_UP_REQUESTED);

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.SIGNUP_REQUESTED);
      return;
    }
    $window.open(serviceUrl('signup'));
  };

  // Display the dialog for sharing the current page
  this.share = function () {
    this.shareDialog.visible = true;
    scrollToView('share-dialog');
  };

  this.showHelpPanel = function () {
    var service = serviceConfig(settings) || {};
    if (service.onHelpRequestProvided) {
      // Let the host page handle the help request.
      bridge.call(bridgeEvents.HELP_REQUESTED);
      return;
    }

    this.helpPanel.visible = true;
  };

  // Prompt to discard any unsaved drafts.
  var promptToLogout = function promptToLogout() {
    // TODO - Replace this with a UI which doesn't look terrible.
    var text = '';
    if (drafts.count() === 1) {
      text = 'You have an unsaved annotation.\n' + 'Do you really want to discard this draft?';
    } else if (drafts.count() > 1) {
      text = 'You have ' + drafts.count() + ' unsaved annotations.\n' + 'Do you really want to discard these drafts?';
    }
    return drafts.count() === 0 || $window.confirm(text);
  };

  // Log the user out.
  this.logout = function () {
    if (!promptToLogout()) {
      return;
    }
    drafts.unsaved().forEach(function (draft) {
      $rootScope.$emit(events.ANNOTATION_DELETED, draft);
    });
    drafts.discard();

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.LOGOUT_REQUESTED);
      return;
    }

    session.logout();
  };

  this.search = {
    query: function query() {
      return annotationUI.getState().filterQuery;
    },
    update: function update(query) {
      annotationUI.setFilterQuery(query);
    }
  };

  this.countPendingUpdates = streamer.countPendingUpdates;
  this.applyPendingUpdates = streamer.applyPendingUpdates;
}

module.exports = {
  controller: HypothesisAppController,
  controllerAs: 'vm',
  template: require('../templates/hypothesis-app.html')
};

},{"../../shared/bridge-events":43,"../events":97,"../service-config":129,"../templates/hypothesis-app.html":148,"../util/account-id":171,"../util/scope-timeout":179,"scroll-into-view":35}],69:[function(require,module,exports){
'use strict';

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: ["serviceUrl", function controller(serviceUrl) {
    this.serviceUrl = serviceUrl;
  }],
  bindings: {
    /**
     * Called when the user clicks on the "Log in" text.
     */
    onLogin: '&'
  },
  template: require('../templates/loggedout-message.html')
};

},{"../templates/loggedout-message.html":149}],70:[function(require,module,exports){
'use strict';

var bridgeEvents = require('../../shared/bridge-events');

var _require = require('../util/account-id'),
    isThirdPartyUser = _require.isThirdPartyUser;

var serviceConfig = require('../service-config');

module.exports = {
  controllerAs: 'vm',

  //@ngInject
  controller: ["bridge", "serviceUrl", "settings", "$window", function controller(bridge, serviceUrl, settings, $window) {
    this.serviceUrl = serviceUrl;

    this.isThirdPartyUser = function () {
      return isThirdPartyUser(this.auth.userid, settings.authDomain);
    };

    this.shouldShowLogOutButton = function () {
      if (this.auth.status !== 'logged-in') {
        return false;
      }
      var service = serviceConfig(settings);
      if (service && !service.onLogoutRequestProvided) {
        return false;
      }
      return true;
    };

    this.shouldEnableProfileButton = function () {
      var service = serviceConfig(settings);
      if (service) {
        return service.onProfileRequestProvided;
      }
      return true;
    };

    this.showProfile = function () {
      if (this.isThirdPartyUser()) {
        bridge.call(bridgeEvents.PROFILE_REQUESTED);
        return;
      }
      $window.open(this.serviceUrl('user', { user: this.auth.username }));
    };
  }],

  bindings: {
    /**
     * An object representing the current authentication status.
     */
    auth: '<',
    /**
     * Called when the user clicks on the "About this version" text.
     */
    onShowHelpPanel: '&',
    /**
     * Called when the user clicks on the "Log in" text.
     */
    onLogin: '&',
    /**
     * Called when the user clicks on the "Sign Up" text.
     */
    onSignUp: '&',
    /**
     * Called when the user clicks on the "Log out" text.
     */
    onLogout: '&',
    /**
     * Whether or not to use the new design for the control.
     *
     * FIXME: should be removed when the old design is deprecated.
     */
    newStyle: '<'
  },
  template: require('../templates/login-control.html')
};

},{"../../shared/bridge-events":43,"../service-config":129,"../templates/login-control.html":150,"../util/account-id":171}],71:[function(require,module,exports){
'use strict';

MarkdownController.$inject = ["$element", "$sanitize", "$scope", "settings"];
var debounce = require('lodash.debounce');

var commands = require('../markdown-commands');
var mediaEmbedder = require('../media-embedder');
var renderMarkdown = require('../render-markdown');
var scopeTimeout = require('../util/scope-timeout');

// @ngInject
function MarkdownController($element, $sanitize, $scope, settings) {
  var input = $element[0].querySelector('.js-markdown-input');
  var output = $element[0].querySelector('.js-markdown-preview');

  var self = this;
  self.isThemeCustom = settings.theme === 'custom';

  /**
   * Transform the editor's input field with an editor command.
   */
  function updateState(newStateFn) {
    var newState = newStateFn({
      text: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd
    });

    input.value = newState.text;
    input.selectionStart = newState.selectionStart;
    input.selectionEnd = newState.selectionEnd;

    // The input field currently loses focus when the contents are
    // changed. This re-focuses the input field but really it should
    // happen automatically.
    input.focus();

    self.onEditText({ text: input.value });
  }

  function focusInput() {
    // When the visibility of the editor changes, focus it.
    // A timeout is used so that focus() is not called until
    // the visibility change has been applied (by adding or removing
    // the relevant CSS classes)
    scopeTimeout($scope, function () {
      input.focus();
    }, 0);
  }

  this.insertBold = function () {
    updateState(function (state) {
      return commands.toggleSpanStyle(state, '**', '**', 'Bold');
    });
  };

  this.insertItalic = function () {
    updateState(function (state) {
      return commands.toggleSpanStyle(state, '*', '*', 'Italic');
    });
  };

  this.insertMath = function () {
    updateState(function (state) {
      var before = state.text.slice(0, state.selectionStart);

      if (before.length === 0 || before.slice(-1) === '\n' || before.slice(-2) === '$$') {
        return commands.toggleSpanStyle(state, '$$', '$$', 'Insert LaTeX');
      } else {
        return commands.toggleSpanStyle(state, '\\(', '\\)', 'Insert LaTeX');
      }
    });
  };

  this.insertLink = function () {
    updateState(function (state) {
      return commands.convertSelectionToLink(state);
    });
  };

  this.insertIMG = function () {
    updateState(function (state) {
      return commands.convertSelectionToLink(state, commands.LinkType.IMAGE_LINK);
    });
  };

  this.insertList = function () {
    updateState(function (state) {
      return commands.toggleBlockStyle(state, '* ');
    });
  };

  this.insertNumList = function () {
    updateState(function (state) {
      return commands.toggleBlockStyle(state, '1. ');
    });
  };

  this.insertQuote = function () {
    updateState(function (state) {
      return commands.toggleBlockStyle(state, '> ');
    });
  };

  // Keyboard shortcuts for bold, italic, and link.
  $element.on('keydown', function (e) {
    var shortcuts = {
      66: self.insertBold,
      73: self.insertItalic,
      75: self.insertLink
    };

    var shortcut = shortcuts[e.keyCode];
    if (shortcut && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      shortcut();
    }
  });

  this.preview = false;
  this.togglePreview = function () {
    self.preview = !self.preview;
  };

  var handleInputChange = debounce(function () {
    $scope.$apply(function () {
      self.onEditText({ text: input.value });
    });
  }, 100);
  input.addEventListener('input', handleInputChange);

  // Re-render the markdown when the view needs updating.
  $scope.$watch('vm.text', function () {
    output.innerHTML = renderMarkdown(self.text || '', $sanitize);
    mediaEmbedder.replaceLinksWithEmbeds(output);
  });

  this.showEditor = function () {
    return !self.readOnly && !self.preview;
  };

  // Exit preview mode when leaving edit mode
  $scope.$watch('vm.readOnly', function () {
    self.preview = false;
  });

  $scope.$watch('vm.showEditor()', function (show) {
    if (show) {
      input.value = self.text || '';
      focusInput();
    }
  });
}

/**
 * @name markdown
 * @description
 * This directive controls both the rendering and display of markdown, as well as
 * the markdown editor.
 */
// @ngInject
module.exports = {
  controller: MarkdownController,
  controllerAs: 'vm',
  bindings: {
    customTextClass: '<?',
    readOnly: '<',
    text: '<?',
    onEditText: '&'
  },
  template: require('../templates/markdown.html')
};

},{"../markdown-commands":109,"../media-embedder":110,"../render-markdown":124,"../templates/markdown.html":151,"../util/scope-timeout":179,"lodash.debounce":6}],72:[function(require,module,exports){
'use strict';

ModerationBannerController.$inject = ["annotationUI", "flash", "store", "$filter"];
var annotationMetadata = require('../annotation-metadata');

// @ngInject
function ModerationBannerController(annotationUI, flash, store, $filter) {
  var self = this;

  this.flagCount = function () {
    return annotationMetadata.flagCount(self.annotation);
  };

  this.isHidden = function () {
    return self.annotation.hidden;
  };

  this.isHiddenOrFlagged = function () {
    var flagCount = self.flagCount();
    return flagCount !== null && (flagCount > 0 || self.isHidden());
  };

  this.isReply = function () {
    return annotationMetadata.isReply(self.annotation);
  };

  /**
   * Hide an annotation from non-moderator users.
   */
  this.hideAnnotation = function () {
    store.annotation.hide({ id: self.annotation.id }).then(function () {
      annotationUI.hideAnnotation(self.annotation.id);
    }).catch(function () {
      var msg = $filter('translate')('Failed to hide annotation');
      flash.error(msg);
    });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  this.unhideAnnotation = function () {
    store.annotation.unhide({ id: self.annotation.id }).then(function () {
      annotationUI.unhideAnnotation(self.annotation.id);
    }).catch(function () {
      var msg = $filter('translate')('Failed to unhide annotation');
      flash.error(msg);
    });
  };
}

/**
 * Banner shown above flagged annotations to allow moderators to hide/unhide the
 * annotation from other users.
 */

module.exports = {
  controller: ModerationBannerController,
  controllerAs: 'vm',
  bindings: {
    annotation: '<'
  },
  template: require('../templates/moderation-banner.html')
};

},{"../annotation-metadata":53,"../templates/moderation-banner.html":152}],73:[function(require,module,exports){
'use strict';

var events = require('../events');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: ["$rootScope", "annotationUI", function controller($rootScope, annotationUI) {
    this.onNewNoteBtnClick = function () {
      var topLevelFrame = annotationUI.frames().find(function (f) {
        return !f.id;
      });
      var annot = {
        target: [],
        uri: topLevelFrame.uri
      };

      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
    };
  }],
  bindings: {},
  template: require('../templates/new-note-btn.html')
};

},{"../events":97,"../templates/new-note-btn.html":153}],74:[function(require,module,exports){
'use strict';

/**
 * @description Displays a combined privacy/selection post button to post
 *              a new annotation
 */
// @ngInject

module.exports = {
  controller: ["settings", function controller(settings) {
    this.showDropdown = false;
    this.privateLabel = 'Only Me';
    this.isThemeCustom = settings.theme === 'custom';
    this.private = false;
    this.onSetPrivacy({ level: 'shared' });

    this.publishDestination = function () {
      return this.isShared ? this.group.name : this.privateLabel;
    };

    this.groupType = function () {
      return this.group.public ? 'public' : 'group';
    };

    this.setPrivacy = function (isPrivate) {
      var level = isPrivate ? 'private' : 'shared';
      this.onSetPrivacy({ level: level });
    };
  }],
  controllerAs: 'vm',
  bindings: {
    group: '<',
    canPost: '<',
    isShared: '<',
    onCancel: '&',
    onSave: '&',
    onSetPrivacy: '&'
  },
  template: require('../templates/publish-annotation-btn.html')
};

},{"../templates/publish-annotation-btn.html":154}],75:[function(require,module,exports){
'use strict';

// @ngInject

SearchInputController.$inject = ["$element", "$http", "$scope"];
function SearchInputController($element, $http, $scope) {
  var self = this;
  var button = $element.find('button');
  var input = $element.find('input')[0];
  var form = $element.find('form')[0];

  button.on('click', function () {
    input.focus();
  });

  $scope.$watch(function () {
    return $http.pendingRequests.length;
  }, function (count) {
    self.loading = count > 0;
  });

  form.onsubmit = function (e) {
    e.preventDefault();
    self.onSearch({ $query: input.value });
  };

  this.inputClasses = function () {
    return { 'is-expanded': self.alwaysExpanded || self.query };
  };

  this.$onChanges = function (changes) {
    if (changes.query) {
      input.value = changes.query.currentValue;
    }
  };
}

module.exports = {
  controller: SearchInputController,
  controllerAs: 'vm',
  bindings: {
    // Specifies whether the search input field should always be expanded,
    // regardless of whether the it is focused or has an active query.
    //
    // If false, it is only expanded when focused or when 'query' is non-empty
    alwaysExpanded: '<',
    query: '<',
    onSearch: '&'
  },
  template: require('../templates/search-input.html')
};

},{"../templates/search-input.html":155}],76:[function(require,module,exports){
'use strict';

var uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  controller: function controller() {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;
  },
  bindings: {
    filterActive: '<',
    filterMatchCount: '<',
    onClearSelection: '&',
    searchQuery: '<',
    selectedTab: '<',
    selectionCount: '<',
    totalAnnotations: '<',
    totalNotes: '<'
  },
  template: require('../templates/search-status-bar.html')
};

},{"../templates/search-status-bar.html":156,"../ui-constants":169}],77:[function(require,module,exports){
'use strict';

var sessionUtil = require('../util/session-util');
var uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: ["$element", "annotationUI", "features", "session", "settings", function controller($element, annotationUI, features, session, settings) {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;

    this.isThemeClean = settings.theme === 'clean';

    this.isThemeCustom = settings.theme === 'custom';

    this.enableExperimentalNewNoteButton = settings.enableExperimentalNewNoteButton;

    this.selectTab = function (type) {
      annotationUI.clearSelectedAnnotations();
      annotationUI.selectTab(type);
    };

    this.showAnnotationsUnavailableMessage = function () {
      return this.selectedTab === this.TAB_ANNOTATIONS && this.totalAnnotations === 0 && !this.isWaitingToAnchorAnnotations;
    };

    this.showNotesUnavailableMessage = function () {
      return this.selectedTab === this.TAB_NOTES && this.totalNotes === 0;
    };

    this.showSidebarTutorial = function () {
      return sessionUtil.shouldShowSidebarTutorial(session.state);
    };
  }],
  bindings: {
    isLoading: '<',
    isWaitingToAnchorAnnotations: '<',
    selectedTab: '<',
    totalAnnotations: '<',
    totalNotes: '<',
    totalOrphans: '<'
  },
  template: require('../templates/selection-tabs.html')
};

},{"../templates/selection-tabs.html":157,"../ui-constants":169,"../util/session-util":180}],78:[function(require,module,exports){
'use strict';

ShareDialogController.$inject = ["$scope", "$element", "analytics", "annotationUI"];
var VIA_PREFIX = 'https://via.hypothes.is/';

// @ngInject
function ShareDialogController($scope, $element, analytics, annotationUI) {
  var self = this;

  function updateViaLink(frames) {
    if (!frames.length) {
      self.viaPageLink = '';
      return;
    }

    // Check to see if we are on a via page. If so, we just return the URI.
    if (frames[0].uri.indexOf(VIA_PREFIX) === 0) {
      self.viaPageLink = frames[0].uri;
    } else {
      self.viaPageLink = VIA_PREFIX + frames[0].uri;
    }
  }

  var viaInput = $element[0].querySelector('.js-via');
  viaInput.focus();
  viaInput.select();

  $scope.$watch(function () {
    return annotationUI.frames();
  }, updateViaLink);

  $scope.onShareClick = function (target) {
    if (target) {
      analytics.track(analytics.events.DOCUMENT_SHARED, target);
    }
  };
}

module.exports = {
  controller: ShareDialogController,
  controllerAs: 'vm',
  bindings: {
    onClose: '&'
  },
  template: require('../templates/share-dialog.html')
};

},{"../templates/share-dialog.html":158}],79:[function(require,module,exports){
'use strict';

SidebarContentController.$inject = ["$scope", "analytics", "annotationUI", "annotationMapper", "drafts", "features", "frameSync", "groups", "rootThread", "settings", "streamer", "streamFilter", "store"];
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var SearchClient = require('../search-client');
var events = require('../events');
var isThirdPartyService = require('../util/is-third-party-service');
var getProperClassName = require('../../shared/util/get-proper-classname');
var memoize = require('../util/memoize');
var tabs = require('../tabs');
var uiConstants = require('../ui-constants');

function firstKey(object) {
  for (var k in object) {
    if (!object.hasOwnProperty(k)) {
      continue;
    }
    return k;
  }
  return null;
}

/**
 * Returns the group ID of the first annotation in `results` whose
 * ID is a key in `selection`.
 */
function groupIDFromSelection(selection, results) {
  var id = firstKey(selection);
  var annot = results.find(function (annot) {
    return annot.id === id;
  });
  if (!annot) {
    return null;
  }
  return annot.group;
}

// @ngInject
function SidebarContentController($scope, analytics, annotationUI, annotationMapper, drafts, features, frameSync, groups, rootThread, settings, streamer, streamFilter, store) {
  var self = this;

  function thread() {
    return rootThread.thread(annotationUI.getState());
  }

  var unsubscribeAnnotationUI = annotationUI.subscribe(function () {
    var state = annotationUI.getState();

    self.rootThread = thread();
    self.selectedTab = state.selectedTab;

    var counts = tabs.counts(state.annotations);

    Object.assign(self, {
      totalNotes: counts.notes,
      totalAnnotations: counts.annotations,
      totalOrphans: counts.orphans,
      waitingToAnchorAnnotations: counts.anchoring > 0
    });
  });

  $scope.$on('$destroy', unsubscribeAnnotationUI);

  function focusAnnotation(annotation) {
    var highlights = [];
    if (annotation) {
      highlights = [annotation.$tag];
    }
    // Manage highlighting/unhighlighting the text of the corresponding hovered feedback in the sidebar
    frameSync.focusAnnotations(highlights, annotation.user, this.auth.userid, 'hover');
  }

  function scrollToAnnotation(annotation) {
    if (!annotation) {
      return;
    }

    // Manage highlighting/unhighlighting the selected feedback in the sidebar
    var className = getProperClassName(annotation.user, this.auth.userid, 'card');
    document.getElementById(annotation.id).classList.toggle(className);

    // ** Clear all other feedback highlights **
    // See if there is already selected feedback in the sidebar. It has to be max one selected feedback in the case that we do not have the bucket bar!
    var allFeedbackOnThePage = document.querySelectorAll('.default__card-selected, .users__card-selected');
    allFeedbackOnThePage.forEach(function (card) {
      if (card.id !== annotation.id) {
        //  Remove the possible existing classes if the feedback is not the one selected
        document.getElementById(card.id).classList.remove('default__card-selected', 'users__card-selected');
      }
    });

    // Manage highlighting/unhighlighting the text of the corresponding selected feedback in the sidebar
    frameSync.scrollToAnnotation(annotation.$tag, annotation.user, this.auth.userid, 'text');
  }

  /**
   * Returns the Annotation object for the first annotation in the
   * selected annotation set. Note that 'first' refers to the order
   * of annotations passed to annotationUI when selecting annotations,
   * not the order in which they appear in the document.
   */
  function firstSelectedAnnotation() {
    if (annotationUI.getState().selectedAnnotationMap) {
      var id = Object.keys(annotationUI.getState().selectedAnnotationMap)[0];
      return annotationUI.getState().annotations.find(function (annot) {
        return annot.id === id;
      });
    } else {
      return null;
    }
  }

  var searchClients = [];

  function _resetAnnotations() {
    annotationMapper.unloadAnnotations(annotationUI.savedAnnotations());
  }

  function _loadAnnotationsFor(uris, group) {
    var searchClient = new SearchClient(store.search, {
      // If no group is specified, we are fetching annotations from
      // all groups in order to find out which group contains the selected
      // annotation, therefore we need to load all chunks before processing
      // the results
      incremental: !!group
    });
    searchClients.push(searchClient);
    searchClient.on('results', function (results) {
      if (annotationUI.hasSelectedAnnotations()) {
        // Focus the group containing the selected annotation and filter
        // annotations to those from this group
        var groupID = groupIDFromSelection(annotationUI.getState().selectedAnnotationMap, results);
        if (!groupID) {
          // If the selected annotation is not available, fall back to
          // loading annotations for the currently focused group
          groupID = groups.focused().id;
        }
        results = results.filter(function (result) {
          return result.group === groupID;
        });
        groups.focus(groupID);
      }

      if (results.length) {
        annotationMapper.loadAnnotations(results);
      }
    });
    searchClient.on('end', function () {
      // Remove client from list of active search clients.
      //
      // $evalAsync is required here because search results are emitted
      // asynchronously. A better solution would be that the loading state is
      // tracked as part of the app state.
      $scope.$evalAsync(function () {
        searchClients.splice(searchClients.indexOf(searchClient), 1);
      });

      annotationUI.frames().forEach(function (frame) {
        if (0 <= uris.indexOf(frame.uri)) {
          annotationUI.updateFrameAnnotationFetchStatus(frame.uri, true);
        }
      });
    });
    searchClient.get({ uri: uris, group: group });
  }

  function isLoading() {
    if (!annotationUI.frames().some(function (frame) {
      return frame.uri;
    })) {
      // The document's URL isn't known so the document must still be loading.
      return true;
    }

    if (searchClients.length > 0) {
      // We're still waiting for annotation search results from the API.
      return true;
    }

    return false;
  }

  /**
   * Load annotations for all URLs associated with `frames`.
   */
  function loadAnnotations() {
    _resetAnnotations();

    searchClients.forEach(function (client) {
      client.cancel();
    });

    // If there is no selection, load annotations only for the focused group.
    //
    // If there is a selection, we load annotations for all groups, find out
    // which group the first selected annotation is in and then filter the
    // results on the client by that group.
    //
    // In the common case where the total number of annotations on
    // a page that are visible to the user is not greater than
    // the batch size, this saves an extra roundtrip to the server
    // to fetch the selected annotation in order to determine which group
    // it is in before fetching the remaining annotations.
    var group = annotationUI.hasSelectedAnnotations() ? null : groups.focused().id;

    var searchUris = annotationUI.searchUris();
    if (searchUris.length > 0) {
      _loadAnnotationsFor(searchUris, group);

      streamFilter.resetFilter().addClause('/uri', 'one_of', searchUris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }
  }

  $scope.$on('sidebarOpened', function () {

    analytics.track(analytics.events.SIDEBAR_OPENED);

    streamer.connect();
  });

  // If the user is logged in, we connect nevertheless
  if (this.auth.status === 'logged-in') {
    streamer.connect();
  }

  $scope.$on(events.USER_CHANGED, function () {
    streamer.reconnect();
  });

  $scope.$on(events.ANNOTATIONS_SYNCED, function (event, tags) {
    // When a direct-linked annotation is successfully anchored in the page,
    // focus and scroll to it
    var selectedAnnot = firstSelectedAnnotation();
    if (!selectedAnnot) {
      return;
    }
    var matchesSelection = tags.some(function (tag) {
      return tag === selectedAnnot.$tag;
    });
    if (!matchesSelection) {
      return;
    }
    focusAnnotation(selectedAnnot);
    scrollToAnnotation(selectedAnnot);

    annotationUI.selectTab(tabs.tabForAnnotation(selectedAnnot));
  });

  // Re-fetch annotations when focused group, logged-in user or connected frames
  // change.
  $scope.$watch(function () {
    return [groups.focused().id, annotationUI.profile().userid].concat(_toConsumableArray(annotationUI.searchUris()));
  }, function (_ref, _ref2) {
    var _ref4 = _slicedToArray(_ref, 1),
        currentGroupId = _ref4[0];

    var _ref3 = _slicedToArray(_ref2, 1),
        prevGroupId = _ref3[0];

    if (currentGroupId !== prevGroupId) {
      // The focused group may be changed during loading annotations as a result
      // of switching to the group containing a direct-linked annotation.
      //
      // In that case, we don't want to trigger reloading annotations again.
      if (isLoading()) {
        return;
      }
      annotationUI.clearSelectedAnnotations();
    }

    loadAnnotations();
  }, true);

  this.setCollapsed = function (id, collapsed) {
    annotationUI.setCollapsed(id, collapsed);
  };

  this.forceVisible = function (thread) {
    annotationUI.setForceVisible(thread.id, true);
    if (thread.parent) {
      annotationUI.setCollapsed(thread.parent.id, false);
    }
  };

  this.focus = focusAnnotation;
  this.scrollTo = scrollToAnnotation;

  this.selectedAnnotationCount = function () {
    var selection = annotationUI.getState().selectedAnnotationMap;
    if (!selection) {
      return 0;
    }
    return Object.keys(selection).length;
  };

  this.selectedAnnotationUnavailable = function () {
    var selectedID = firstKey(annotationUI.getState().selectedAnnotationMap);
    return !isLoading() && !!selectedID && !annotationUI.annotationExists(selectedID);
  };

  this.shouldShowLoggedOutMessage = function () {
    // If user is not logged out, don't show CTA.
    if (self.auth.status !== 'logged-out') {
      return false;
    }

    // If user has not landed on a direct linked annotation
    // don't show the CTA.
    if (!settings.annotations) {
      return false;
    }

    // The CTA text and links are only applicable when using Hypothesis
    // accounts.
    if (isThirdPartyService(settings)) {
      return false;
    }

    // The user is logged out and has landed on a direct linked
    // annotation. If there is an annotation selection and that
    // selection is available to the user, show the CTA.
    var selectedID = firstKey(annotationUI.getState().selectedAnnotationMap);
    return !isLoading() && !!selectedID && annotationUI.annotationExists(selectedID);
  };

  this.isLoading = isLoading;

  var visibleCount = memoize(function (thread) {
    return thread.children.reduce(function (count, child) {
      return count + visibleCount(child);
    }, thread.visible ? 1 : 0);
  });

  this.visibleCount = function () {
    return visibleCount(thread());
  };

  this.topLevelThreadCount = function () {
    return thread().totalChildren;
  };

  this.clearSelection = function () {
    var selectedTab = annotationUI.getState().selectedTab;
    if (!annotationUI.getState().selectedTab || annotationUI.getState().selectedTab === uiConstants.TAB_ORPHANS) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }

    annotationUI.clearSelectedAnnotations();
    annotationUI.selectTab(selectedTab);
  };

  // Managing the class and the title of highlight button.
  this.visibility = 'h-icon-visibility-off';
  this.visibilityTitle = 'Show Highlights';

  this.disableSidebar = function () {
    frameSync.hideSidebar();
    this.visibility = 'h-icon-visibility-off';
    this.visibilityTitle = 'Show Highlights';
  };

  this.setVisibleHighlights = function () {
    frameSync.setVisibleHighlights();
    // Toggle
    if (this.visibility === 'h-icon-visibility-off') {
      this.visibility = 'h-icon-visibility';
      this.visibilityTitle = 'Hide Highlights';
    } else {
      this.visibility = 'h-icon-visibility-off';
      this.visibilityTitle = 'Show Highlights';
    }
  };
}

module.exports = {
  controller: SidebarContentController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
    search: '<'
  },
  template: require('../templates/sidebar-content.html')
};

},{"../../shared/util/get-proper-classname":50,"../events":97,"../search-client":127,"../tabs":135,"../templates/sidebar-content.html":159,"../ui-constants":169,"../util/is-third-party-service":175,"../util/memoize":176}],80:[function(require,module,exports){
'use strict';

SidebarTutorialController.$inject = ["session", "settings"];
var sessionUtil = require('../util/session-util');

// @ngInject
function SidebarTutorialController(session, settings) {
  this.isThemeClean = settings.theme === 'clean';

  this.showSidebarTutorial = function () {
    return sessionUtil.shouldShowSidebarTutorial(session.state);
  };

  this.dismiss = function () {
    session.dismissSidebarTutorial();
  };
}

/**
 * @name sidebarTutorial
 * @description Displays a short tutorial in the sidebar.
 */
// @ngInject
module.exports = {
  controller: SidebarTutorialController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/sidebar-tutorial.html')
};

},{"../templates/sidebar-tutorial.html":160,"../util/session-util":180}],81:[function(require,module,exports){
'use strict';

module.exports = {
  controllerAs: 'vm',
  controller: function controller() {},
  bindings: {
    /** The name of the currently selected sort key. */
    sortKey: '<',
    /** A list of possible keys that the user can opt to sort by. */
    sortKeysAvailable: '<',
    /** Called when the user changes the sort key. */
    onChangeSortKey: '&'
  },
  template: require('../templates/sort-dropdown.html')
};

},{"../templates/sort-dropdown.html":161}],82:[function(require,module,exports){
'use strict';

// @ngInject

StreamContentController.$inject = ["$scope", "$location", "$route", "$routeParams", "annotationMapper", "annotationUI", "queryParser", "rootThread", "searchFilter", "store", "streamFilter", "streamer"];
function StreamContentController($scope, $location, $route, $routeParams, annotationMapper, annotationUI, queryParser, rootThread, searchFilter, store, streamFilter, streamer) {
  var self = this;

  annotationUI.setAppIsSidebar(false);

  /** `offset` parameter for the next search API call. */
  var offset = 0;

  /** Load annotations fetched from the API into the app. */
  var load = function load(result) {
    offset += result.rows.length;
    annotationMapper.loadAnnotations(result.rows, result.replies);
  };

  /**
   * Fetch the next `limit` annotations starting from `offset` from the API.
   */
  var fetch = function fetch(limit) {
    var query = Object.assign({
      _separate_replies: true,
      offset: offset,
      limit: limit
    }, searchFilter.toObject($routeParams.q));

    store.search(query).then(load).catch(function (err) {
      console.error(err);
    });
  };

  // Re-do search when query changes
  var lastQuery = $routeParams.q;
  $scope.$on('$routeUpdate', function () {
    if ($routeParams.q !== lastQuery) {
      annotationUI.clearAnnotations();
      $route.reload();
    }
  });

  // Set up updates from real-time API.
  streamFilter.resetFilter().setMatchPolicyIncludeAll();

  var terms = searchFilter.generateFacetedFilter($routeParams.q);
  queryParser.populateFilter(streamFilter, terms);
  streamer.setConfig('filter', { filter: streamFilter.getFilter() });
  streamer.connect();

  // Perform the initial search
  fetch(20);

  this.setCollapsed = annotationUI.setCollapsed;
  this.forceVisible = function (id) {
    annotationUI.setForceVisible(id, true);
  };

  Object.assign(this.search, {
    query: function query() {
      return $routeParams.q || '';
    },
    update: function update(q) {
      $location.search({ q: q });
    }
  });

  annotationUI.subscribe(function () {
    self.rootThread = rootThread.thread(annotationUI.getState());
  });

  // Sort the stream so that the newest annotations are at the top
  annotationUI.setSortKey('Newest');

  this.loadMore = fetch;
}

module.exports = {
  controller: StreamContentController,
  controllerAs: 'vm',
  bindings: {
    search: '<'
  },
  template: require('../templates/stream-content.html')
};

},{"../templates/stream-content.html":162}],83:[function(require,module,exports){
'use strict';

/**
 * The <svg-icon> component renders SVG icons using inline <svg> tags,
 * enabling their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 */

// The list of supported icons

SvgIconController.$inject = ["$element"];
var icons = {
  refresh: require('../../images/icons/refresh.svg'),
  cursor: require('../../images/icons/cursor.svg')
};

// @ngInject
function SvgIconController($element) {
  if (!icons[this.name]) {
    throw new Error('Unknown icon: ' + this.name);
  }
  $element[0].innerHTML = icons[this.name];
}

module.exports = {
  controllerAs: 'vm',
  controller: SvgIconController,
  bindings: {
    /** The name of the icon to load. */
    name: '<'
  }
};

},{"../../images/icons/cursor.svg":41,"../../images/icons/refresh.svg":42}],84:[function(require,module,exports){
'use strict';

// @ngInject

TagEditorController.$inject = ["tags"];
function TagEditorController(tags) {
  this.onTagsChanged = function () {
    tags.store(this.tagList);

    var newTags = this.tagList.map(function (item) {
      return item.text;
    });
    this.onEditTags({ tags: newTags });
  };

  this.autocomplete = function (query) {
    return Promise.resolve(tags.filter(query));
  };

  this.$onChanges = function (changes) {
    if (changes.tags) {
      this.tagList = changes.tags.currentValue.map(function (tag) {
        return { text: tag };
      });
    }
  };
}

module.exports = {
  controller: TagEditorController,
  controllerAs: 'vm',
  bindings: {
    tags: '<',
    onEditTags: '&'
  },
  template: require('../templates/tag-editor.html')
};

},{"../templates/tag-editor.html":163}],85:[function(require,module,exports){
'use strict';

ThreadListController.$inject = ["$element", "$scope", "settings", "VirtualThreadList"];
var events = require('../events');
var metadata = require('../annotation-metadata');

/**
 * Component which displays a virtualized list of annotation threads.
 */

var scopeTimeout = require('../util/scope-timeout');

/**
 * Returns the height of the thread for an annotation if it exists in the view
 * or `null` otherwise.
 */
function getThreadHeight(id) {
  var threadElement = document.getElementById(id);
  if (!threadElement) {
    return null;
  }

  // Note: `getComputedStyle` may return `null` in Firefox if the iframe is
  // hidden. See https://bugzilla.mozilla.org/show_bug.cgi?id=548397
  var style = window.getComputedStyle(threadElement);
  if (!style) {
    return null;
  }

  // Get the height of the element inside the border-box, excluding
  // top and bottom margins.
  var elementHeight = threadElement.getBoundingClientRect().height;

  // Get the bottom margin of the element. style.margin{Side} will return
  // values of the form 'Npx', from which we extract 'N'.
  var marginHeight = parseFloat(style.marginTop) + parseFloat(style.marginBottom);

  return elementHeight + marginHeight;
}

var virtualThreadOptions = {
  // identify the thread types that need to be rendered
  // but not actually visible to the user
  invisibleThreadFilter: function invisibleThreadFilter(thread) {
    // new highlights should always get rendered so we don't
    // miss saving them via the render-save process
    return thread.annotation.$highlight && metadata.isNew(thread.annotation);
  }
};

// @ngInject
function ThreadListController($element, $scope, settings, VirtualThreadList) {
  // `visibleThreads` keeps track of the subset of all threads matching the
  // current filters which are in or near the viewport and the view then renders
  // only those threads, using placeholders above and below the visible threads
  // to reserve space for threads which are not actually rendered.
  var self = this;

  // `scrollRoot` is the `Element` to scroll when scrolling a given thread into
  // view.
  //
  // For now there is only one `<thread-list>` instance in the whole
  // application so we simply require the scroll root to be annotated with a
  // specific class. A more generic mechanism was removed due to issues in
  // Firefox. See https://github.com/hypothesis/client/issues/341
  this.scrollRoot = document.querySelector('.js-thread-list-scroll-root');

  this.isThemeClean = settings.theme === 'clean';

  var options = Object.assign({
    scrollRoot: this.scrollRoot
  }, virtualThreadOptions);

  var visibleThreads = new VirtualThreadList($scope, window, this.thread, options);
  visibleThreads.on('changed', function (state) {
    self.virtualThreadList = {
      visibleThreads: state.visibleThreads,
      invisibleThreads: state.invisibleThreads,
      offscreenUpperHeight: state.offscreenUpperHeight + 'px',
      offscreenLowerHeight: state.offscreenLowerHeight + 'px'
    };

    scopeTimeout($scope, function () {
      state.visibleThreads.forEach(function (thread) {
        var height = getThreadHeight(thread.id);
        if (!height) {
          return;
        }
        visibleThreads.setThreadHeight(thread.id, height);
      });
    }, 50);
  });

  /**
   * Return the vertical scroll offset for the document in order to position the
   * annotation thread with a given `id` or $tag at the top-left corner
   * of the view.
   */
  function scrollOffset(id) {
    var maxYOffset = self.scrollRoot.scrollHeight - self.scrollRoot.clientHeight;
    return Math.min(maxYOffset, visibleThreads.yOffsetOf(id));
  }

  /** Scroll the annotation with a given ID or $tag into view. */
  function scrollIntoView(id) {
    var estimatedYOffset = scrollOffset(id);
    self.scrollRoot.scrollTop = estimatedYOffset;

    // As a result of scrolling the sidebar, the target scroll offset for
    // annotation `id` might have changed as a result of:
    //
    // 1. Heights of some cards above `id` changing from an initial estimate to
    //    an actual measured height after the card is rendered.
    // 2. The height of the document changing as a result of any cards heights'
    //    changing. This may affect the scroll offset if the original target
    //    was near to the bottom of the list.
    //
    // So we wait briefly after the view is scrolled then check whether the
    // estimated Y offset changed and if so, trigger scrolling again.
    scopeTimeout($scope, function () {
      var newYOffset = scrollOffset(id);
      if (newYOffset !== estimatedYOffset) {
        scrollIntoView(id);
      }
    }, 200);
  }

  /**
  * Listen the SHOW_BUCKET_LIST event from crossframe call
  * every time the event happens, clear the existing highlights in the sidebar,
  * highlight the selected feedback in the sidebar and scroll the panel.
  */
  var lengthOfPreviousFeedbackList = 0;

  $scope.$on(events.SHOW_BUCKET_LIST, function (event, IDs) {
    // TODO: Figure out how to get to the first item (not last entered, the one that is on top of the paragraph) on the doc

    // Find the whole list of feedback
    var feedback_list = [];
    document.querySelectorAll('.thread-list__card').forEach(function (feedback) {
      feedback_list.push(feedback.id);
    });

    var otherFeedback = feedback_list.filter(function (item) {
      return !IDs.includes(item);
    });

    manageHighlights(IDs, otherFeedback);
    // scrollPanel(IDs[0]);
  });

  function manageHighlights(selectedFeedback, otherFeedback) {
    // find the elements that has selected and remove the thread class from the other ones

    var lengthOfCurrentFeedbackList = selectedFeedback.length;
    var lengthOfSelectedFeedback = document.querySelectorAll('.default__card-selected').length;
    otherFeedback.forEach(function (feedback) {
      document.getElementById(feedback).classList.remove('default__card-selected');
    });

    selectedFeedback.forEach(function (feedback) {
      if (lengthOfCurrentFeedbackList !== lengthOfPreviousFeedbackList) {
        document.getElementById(feedback).classList.add('default__card-selected');
      } else {
        if (lengthOfCurrentFeedbackList !== lengthOfSelectedFeedback) {
          document.getElementById(feedback).classList.add('default__card-selected');
        } else {
          document.getElementById(feedback).classList.toggle('default__card-selected');
        }
      }
    });

    lengthOfPreviousFeedbackList = lengthOfCurrentFeedbackList;
  }

  /** Scroll the panel to the position that the feedback with a given ID or $tag is on top */
  function scrollPanel(id) {

    //  Find how much it can be scrolled
    var maxScroll = self.scrollRoot.scrollHeight - self.scrollRoot.clientHeight;
    // Find how much the item is far from top
    var yOffsetOfID = visibleThreads.yOffsetOf(id);
    // Find the hight of the item
    var heightOfID = visibleThreads._height(id);

    if (yOffsetOfID > maxScroll + heightOfID || yOffsetOfID === maxScroll + heightOfID) {
      // Find how much space for scrolling you need
      var height = self.scrollRoot.clientHeight - visibleThreads._height(id);
      // create an empty div and append it to the mail thread
      var div = document.createElement('div');
      div.style.height = height.toString() + 'px';
      self.scrollRoot.appendChild(div);
      // Scroll
      self.scrollRoot.scrollTop = height;
      // Re-assign the max scrollable heigh
      self.maxScroll = self.maxScroll + height;
    } else {
      self.scrollRoot.scrollTop = yOffsetOfID;
    }
  }
  $scope.$on(events.BEFORE_ANNOTATION_CREATED, function (event, annotation) {
    if (annotation.$highlight || metadata.isReply(annotation)) {
      return;
    }
    self.onClearSelection();
    scrollIntoView(annotation.$tag);
  });

  this.$onChanges = function (changes) {
    if (changes.thread) {
      visibleThreads.setRootThread(changes.thread.currentValue);
    }
  };

  this.$onDestroy = function () {
    visibleThreads.detach();
  };
}

module.exports = {
  controller: ThreadListController,
  controllerAs: 'vm',
  bindings: {
    /** The root thread to be displayed by the thread list. */
    thread: '<',
    showDocumentInfo: '<',

    /**
     * Called when the user clicks a link to show an annotation that does not
     * match the current filter.
     */
    onForceVisible: '&',
    /** Called when the user focuses an annotation by hovering it. */
    onFocus: '&',
    /** Called when a user selects an annotation. */
    onSelect: '&',
    /** Called when a user toggles the expansion state of an annotation thread. */
    onChangeCollapsed: '&',
    /** Called to clear the current selection. */
    onClearSelection: '&'
  },
  template: require('../templates/thread-list.html')
};

},{"../annotation-metadata":53,"../events":97,"../templates/thread-list.html":164,"../util/scope-timeout":179}],86:[function(require,module,exports){
'use strict';

TimestampController.$inject = ["$scope", "time"];
var dateUtil = require('../date-util');

// @ngInject
function TimestampController($scope, time) {

  // A fuzzy, relative (eg. '6 days ago') format of the timestamp.
  this.relativeTimestamp = null;

  // A formatted version of the timestamp (eg. 'Tue 22nd Dec 2015, 16:00')
  this.absoluteTimestamp = '';

  var cancelTimestampRefresh;
  var self = this;

  function updateTimestamp() {
    self.relativeTimestamp = time.toFuzzyString(self.timestamp);
    self.absoluteTimestamp = dateUtil.format(new Date(self.timestamp));

    if (self.timestamp) {
      if (cancelTimestampRefresh) {
        cancelTimestampRefresh();
      }
      cancelTimestampRefresh = time.decayingInterval(self.timestamp, function () {
        updateTimestamp();
        $scope.$digest();
      });
    }
  }

  this.$onChanges = function (changes) {
    if (changes.timestamp) {
      updateTimestamp();
    }
  };

  this.$onDestroy = function () {
    if (cancelTimestampRefresh) {
      cancelTimestampRefresh();
    }
  };
}

module.exports = {
  controller: TimestampController,
  controllerAs: 'vm',
  bindings: {
    className: '<',
    href: '<',
    timestamp: '<'
  },
  template: require('../templates/timestamp.html')
};

},{"../date-util":89,"../templates/timestamp.html":165}],87:[function(require,module,exports){
'use strict';

var isThirdPartyService = require('../util/is-third-party-service');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: ["settings", function controller(settings) {
    if (settings.theme) {
      this.isThemeClean = settings.theme === 'clean';
      this.isThemeCustom = settings.theme === 'custom';
    } else {
      this.isThemeClean = false;
      this.isThemeCustom = false;
    }

    this.showSharePageButton = function () {
      return !isThirdPartyService(settings);
    };
  }],
  bindings: {
    auth: '<',
    isSidebar: '<',
    onShowHelpPanel: '&',
    onLogin: '&',
    onLogout: '&',
    onSharePage: '&',
    onSignUp: '&',
    searchController: '<',
    sortKey: '<',
    sortKeysAvailable: '<',
    onChangeSortKey: '&',
    pendingUpdateCount: '<',
    onApplyPendingUpdates: '&'
  },
  template: require('../templates/top-bar.html')
};

},{"../templates/top-bar.html":166,"../util/is-third-party-service":175}],88:[function(require,module,exports){
'use strict';

/**
 * Begin responding to JSON-RPC requests from frames on other origins.
 *
 * Register a window.postMessage() event listener that receives and responds to
 * JSON-RPC requests sent by frames on other origins using postMessage() as the
 * transport layer.
 *
 * Only frames whose origin is in the rpcAllowedOrigins config setting will be
 * responded to.
 *
 * This is a very partial implementation of a JSON-RPC 2.0 server:
 *
 * http://www.jsonrpc.org/specification
 *
 * The only part that we support so far is receiving JSON-RPC 2.0 requests (not
 * notifications) without any parameters and sending back a successful
 * response. Notifications (JSON-RPC calls that don't require a response),
 * method parameters, and error responses are not yet supported.
 *
 */
// @ngInject

start.$inject = ["annotationUI", "settings", "$window"];
function start(annotationUI, settings, $window) {
  $window.addEventListener('message', function receiveMessage(event) {
    var allowedOrigins = settings.rpcAllowedOrigins || [];

    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    // The entire JSON-RPC request object is contained in the postMessage()
    // data param.
    var jsonRpcRequest = event.data;

    event.source.postMessage(jsonRpcResponse(jsonRpcRequest), event.origin);
  });

  /** Return a JSON-RPC response to the given JSON-RPC request object. */
  function jsonRpcResponse(request) {
    // The set of methods that clients can call.
    var methods = {
      'searchUris': annotationUI.searchUris
    };

    var method = methods[request.method];

    var response = {
      'jsonrpc': '2.0',
      'id': request.id
    };

    if (method) {
      response.result = method();
    } else {
      response.error = {
        'code': -32601,
        'message': 'Method not found'
      };
    }

    return response;
  }
}

module.exports = {
  server: {
    start: start
  }
};

},{}],89:[function(require,module,exports){
'use strict';

// cached date formatting instance.
// See https://github.com/hypothesis/h/issues/2820#issuecomment-166285361

var formatter;

/**
 * Returns a standard human-readable representation
 * of a date and time.
 */
function format(date) {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return formatter.format(date);
  } else {
    // IE < 11, Safari <= 9.0.
    // In English, this generates the string most similar to
    // the toLocaleDateString() result above.
    return date.toDateString() + ' ' + date.toLocaleTimeString();
  }
}

module.exports = {
  format: format
};

},{}],90:[function(require,module,exports){
'use strict';

/** An attribute directive that focuses an <input> when it's linked by Angular.
 *
 * The HTML5 autofocus attribute automatically puts the keyboard focus in an
 * <input> on page load. But this doesn't work for <input>s that are
 * rendered by JavaScript/Angular after page load, for example an <input> that
 * is shown/hidden by JavaScript when an ng-if condition becomes true.
 *
 * To automatically put the keyboard focus on such an input when it's linked by
 * Angular, attach this directive to it as an attribute:
 *
 *   <input ng-if="..." h-autofocus>
 *
*/

module.exports = function () {
  return {
    restrict: 'A',
    link: function link($scope, $element) {
      $element[0].focus();
    }
  };
};

},{}],91:[function(require,module,exports){
'use strict';

/**
 * The BrandingDirective brings theming configuration to our sidebar
 * by allowing the branding hypothesis settings to be reflected on items
 * that use this directive with the corresponding branding value.
 *
 * How to use:
 *   <element h-branding="supportedProp1, supportedProp2">
 *
 * Use `h-branding` to trigger this directive. Inside the attribute value,
 * add a comma separated list of what branding properties should be applied.
 * The attribute values match what the integrator would specify. For example,
 * if "superSpecialTextColor" is supported, the integrator could specify
 * `superSpecialTextColor: 'blue'` in the branding settings. Then any element that
 * included `h-branding="superSpecialTextColor"` would have blue placed on the
 * text's color.
 *
 * See below for the supported properties.
 */

// @ngInject

BrandingDirective.$inject = ["settings"];
function BrandingDirective(settings) {

  var _hasBranding = !!settings.branding;

  // This is the list of supported property declarations
  // we support. The key is the name and how it should be reflected in the
  // settings by the integrator while the value (in the whitelist) is
  // the type of .style property being set. The types are pretty simple for now
  // and are a one-to-one mapping between the branding type and style property.
  var _supportedPropSettings = {
    accentColor: 'color',
    appBackgroundColor: 'backgroundColor',
    ctaBackgroundColor: 'backgroundColor',
    ctaTextColor: 'color',
    selectionFontFamily: 'fontFamily',
    annotationFontFamily: 'fontFamily'
  };

  // filter all attribute values down to the supported
  // branding properties
  var _getValidBrandingAttribute = function _getValidBrandingAttribute(attrString) {
    return attrString.split(',').map(function (attr) {
      return attr.trim();
    }).filter(function filterAgainstWhitelist(attr) {
      return attr in _supportedPropSettings;
    });
  };

  return {
    restrict: 'A',
    link: function link(scope, $elem, attrs) {
      if (_hasBranding) {
        _getValidBrandingAttribute(attrs.hBranding).forEach(function (attr) {
          var propVal = settings.branding[attr];
          if (propVal) {
            // the _supportedPropSettings holds the .style property name
            // that is being set
            $elem[0].style[_supportedPropSettings[attr]] = propVal;
          }
        });
      }
    }
  };
}

module.exports = BrandingDirective;

},{}],92:[function(require,module,exports){
'use strict';

/**
 * Install an event handler on an element.
 *
 * The event handler follows the same behavior as the ng-<event name>
 * directives that Angular includes. This means:
 *
 *  - The handler function is passed an object with an $event property
 *  - The handler function is executed in the context of `$scope.$apply()`
 *
 * @param {Element} element
 * @param {Array<string>} events
 * @param {Function} handler
 */

function addEventHandler($scope, element, events, handler) {
  var callback = function callback(event) {
    $scope.$apply(function () {
      handler($scope, { $event: event });
    });
  };
  events.forEach(function (name) {
    element.addEventListener(name, callback);
  });
}

/**
 * A directive which adds an event handler for mouse press or touch to
 * a directive. This is similar to `ng-click` etc. but reacts either on
 * mouse press OR touch.
 */
// @ngInject
module.exports = function ($parse) {
  return {
    restrict: 'A',
    link: function link($scope, $element, $attrs) {
      var fn = $parse($attrs.hOnTouch, null /* interceptor */);
      addEventHandler($scope, $element[0], ['click', 'mousedown', 'touchstart'], fn);
    }
  };
};
module.exports.$inject = ["$parse"];

},{}],93:[function(require,module,exports){
'use strict';

var theTooltip;

/**
 * A custom tooltip similar to the one used in Google Docs which appears
 * instantly when activated on a target element.
 *
 * The tooltip is displayed and hidden by setting its target element.
 *
 *  var tooltip = new Tooltip(document.body);
 *  tooltip.setState({target: aWidget}); // Show tooltip
 *  tooltip.setState({target: null}); // Hide tooltip
 *
 * The tooltip's label is derived from the target element's 'aria-label'
 * attribute.
 *
 * @param {Element} rootElement - The container for the tooltip.
 */
function Tooltip(rootElement) {
  this.setState = function (state) {
    this.state = Object.freeze(Object.assign({}, this.state, state));
    this.render();
  };

  this.render = function () {
    var TOOLTIP_ARROW_HEIGHT = 7;

    if (!this.state.target) {
      this._el.style.visibility = 'hidden';
      return;
    }

    var target = this.state.target;
    var label = target.getAttribute('aria-label');
    this._labelEl.textContent = label;

    var tooltipRect = this._el.getBoundingClientRect();

    var targetRect = target.getBoundingClientRect();
    var top;

    if (this.state.direction === 'up') {
      top = targetRect.bottom + TOOLTIP_ARROW_HEIGHT;
    } else {
      top = targetRect.top - tooltipRect.height - TOOLTIP_ARROW_HEIGHT;
    }
    var left = targetRect.right - tooltipRect.width;

    this._el.classList.toggle('tooltip--up', this.state.direction === 'up');
    this._el.classList.toggle('tooltip--down', this.state.direction === 'down');

    Object.assign(this._el.style, {
      visibility: '',
      top: top + 'px',
      left: left + 'px'
    });
  };

  this._el = rootElement.ownerDocument.createElement('div');
  this._el.innerHTML = '<span class="tooltip-label js-tooltip-label"></span>';
  this._el.className = 'tooltip';

  rootElement.appendChild(this._el);
  this._labelEl = this._el.querySelector('.js-tooltip-label');

  this.setState({
    direction: 'down'
  });
}

/**
 * Attribute directive which displays a custom tooltip when hovering the
 * associated element.
 *
 * The associated element should use the `aria-label` attribute to specify
 * the tooltip instead of the `title` attribute, which would trigger the
 * display of the browser's native tooltip.
 *
 * Example: '<button aria-label="Tooltip label" h-tooltip></button>'
 */
module.exports = function () {
  if (!theTooltip) {
    theTooltip = new Tooltip(document.body);
  }

  return {
    restrict: 'A',
    link: function link($scope, $element) {
      var el = $element[0];

      el.addEventListener('mouseover', function () {
        var direction = el.getAttribute('tooltip-direction') || 'down';
        theTooltip.setState({
          direction: direction,
          target: el
        });
      });

      el.addEventListener('mouseout', function () {
        theTooltip.setState({ target: null });
      });

      // Hide the tooltip if the element is removed whilst the tooltip is active
      $scope.$on('$destroy', function () {
        if (theTooltip.state.target === el) {
          theTooltip.setState({ target: null });
        }
      });
    }
  };
};

},{}],94:[function(require,module,exports){
'use strict';

module.exports = ['$animate', function ($animate) {
  return {
    link: function link(scope, elem) {
      // ngAnimate conflicts with the spinners own CSS
      $animate.enabled(false, elem);
    },
    restrict: 'C',
    template: '<span><span></span></span>'
  };
}];

},{}],95:[function(require,module,exports){
'use strict';

module.exports = function () {
  return {
    link: function link(scope, elem, attr) {
      var active = true;
      var html = elem.prop('ownerDocument').documentElement;
      var view = elem.prop('ownerDocument').defaultView;

      function onScroll() {
        var clientHeight = html.clientHeight;
        var scrollHeight = html.scrollHeight;
        if (view.scrollY + clientHeight >= scrollHeight - clientHeight) {
          if (active) {
            active = false;
            scope.$apply(attr.windowScroll);
          }
        } else {
          active = true;
        }
      }

      view.addEventListener('scroll', onScroll, false);

      scope.$on('$destroy', function () {
        view.removeEventListener('scroll', onScroll);
      });
    }
  };
};

},{}],96:[function(require,module,exports){
'use strict';

/**
 * Return true if a given `draft` is empty and can be discarded without losing
 * any user input
 */

function isEmpty(draft) {
  if (!draft) {
    return true;
  }
  return !draft.text && draft.tags.length === 0;
}

/**
 * The drafts service provides temporary storage for unsaved edits to new or
 * existing annotations.
 *
 * A draft consists of:
 *
 * 1. `model` which is the original annotation domain model object which the
 *    draft is associated with. Domain model objects are never returned from
 *    the drafts service, they're only used to identify the correct draft to
 *    return.
 *
 * 2. `isPrivate` (boolean), `tags` (array of objects) and `text` (string)
 *    which are the user's draft changes to the annotation. These are returned
 *    from the drafts service by `drafts.get()`.
 *
 */
function DraftStore() {
  this._drafts = [];

  /**
   * Returns true if 'draft' is a draft for a given
   * annotation.
   *
   * Annotations are matched by ID or local tag.
   */
  function match(draft, model) {
    return draft.model.$tag && model.$tag === draft.model.$tag || draft.model.id && model.id === draft.model.id;
  }

  /**
   * Returns the number of drafts - both unsaved new annotations, and unsaved
   * edits to saved annotations - currently stored.
   */
  this.count = function count() {
    return this._drafts.length;
  };

  /**
   * Returns a list of local tags of new annotations for which unsaved drafts
   * exist.
   *
   * @return {Array<{$tag: string}>}
   */
  this.unsaved = function unsaved() {
    return this._drafts.filter(function (draft) {
      return !draft.model.id;
    }).map(function (draft) {
      return draft.model;
    });
  };

  /** Retrieve the draft changes for an annotation. */
  this.get = function get(model) {
    for (var i = 0; i < this._drafts.length; i++) {
      var draft = this._drafts[i];
      if (match(draft, model)) {
        return {
          isPrivate: draft.isPrivate,
          tags: draft.tags,
          text: draft.text
        };
      }
    }
    return null;
  };

  /**
   * Returns the draft changes for an annotation, or null if no draft exists
   * or the draft is empty.
   */
  this.getIfNotEmpty = function (model) {
    var draft = this.get(model);
    return isEmpty(draft) ? null : draft;
  };

  /**
   * Update the draft version for a given annotation, replacing any
   * existing draft.
   */
  this.update = function update(model, changes) {
    var newDraft = {
      model: { id: model.id, $tag: model.$tag },
      isPrivate: changes.isPrivate,
      tags: changes.tags,
      text: changes.text
    };
    this.remove(model);
    this._drafts.push(newDraft);
  };

  /** Remove the draft version of an annotation. */
  this.remove = function remove(model) {
    this._drafts = this._drafts.filter(function (draft) {
      return !match(draft, model);
    });
  };

  /** Remove all drafts. */
  this.discard = function discard() {
    this._drafts = [];
  };
}

module.exports = function () {
  return new DraftStore();
};

},{}],97:[function(require,module,exports){
'use strict';

/**
 * This module defines the set of global events that are dispatched
 * on $rootScope
 */

module.exports = {

  // Internal state changes
  FRAME_CONNECTED: 'frameConnected',

  // Session state changes

  /** The list of groups changed */
  GROUPS_CHANGED: 'groupsChanged',
  /** The logged-in user changed */
  USER_CHANGED: 'userChanged',
  /**
   * API tokens were fetched and saved to local storage by another client
   * instance.
   */
  OAUTH_TOKENS_CHANGED: 'oauthTokensChanged',

  // UI state changes

  /** The currently selected group changed */
  GROUP_FOCUSED: 'groupFocused',

  // Annotation events

  /** A new annotation has been created locally. */
  BEFORE_ANNOTATION_CREATED: 'beforeAnnotationCreated',

  /** Annotations were anchored in a connected document. */
  ANNOTATIONS_SYNCED: 'sync',

  /** An annotation was created on the server and assigned an ID. */
  ANNOTATION_CREATED: 'annotationCreated',

  /** An annotation was either deleted or unloaded. */
  ANNOTATION_DELETED: 'annotationDeleted',

  /** An annotation was flagged. */
  ANNOTATION_FLAGGED: 'annotationFlagged',

  /** An annotation has been updated. */
  ANNOTATION_UPDATED: 'annotationUpdated',

  /** A set of annotations were loaded from the server. */
  ANNOTATIONS_LOADED: 'annotationsLoaded',

  /** An annotation is unloaded. */
  ANNOTATIONS_UNLOADED: 'annotationsUnloaded'
};

},{}],98:[function(require,module,exports){
/**
 * Provides access to feature flag states for the current
 * Hypothesis user.
 *
 * This service is a thin wrapper around the feature flag data in
 * the session state.
 *
 * Users of this service should assume that the value of any given flag can
 * change at any time and should write code accordingly. Feature flags should
 * not be cached, and should not be interrogated only at setup time.
 */
'use strict';

features.$inject = ["$log", "$rootScope", "bridge", "session"];
var events = require('./events');
var bridgeEvents = require('../shared/bridge-events');

// @ngInject
function features($log, $rootScope, bridge, session) {

  var _sendFeatureFlags = function _sendFeatureFlags() {
    var userFeatures = session.state.features;
    bridge.call(bridgeEvents.FEATURE_FLAGS_UPDATED, userFeatures || {});
  };

  // user changed is currently called when we initially load
  // the sidebar and when the user actually logs out/in.
  $rootScope.$on(events.USER_CHANGED, _sendFeatureFlags);

  // send on frame connected as well because the user_changed event
  // alone might run before the frames ever connected. This will
  // provide us the follow up to make sure that the frames get the flags
  $rootScope.$on(events.FRAME_CONNECTED, _sendFeatureFlags);

  /**
   * Returns true if the flag with the given name is enabled for the current
   * user.
   *
   * Returns false if session data has not been fetched for the current
   * user yet or if the feature flag name is unknown.
   */
  function flagEnabled(flag) {
    // trigger a refresh of session data, if it has not been
    // refetched within a cache timeout managed by the session service
    // (see CACHE_TTL in session.js)
    session.load();

    if (!session.state.features) {
      // features data has not yet been fetched
      return false;
    }

    var features = session.state.features;
    if (!(flag in features)) {
      $log.warn('looked up unknown feature', flag);
      return false;
    }
    return features[flag];
  }

  return {
    flagEnabled: flagEnabled
  };
}

module.exports = features;

},{"../shared/bridge-events":43,"./events":97}],99:[function(require,module,exports){
'use strict';

/**
 * URL encode a string, dealing appropriately with null values.
 */

function encode(str) {
  if (str) {
    return window.encodeURIComponent(str);
  }
  return '';
}

module.exports = {
  encode: encode
};

},{}],100:[function(require,module,exports){
'use strict';

/**
 * A service for displaying "flash" notification messages.
 */

// @ngInject

flash.$inject = ["toastr"];
function flash(toastr) {
  return {
    info: toastr.info.bind(toastr),
    success: toastr.success.bind(toastr),
    warning: toastr.warning.bind(toastr),
    error: toastr.error.bind(toastr)
  };
}

module.exports = flash;

},{}],101:[function(require,module,exports){
'use strict';

FrameSync.$inject = ["$rootScope", "$window", "Discovery", "annotationUI", "bridge"];
var debounce = require('lodash.debounce');

var events = require('./events');
var bridgeEvents = require('../shared/bridge-events');
var metadata = require('./annotation-metadata');
var uiConstants = require('./ui-constants');

/**
 * @typedef FrameInfo
 * @property {string} uri - Current primary URI of the document being displayed
 * @property {string[]} searchUris - List of URIs that should be passed to the
 *           search API when searching for annotations on this document.
 * @property {string} documentFingerprint - Fingerprint of the document, used
 *                    for PDFs
 */

/**
 * Return a minimal representation of an annotation that can be sent from the
 * sidebar app to a connected frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 */
function formatAnnot(ann) {
  return {
    tag: ann.$tag,
    msg: {
      document: ann.document,
      target: ann.target,
      uri: ann.uri
    }
  };
}

/**
 * This service runs in the sidebar and is responsible for keeping the set of
 * annotations displayed in connected frames in sync with the set shown in the
 * sidebar.
 */
// @ngInject
function FrameSync($rootScope, $window, Discovery, annotationUI, bridge) {

  // Set of tags of annotations that are currently loaded into the frame
  var inFrame = new Set();

  /**
   * Watch for changes to the set of annotations displayed in the sidebar and
   * notify connected frames about new/updated/deleted annotations.
   */
  function setupSyncToFrame() {
    // List of loaded annotations in previous state
    var prevAnnotations = [];
    var prevFrames = [];
    var prevPublicAnns = 0;

    annotationUI.subscribe(function () {
      var state = annotationUI.getState();
      if (state.annotations === prevAnnotations && state.frames === prevFrames) {
        return;
      }

      var publicAnns = 0;
      var inSidebar = new Set();
      var added = [];

      state.annotations.forEach(function (annot) {
        if (metadata.isReply(annot)) {
          // The frame does not need to know about replies
          return;
        }

        if (metadata.isPublic(annot)) {
          ++publicAnns;
        }

        inSidebar.add(annot.$tag);
        if (!inFrame.has(annot.$tag)) {
          added.push(annot);
        }
      });
      var deleted = prevAnnotations.filter(function (annot) {
        return !inSidebar.has(annot.$tag);
      });
      prevAnnotations = state.annotations;
      prevFrames = state.frames;

      // We currently only handle adding and removing annotations from the frame
      // when they are added or removed in the sidebar, but not re-anchoring
      // annotations if their selectors are updated.
      if (added.length > 0) {
        bridge.call('loadAnnotations', added.map(formatAnnot));
        added.forEach(function (annot) {
          inFrame.add(annot.$tag);
        });
      }
      deleted.forEach(function (annot) {
        bridge.call('deleteAnnotation', formatAnnot(annot));
        inFrame.delete(annot.$tag);
      });

      var frames = annotationUI.frames();
      if (frames.length > 0) {
        if (frames.every(function (frame) {
          return frame.isAnnotationFetchComplete;
        })) {
          if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
            bridge.call(bridgeEvents.PUBLIC_ANNOTATION_COUNT_CHANGED, publicAnns);
            prevPublicAnns = publicAnns;
          }
        }
      }
    });
  }

  /**
   * Listen for messages coming in from connected frames and add new annotations
   * to the sidebar.
   */
  function setupSyncFromFrame() {
    // A new annotation, note or highlight was created in the frame
    bridge.on('beforeCreateAnnotation', function (event) {
      inFrame.add(event.tag);
      var annot = Object.assign({}, event.msg, { $tag: event.tag });
      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
    });

    bridge.on('destroyFrame', destroyFrame.bind(this));

    // Map of annotation tag to anchoring status
    // ('anchored'|'orphan'|'timeout').
    //
    // Updates are coalesced to reduce the overhead from processing
    // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.
    var anchoringStatusUpdates = {};
    var scheduleAnchoringStatusUpdate = debounce(function () {
      annotationUI.updateAnchorStatus(anchoringStatusUpdates);
      $rootScope.$broadcast(events.ANNOTATIONS_SYNCED, Object.keys(anchoringStatusUpdates));
      anchoringStatusUpdates = {};
    }, 10);

    // Anchoring an annotation in the frame completed
    bridge.on('sync', function (events_) {
      events_.forEach(function (event) {
        inFrame.add(event.tag);
        anchoringStatusUpdates[event.tag] = event.msg.$orphan ? 'orphan' : 'anchored';
        scheduleAnchoringStatusUpdate();
      });
    });

    bridge.on('showAnnotations', function (tags) {
      annotationUI.selectAnnotations(annotationUI.findIDsForTags(tags));
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
    });

    bridge.on('showBucketList', function (tags) {
      // highlight the annotations on the document
      //bridge.call('showBucketList', tags);
      // scroll the panel
      $rootScope.$broadcast(events.SHOW_BUCKET_LIST, annotationUI.findIDsForTags(tags));
    });

    bridge.on('focusAnnotations', function (tags) {
      annotationUI.focusAnnotations(tags || []);
    });

    bridge.on('toggleAnnotationSelection', function (tags) {
      annotationUI.toggleSelectedAnnotations(annotationUI.findIDsForTags(tags));
    });

    bridge.on('sidebarOpened', function () {
      $rootScope.$broadcast('sidebarOpened');
    });

    // These invoke the matching methods by name on the Guests
    bridge.on('showSidebar', function () {
      bridge.call('showSidebar');
    });
    // Currently we do not listen any hideSidebar or setVisibleHighlights calls in DDF.
    bridge.on('hideSidebar', function () {
      bridge.call('hideSidebar');
    });
    bridge.on('setVisibleHighlights', function (state) {
      bridge.call('setVisibleHighlights', state);
    });
  }

  /**
   * Query the Hypothesis annotation client in a frame for the URL and metadata
   * of the document that is currently loaded and add the result to the set of
   * connected frames.
   */
  function addFrame(channel) {
    channel.call('getDocumentInfo', function (err, info) {
      if (err) {
        channel.destroy();
        return;
      }

      $rootScope.$broadcast(events.FRAME_CONNECTED);

      annotationUI.connectFrame({
        id: info.frameIdentifier,
        metadata: info.metadata,
        uri: info.uri
      });
    });
  }

  function destroyFrame(frameIdentifier) {
    var frames = annotationUI.frames();
    var frameToDestroy = frames.find(function (frame) {
      return frame.id === frameIdentifier;
    });
    if (frameToDestroy) {
      annotationUI.destroyFrame(frameToDestroy);
    }
  }

  /**
   * Find and connect to Hypothesis clients in the current window.
   */
  this.connect = function () {
    var discovery = new Discovery(window, { server: true });
    discovery.startDiscovery(bridge.createChannel.bind(bridge));
    bridge.onConnect(addFrame);

    setupSyncToFrame();
    setupSyncFromFrame();
  };

  /**
   * Focus annotations with the given tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags
   */
  this.focusAnnotations = function (tags, feedback_user, user_id, type) {
    bridge.call('focusAnnotations', tags, feedback_user, user_id, type);
  };

  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  this.scrollToAnnotation = function (tag, feedback_user, user_id, type) {
    bridge.call('scrollToAnnotation', tag, feedback_user, user_id, type);
  };

  this.hideSidebar = function () {
    bridge.call('hideSidebar');
  };

  this.setVisibleHighlights = function () {
    bridge.call('setVisibleHighlights');
  };
}

module.exports = {
  default: FrameSync,
  formatAnnot: formatAnnot
};

},{"../shared/bridge-events":43,"./annotation-metadata":53,"./events":97,"./ui-constants":169,"lodash.debounce":6}],102:[function(require,module,exports){
'use strict';

var loaded = false;

module.exports = function (trackingId) {

  // small measure to make we do not accidentally
  // load the analytics scripts more than once
  if (loaded) {
    return;
  }

  loaded = true;

  /* eslint-disable */

  // Google Analytics snippet to load the analytics script
  (function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;i[r] = i[r] || function () {
      (i[r].q = i[r].q || []).push(arguments);
    }, i[r].l = 1 * new Date();a = s.createElement(o), m = s.getElementsByTagName(o)[0];a.async = 1;a.src = g;m.parentNode.insertBefore(a, m);
  })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

  ga('create', trackingId, 'auto');

  // overrides helper that requires http or https protocols.
  // obvious issue when it comes to extensions with protocols
  // like "chrome-extension://" but isn't a huge need for us
  // anywhere else as well.
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/tasks#disabling
  ga('set', 'checkProtocolTask', null);

  /* eslint-enable */
};

},{}],103:[function(require,module,exports){
'use strict';

var serviceConfig = require('./service-config');

/**
 * Function that returns apiUrl from the settings object.
 *
 * @param {object} settings - The settings object
 * @returns {string} The apiUrl from the service or the default apiUrl from the settings
 * @throws {Error} If the settings has a service but the service doesn't have an apiUrl
 *
 */
function getApiUrl(settings) {
  var service = serviceConfig(settings);

  if (service) {
    // If the host page contains a service setting then the client should default to
    // using that apiUrl.
    if (service.apiUrl) {
      return service.apiUrl;
    } else {
      throw new Error('Service should contain an apiUrl value.');
    }
  }
  return settings.apiUrl;
}

module.exports = getApiUrl;

},{"./service-config":129}],104:[function(require,module,exports){
/**
 * @ngdoc service
 * @name  groups
 *
 * @description Provides access to the list of groups that the user is currently
 *              a member of and the currently selected group in the UI.
 *
 *              The list of groups is initialized from the session state
 *              and can then later be updated using the add() and remove()
 *              methods.
 */
'use strict';

groups.$inject = ["localStorage", "serviceUrl", "session", "$rootScope", "store"];
var STORAGE_KEY = 'hypothesis.groups.focus';

var events = require('./events');

// @ngInject
function groups(localStorage, serviceUrl, session, $rootScope, store) {
  // The currently focused group. This is the group that's shown as selected in
  // the groups dropdown, the annotations displayed are filtered to only ones
  // that belong to this group, and any new annotations that the user creates
  // will be created in this group.
  var focusedGroup;

  function all() {
    return session.state.groups || [];
  }

  // Return the full object for the group with the given id.
  function get(id) {
    var gs = all();
    for (var i = 0, max = gs.length; i < max; i++) {
      if (gs[i].id === id) {
        return gs[i];
      }
    }
    return null;
  }

  /**
   * Leave the group with the given ID.
   * Returns a promise which resolves when the action completes.
   */
  function leave(id) {
    // The groups list will be updated in response to a session state
    // change notification from the server. We could improve the UX here
    // by optimistically updating the session state
    return store.group.member.delete({
      pubid: id,
      user: 'me'
    });
  }

  /** Return the currently focused group. If no group is explicitly focused we
   * will check localStorage to see if we have persisted a focused group from
   * a previous session. Lastly, we fall back to the first group available.
   */
  function focused() {
    if (focusedGroup) {
      return focusedGroup;
    }
    var fromStorage = get(localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      focusedGroup = fromStorage;
      return focusedGroup;
    }
    return all()[0];
  }

  /** Set the group with the passed id as the currently focused group. */
  function focus(id) {
    var prevFocused = focused();
    var g = get(id);
    if (g) {
      focusedGroup = g;
      localStorage.setItem(STORAGE_KEY, g.id);
      if (prevFocused.id !== g.id) {
        $rootScope.$broadcast(events.GROUP_FOCUSED, g.id);
      }
    }
  }

  // reset the focused group if the user leaves it
  $rootScope.$on(events.GROUPS_CHANGED, function () {
    if (focusedGroup) {
      focusedGroup = get(focusedGroup.id);
      if (!focusedGroup) {
        $rootScope.$broadcast(events.GROUP_FOCUSED, focused());
      }
    }
  });

  return {
    all: all,
    get: get,

    leave: leave,

    focused: focused,
    focus: focus
  };
}

module.exports = groups;

},{"./events":97}],105:[function(require,module,exports){
'use strict';

var queryString = require('query-string');

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 */
function hostPageConfig(window) {
  var configJSON = queryString.parse(window.location.search).config;
  var config = JSON.parse(configJSON || '{}');

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  var paramWhiteList = [
  // Direct-linked annotation ID
  'annotations',

  // Default query passed by url
  'query',

  // Config param added by the extension, Via etc.  indicating how Hypothesis
  // was added to the page.
  'appType',

  // Config params documented at
  // https://h.readthedocs.io/projects/client/en/latest/publishers/config/
  'openSidebar', 'showHighlights', 'services', 'branding', 'onElementClick', 'isHighlightBtnVisible', 'locale',

  // New note button override.
  // This should be removed once new note button is enabled for everybody.
  'enableExperimentalNewNoteButton',

  // Theme which can either be specified as 'clean'.
  // If nothing is the specified the classic look is applied.
  'theme', 'usernameUrl'];

  return Object.keys(config).reduce(function (result, key) {
    if (paramWhiteList.indexOf(key) !== -1) {
      // Ignore `null` values as these indicate a default value.
      // In this case the config value set in the sidebar app HTML config is
      // used.
      if (config[key] !== null) {
        result[key] = config[key];
      }
    }
    return result;
  }, {});
}

module.exports = hostPageConfig;

},{"query-string":20}],106:[function(require,module,exports){
'use strict';

configureLocation.$inject = ["$locationProvider"];
configureRoutes.$inject = ["$routeProvider"];
configureToastr.$inject = ["toastrConfig"];
configureTranslate.$inject = ["$translateProvider"];
setupHttp.$inject = ["$http", "streamer"];
var addAnalytics = require('./ga');
var disableOpenerForExternalLinks = require('./util/disable-opener-for-external-links');
var getApiUrl = require('./get-api-url');
var serviceConfig = require('./service-config');
var crossOriginRPC = require('./cross-origin-rpc.js');
var translateProvider = require('./translate-provider.js');
require('../shared/polyfills');

var raven;

// Read settings rendered into sidebar app HTML by service/extension.
var settings = require('../shared/settings').jsonConfigsFrom(document);

if (settings.raven) {
  // Initialize Raven. This is required at the top of this file
  // so that it happens early in the app's startup flow
  raven = require('./raven');
  raven.init(settings.raven);
}

var hostPageConfig = require('./host-config');
Object.assign(settings, hostPageConfig(window));

settings.apiUrl = getApiUrl(settings);

// Disable Angular features that are not compatible with CSP.
//
// See https://docs.angularjs.org/api/ng/directive/ngCsp
//
// The `ng-csp` attribute must be set on some HTML element in the document
// _before_ Angular is require'd for the first time.
document.body.setAttribute('ng-csp', '');

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

var angular = require('angular');

// autofill-event relies on the existence of window.angular so
// it must be require'd after angular is first require'd
require('autofill-event');

// Setup Angular integration for Raven
if (settings.raven) {
  raven.angularModule(angular);
} else {
  angular.module('ngRaven', []);
}

if (settings.googleAnalytics) {
  addAnalytics(settings.googleAnalytics);
}

// Fetch external state that the app needs before it can run. This includes the
// authenticated user state, the API endpoint URLs and WebSocket connection.
var resolve = {
  // @ngInject
  sessionState: ["session", function sessionState(session) {
    return session.load();
  }]
};

// @ngInject
function configureLocation($locationProvider) {
  // Use HTML5 history
  return $locationProvider.html5Mode(true);
}

// @ngInject
function configureRoutes($routeProvider) {
  // The `vm.{auth,search}` properties used in these templates come from the
  // `<hypothesis-app>` component which hosts the router's container element.
  $routeProvider.when('/a/:id', {
    template: '<annotation-viewer-content search="vm.search"></annotation-viewer-content>',
    reloadOnSearch: false,
    resolve: resolve
  });
  $routeProvider.when('/stream', {
    template: '<stream-content search="vm.search"></stream-content>',
    reloadOnSearch: false,
    resolve: resolve
  });
  $routeProvider.otherwise({
    template: '<sidebar-content search="vm.search" auth="vm.auth"></sidebar-content>',
    reloadOnSearch: false,
    resolve: resolve
  });
}

// @ngInject
function configureToastr(toastrConfig) {
  angular.extend(toastrConfig, {
    preventOpenDuplicates: true
  });
}

//@ngInject
function configureTranslate($translateProvider) {
  translateProvider.translate($translateProvider);
  // NOTE: Would it be enough if we change the prefered language? If so, we don't need an angular service at all! Easy!
  // CONCERN: When the page is refreshed because the language is changed, is here going to be triggered? 
  // As far as I understand, yes it is going to be triggered.
  $translateProvider.preferredLanguage(settings.locale);
}
// @ngInject
function setupHttp($http, streamer) {
  $http.defaults.headers.common['X-Client-Id'] = streamer.clientId;
}

function processAppOpts() {
  if (settings.liveReloadServer) {
    require('./live-reload-client').connect(settings.liveReloadServer);
  }
}

module.exports = angular.module('h', [
// Angular addons which export the Angular module name
// via module.exports
require('angular-route'), require('angular-sanitize'), require('angular-toastr'), require('angular-translate'),

// Angular addons which do not export the Angular module
// name via module.exports
['angulartics', require('angulartics')][0], ['angulartics.google.analytics', require('angulartics/src/angulartics-ga')][0], ['ngTagsInput', require('ng-tags-input')][0], ['ui.bootstrap', require('./vendor/ui-bootstrap-custom-tpls-0.13.4')][0],

// Local addons
'ngRaven'])

// The root component for the application
.component('hypothesisApp', require('./components/hypothesis-app'))

// UI components
.component('annotation', require('./components/annotation')).component('annotationHeader', require('./components/annotation-header')).component('annotationActionButton', require('./components/annotation-action-button')).component('annotationShareDialog', require('./components/annotation-share-dialog')).component('annotationThread', require('./components/annotation-thread')).component('annotationViewerContent', require('./components/annotation-viewer-content')).component('dropdownMenuBtn', require('./components/dropdown-menu-btn')).component('excerpt', require('./components/excerpt')).component('groupList', require('./components/group-list')).component('helpLink', require('./components/help-link')).component('helpPanel', require('./components/help-panel')).component('loggedoutMessage', require('./components/loggedout-message')).component('loginControl', require('./components/login-control')).component('markdown', require('./components/markdown')).component('moderationBanner', require('./components/moderation-banner')).component('newNoteBtn', require('./components/new-note-btn')).component('publishAnnotationBtn', require('./components/publish-annotation-btn')).component('searchInput', require('./components/search-input')).component('searchStatusBar', require('./components/search-status-bar')).component('selectionTabs', require('./components/selection-tabs')).component('sidebarContent', require('./components/sidebar-content')).component('sidebarTutorial', require('./components/sidebar-tutorial')).component('shareDialog', require('./components/share-dialog')).component('sortDropdown', require('./components/sort-dropdown')).component('streamContent', require('./components/stream-content')).component('svgIcon', require('./components/svg-icon')).component('tagEditor', require('./components/tag-editor')).component('threadList', require('./components/thread-list')).component('timestamp', require('./components/timestamp')).component('topBar', require('./components/top-bar')).directive('hAutofocus', require('./directive/h-autofocus')).directive('hBranding', require('./directive/h-branding')).directive('hOnTouch', require('./directive/h-on-touch')).directive('hTooltip', require('./directive/h-tooltip')).directive('spinner', require('./directive/spinner')).directive('windowScroll', require('./directive/window-scroll')).service('analytics', require('./analytics')).service('annotationMapper', require('./annotation-mapper')).service('annotationUI', require('./annotation-ui')).service('apiRoutes', require('./api-routes')).service('auth', require('./oauth-auth')).service('bridge', require('../shared/bridge')).service('drafts', require('./drafts')).service('features', require('./features')).service('flash', require('./flash')).service('frameSync', require('./frame-sync').default).service('groups', require('./groups')).service('localStorage', require('./local-storage')).service('permissions', require('./permissions')).service('queryParser', require('./query-parser')).service('rootThread', require('./root-thread')).service('searchFilter', require('./search-filter')).service('serviceUrl', require('./service-url')).service('session', require('./session')).service('streamer', require('./streamer')).service('streamFilter', require('./stream-filter')).service('tags', require('./tags')).service('unicode', require('./unicode')).service('viewFilter', require('./view-filter')).factory('store', require('./store')).value('Discovery', require('../shared/discovery')).value('ExcerptOverflowMonitor', require('./util/excerpt-overflow-monitor')).value('OAuthClient', require('./util/oauth-client')).value('VirtualThreadList', require('./virtual-thread-list')).value('random', require('./util/random')).value('raven', require('./raven')).value('serviceConfig', serviceConfig).value('settings', settings).value('time', require('./time')).value('urlEncodeFilter', require('./filter/url').encode).config(configureLocation).config(configureRoutes).config(configureToastr).config(configureTranslate).run(setupHttp).run(crossOriginRPC.server.start);

processAppOpts();

// Work around a check in Angular's $sniffer service that causes it to
// incorrectly determine that Firefox extensions are Chrome Packaged Apps which
// do not support the HTML 5 History API. This results Angular redirecting the
// browser on startup and thus the app fails to load.
// See https://github.com/angular/angular.js/blob/a03b75c6a812fcc2f616fc05c0f1710e03fca8e9/src/ng/sniffer.js#L30
if (window.chrome && !window.chrome.app) {
  window.chrome.app = {
    dummyAddedByHypothesisClient: true
  };
}

var appEl = document.querySelector('hypothesis-app');
angular.bootstrap(appEl, ['h'], { strictDi: true });

},{"../shared/bridge":44,"../shared/discovery":45,"../shared/polyfills":"/src/shared/polyfills.js","../shared/settings":47,"./analytics":51,"./annotation-mapper":52,"./annotation-ui":54,"./api-routes":55,"./components/annotation":62,"./components/annotation-action-button":57,"./components/annotation-header":58,"./components/annotation-share-dialog":59,"./components/annotation-thread":60,"./components/annotation-viewer-content":61,"./components/dropdown-menu-btn":63,"./components/excerpt":64,"./components/group-list":65,"./components/help-link":66,"./components/help-panel":67,"./components/hypothesis-app":68,"./components/loggedout-message":69,"./components/login-control":70,"./components/markdown":71,"./components/moderation-banner":72,"./components/new-note-btn":73,"./components/publish-annotation-btn":74,"./components/search-input":75,"./components/search-status-bar":76,"./components/selection-tabs":77,"./components/share-dialog":78,"./components/sidebar-content":79,"./components/sidebar-tutorial":80,"./components/sort-dropdown":81,"./components/stream-content":82,"./components/svg-icon":83,"./components/tag-editor":84,"./components/thread-list":85,"./components/timestamp":86,"./components/top-bar":87,"./cross-origin-rpc.js":88,"./directive/h-autofocus":90,"./directive/h-branding":91,"./directive/h-on-touch":92,"./directive/h-tooltip":93,"./directive/spinner":94,"./directive/window-scroll":95,"./drafts":96,"./features":98,"./filter/url":99,"./flash":100,"./frame-sync":101,"./ga":102,"./get-api-url":103,"./groups":104,"./host-config":105,"./live-reload-client":107,"./local-storage":108,"./oauth-auth":111,"./permissions":112,"./query-parser":113,"./raven":114,"./root-thread":126,"./search-filter":128,"./service-config":129,"./service-url":130,"./session":131,"./store":132,"./stream-filter":133,"./streamer":134,"./tags":136,"./time":167,"./translate-provider.js":168,"./unicode":170,"./util/disable-opener-for-external-links":173,"./util/excerpt-overflow-monitor":174,"./util/oauth-client":177,"./util/random":178,"./vendor/ui-bootstrap-custom-tpls-0.13.4":182,"./view-filter":183,"./virtual-thread-list":184,"angular":"angular","angular-route":"angular-route","angular-sanitize":"angular-sanitize","angular-toastr":"angular-toastr","angular-translate":"angular-translate","angulartics":1,"angulartics/src/angulartics-ga":"angulartics/src/angulartics-ga","autofill-event":2,"ng-tags-input":"ng-tags-input"}],107:[function(require,module,exports){
'use strict';

/* eslint no-console: "off" */

var queryString = require('query-string');

var Socket = require('./websocket');

/**
 * Return a URL with a cache-busting query string parameter added.
 *
 * @param {string} url - The original asset URL
 * @return {string} The URL with a cache-buster added.
 */
function cacheBustURL(url) {
  var newUrl = url;
  var cacheBuster = queryString.parse({ timestamp: Date.now() });
  if (url.indexOf('?') !== -1) {
    newUrl += '&' + cacheBuster;
  } else {
    newUrl += '?' + cacheBuster;
  }
  return newUrl;
}

/**
 * Return true if a URL matches a list of paths of modified assets.
 *
 * @param {string} url - The URL of the stylesheet, script or other resource.
 * @param {Array<string>} changed - List of paths of modified assets.
 */
function didAssetChange(url, changed) {
  return changed.some(function (path) {
    return url.indexOf(path) !== -1;
  });
}

/**
 * Reload a stylesheet or media element if it references a file
 * in a list of changed assets.
 *
 * @param {Element} element - An HTML <link> tag or media element.
 * @param {Array<string>} changed - List of paths of modified assets.
 */
function maybeReloadElement(element, changed) {
  var parentElement = element.parentNode;
  var newElement = element.cloneNode();
  var srcKeys = ['href', 'src'];
  srcKeys.forEach(function (key) {
    if (key in element && didAssetChange(element[key], changed)) {
      newElement[key] = cacheBustURL(element[key]);
    }
  });
  parentElement.replaceChild(newElement, element);
}

function reloadExternalStyleSheets(changed) {
  var linkTags = [].slice.apply(document.querySelectorAll('link'));
  linkTags.forEach(function (tag) {
    maybeReloadElement(tag, changed);
  });
}

/**
 * Connect to the live-reload server at @p url.
 *
 * @param {string} url - The URL of the live reload server. If undefined,
 *                       the 'livereloadserver' query string parameter is
 *                       used.
 */
function connect(url) {
  var conn = new Socket(url);
  conn.on('open', function () {
    console.log('Live reload client listening');
  });
  conn.on('message', function (event) {
    var message = JSON.parse(event.data);
    if (message.type === 'assets-changed') {
      var scriptsOrTemplatesChanged = message.changed.some(function (path) {
        return path.match(/\.(html|js)$/);
      });
      var stylesChanged = message.changed.some(function (path) {
        return path.match(/\.css$/);
      });
      if (scriptsOrTemplatesChanged) {
        // Ask the host page to reload the client (eg. by reloading itself).
        window.top.postMessage({ type: 'reloadrequest' }, '*');
        return;
      }
      if (stylesChanged) {
        reloadExternalStyleSheets(message.changed);
      }
    }
  });
  conn.on('error', function (err) {
    console.error('Error connecting to live reload server:', err);
  });
}

module.exports = {
  connect: connect
};

},{"./websocket":185,"query-string":20}],108:[function(require,module,exports){
'use strict';

/**
 * Fallback in-memory store if `localStorage` is not read/writable.
 */

localStorage.$inject = ["$window"];
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InMemoryStorage = function () {
  function InMemoryStorage() {
    _classCallCheck(this, InMemoryStorage);

    this._store = {};
  }

  _createClass(InMemoryStorage, [{
    key: 'getItem',
    value: function getItem(key) {
      return key in this._store ? this._store[key] : null;
    }
  }, {
    key: 'setItem',
    value: function setItem(key, value) {
      this._store[key] = value;
    }
  }, {
    key: 'removeItem',
    value: function removeItem(key) {
      delete this._store[key];
    }
  }]);

  return InMemoryStorage;
}();

/**
 * A wrapper around the `localStorage` API which provides a fallback to
 * in-memory storage in browsers that block access to `window.localStorage`.
 * in third-party iframes.
 */
// @ngInject


function localStorage($window) {
  var storage = void 0;
  var testKey = 'hypothesis.testKey';

  try {
    // Test whether we can read/write localStorage.
    storage = $window.localStorage;
    $window.localStorage.setItem(testKey, testKey);
    $window.localStorage.getItem(testKey);
    $window.localStorage.removeItem(testKey);
  } catch (e) {
    storage = new InMemoryStorage();
  }

  return {
    getItem: function getItem(key) {
      return storage.getItem(key);
    },
    getObject: function getObject(key) {
      var item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    },
    setItem: function setItem(key, value) {
      storage.setItem(key, value);
    },
    setObject: function setObject(key, value) {
      var repr = JSON.stringify(value);
      storage.setItem(key, repr);
    },
    removeItem: function removeItem(key) {
      storage.removeItem(key);
    }
  };
}

module.exports = localStorage;

},{}],109:[function(require,module,exports){
'use strict';

/**
 * Commands for toggling markdown formatting of a selection
 * in an input field.
 *
 * All of the functions in this module take as input the current state
 * of the input field, parameters for the operation to perform and return the
 * new state of the input field.
 */

/**
 * Describes the state of a plain text input field.
 *
 * interface EditorState {
 *   text: string;
 *   selectionStart: number;
 *   selectionEnd: number;
 * }
 */

/**
 * Types of Markdown link that can be inserted with
 * convertSelectionToLink()
 */

var LinkType = {
  ANCHOR_LINK: 0,
  IMAGE_LINK: 1
};

/**
 * Replace text in an input field and return the new state.
 *
 * @param {EditorState} state - The state of the input field.
 * @param {number} pos - The start position of the text to remove.
 * @param {number} length - The number of characters to remove.
 * @param {string} text - The replacement text to insert at `pos`.
 * @return {EditorState} - The new state of the input field.
 */
function replaceText(state, pos, length, text) {
  var newSelectionStart = state.selectionStart;
  var newSelectionEnd = state.selectionEnd;

  if (newSelectionStart >= pos + length) {
    // 1. Selection is after replaced text:
    //    Increment (start, end) by difference in length between original and
    //    replaced text
    newSelectionStart += text.length - length;
    newSelectionEnd += text.length - length;
  } else if (newSelectionEnd <= pos) {
    // 2. Selection is before replaced text: Leave selection unchanged
  } else if (newSelectionStart <= pos && newSelectionEnd >= pos + length) {
    // 3. Selection fully contains replaced text:
    //    Increment end by difference in length between original and replaced
    //    text
    newSelectionEnd += text.length - length;
  } else if (newSelectionStart < pos && newSelectionEnd < pos + length) {
    // 4. Selection overlaps start but not end of replaced text:
    //    Decrement start to start of replacement text
    newSelectionStart = pos;
  } else if (newSelectionStart < pos + length && newSelectionEnd > pos + length) {
    // 5. Selection overlaps end but not start of replaced text:
    //    Increment end by difference in length between original and replaced
    //    text
    newSelectionEnd += text.length - length;
  } else if (pos < newSelectionStart && pos + length > newSelectionEnd) {
    // 6. Replaced text fully contains selection:
    //    Expand selection to replaced text
    newSelectionStart = pos;
    newSelectionEnd = pos + length;
  }

  return {
    text: state.text.slice(0, pos) + text + state.text.slice(pos + length),
    selectionStart: newSelectionStart,
    selectionEnd: newSelectionEnd
  };
}

/**
 * Convert the selected text into a Markdown link.
 *
 * @param {EditorState} state - The current state of the input field.
 * @param {LinkType} linkType - The type of link to insert.
 * @return {EditorState} - The new state of the input field.
 */
function convertSelectionToLink(state, linkType) {
  if (typeof linkType === 'undefined') {
    linkType = LinkType.ANCHOR_LINK;
  }

  var selection = state.text.slice(state.selectionStart, state.selectionEnd);

  var linkPrefix = '';
  if (linkType === LinkType.IMAGE_LINK) {
    linkPrefix = '!';
  }

  var newState;
  if (selection.match(/[a-z]+:\/\/.*/)) {
    // Selection is a URL, wrap it with a link and use the selection as
    // the target.
    var dummyLabel = 'Description';
    newState = replaceText(state, state.selectionStart, selection.length, linkPrefix + '[' + dummyLabel + '](' + selection + ')');
    newState.selectionStart = state.selectionStart + linkPrefix.length + 1;
    newState.selectionEnd = newState.selectionStart + dummyLabel.length;
    return newState;
  } else {
    // Selection is not a URL, wrap it with a link and use the selection as
    // the label. Change the selection to the dummy link.
    var beforeURL = linkPrefix + '[' + selection + '](';
    var dummyLink = 'http://insert-your-link-here.com';
    newState = replaceText(state, state.selectionStart, selection.length, beforeURL + dummyLink + ')');
    newState.selectionStart = state.selectionStart + beforeURL.length;
    newState.selectionEnd = newState.selectionStart + dummyLink.length;
    return newState;
  }
}

/**
 * Toggle Markdown-style formatting around a span of text.
 *
 * @param {EditorState} state - The current state of the input field.
 * @param {string} prefix - The prefix to add or remove
 *                          before the selection.
 * @param {string?} suffix - The suffix to add or remove after the selection,
 *                           defaults to being the same as the prefix.
 * @param {string} placeholder - The text to insert between 'prefix' and
 *                               'suffix' if the input text is empty.
 * @return {EditorState} The new state of the input field.
 */
function toggleSpanStyle(state, prefix, suffix, placeholder) {
  if (typeof suffix === 'undefined') {
    suffix = prefix;
  }

  var selectionPrefix = state.text.slice(state.selectionStart - prefix.length, state.selectionStart);
  var selectionSuffix = state.text.slice(state.selectionEnd, state.selectionEnd + prefix.length);
  var newState = state;

  if (state.selectionStart === state.selectionEnd && placeholder) {
    newState = replaceText(state, state.selectionStart, 0, placeholder);
    newState.selectionStart = newState.selectionEnd - placeholder.length;
  }

  if (selectionPrefix === prefix && selectionSuffix === suffix) {
    newState = replaceText(newState, newState.selectionStart - prefix.length, prefix.length, '');
    newState = replaceText(newState, newState.selectionEnd, suffix.length, '');
  } else {
    newState = replaceText(newState, newState.selectionStart, 0, prefix);
    newState = replaceText(newState, newState.selectionEnd, 0, suffix);
  }

  return newState;
}

function startOfLine(str, pos) {
  var start = str.lastIndexOf('\n', pos);
  if (start < 0) {
    return 0;
  } else {
    return start + 1;
  }
}

function endOfLine(str, pos) {
  var end = str.indexOf('\n', pos);
  if (end < 0) {
    return str.length;
  } else {
    return end;
  }
}

/**
 * Transform lines between two positions in an input field.
 *
 * @param {EditorState} state - The initial state of the input field
 * @param {number} start - The start position within the input text
 * @param {number} end - The end position within the input text
 * @param {(EditorState, number) => EditorState} callback
 *  - Callback which is invoked with the current state of the input and
 *    the start of the current line and returns the new state of the input.
 */
function transformLines(state, start, end, callback) {
  var lineStart = startOfLine(state.text, start);
  var lineEnd = endOfLine(state.text, start);

  while (lineEnd <= endOfLine(state.text, end)) {
    var isLastLine = lineEnd === state.text.length;
    var currentLineLength = lineEnd - lineStart;

    state = callback(state, lineStart, lineEnd);

    var newLineLength = endOfLine(state.text, lineStart) - lineStart;
    end += newLineLength - currentLineLength;

    if (isLastLine) {
      break;
    }
    lineStart = lineStart + newLineLength + 1;
    lineEnd = endOfLine(state.text, lineStart);
  }
  return state;
}

/**
 * Toggle Markdown-style formatting around a block of text.
 *
 * @param {EditorState} state - The current state of the input field.
 * @param {string} prefix - The prefix to add or remove before each line
 *                          of the selection.
 * @return {EditorState} - The new state of the input field.
 */
function toggleBlockStyle(state, prefix) {
  var start = state.selectionStart;
  var end = state.selectionEnd;

  // Test whether all lines in the selected range already have the style
  // applied
  var blockHasStyle = true;
  transformLines(state, start, end, function (state, lineStart) {
    if (state.text.slice(lineStart, lineStart + prefix.length) !== prefix) {
      blockHasStyle = false;
    }
    return state;
  });

  if (blockHasStyle) {
    // Remove the formatting.
    return transformLines(state, start, end, function (state, lineStart) {
      return replaceText(state, lineStart, prefix.length, '');
    });
  } else {
    // Add the block style to any lines which do not already have it applied
    return transformLines(state, start, end, function (state, lineStart) {
      if (state.text.slice(lineStart, lineStart + prefix.length) === prefix) {
        return state;
      } else {
        return replaceText(state, lineStart, 0, prefix);
      }
    });
  }
}

module.exports = {
  toggleSpanStyle: toggleSpanStyle,
  toggleBlockStyle: toggleBlockStyle,
  convertSelectionToLink: convertSelectionToLink,
  LinkType: LinkType
};

},{}],110:[function(require,module,exports){
'use strict';

var queryString = require('query-string');

/**
* Return an HTML5 audio player with the given src URL.
*/

function audioElement(src) {
  var html5audio = document.createElement('audio');
  html5audio.controls = true;
  html5audio.src = src;
  return html5audio;
}

/**
 * Return an iframe DOM element with the given src URL.
 */
function iframe(src) {
  var iframe_ = document.createElement('iframe');
  iframe_.src = src;
  iframe_.classList.add('annotation-media-embed');
  iframe_.setAttribute('frameborder', '0');
  iframe_.setAttribute('allowfullscreen', '');
  return iframe_;
}

/**
 * Return timeValue as a value in seconds, supporting `t` param's optional
 * '\dh\dm\ds' format. If `timeValue` is numeric (only),
 * it's assumed to be seconds and is left alone.
 *
 * @param {string} timeValue - value of `t` or `start` param in YouTube URL
 * @returns {string} timeValue in seconds
 * @example
 * formatYouTubeTime('5m'); // returns '300'
 * formatYouTubeTime('20m10s'); // returns '1210'
 * formatYouTubeTime('1h1s'); // returns '3601'
 * formatYouTubeTime('10'); // returns '10'
 **/
function parseTimeString(timeValue) {
  var timePattern = /(\d+)([hms]?)/g;
  var multipliers = {
    h: 60 * 60,
    m: 60,
    s: 1
  };
  var seconds = 0;
  var match;
  // match[1] - Numeric value
  // match[2] - Unit (e.g. 'h','m','s', or empty)
  while ((match = timePattern.exec(timeValue)) !== null) {
    if (match[2]) {
      seconds += match[1] * multipliers[match[2]];
    } else {
      seconds += +match[1]; // Treat values missing units as seconds
    }
  }
  return seconds.toString();
}

/**
 * Return a YouTube URL query string containing (only) whitelisted params.
 * See https://developers.google.com/youtube/player_parameters for
 * all parameter possibilities.
 *
 * @returns {string} formatted filtered URL query string, e.g. '?start=90'
 * @example
 * // returns '?end=10&start=5'
 * youTubeQueryParams(link); // where `link.search` = '?t=5&baz=foo&end=10'
 * // - `t` is translated to `start`
 * // - `baz` is not allowed param
 * // - param keys are sorted
 */
function youTubeQueryParams(link) {
  var query;
  var allowedParams = ['end', 'start', 't'];
  var linkParams = queryString.parse(link.search);
  var filteredQuery = {};
  // Filter linkParams for allowed keys and build those entries
  // into the filteredQuery object
  Object.keys(linkParams).filter(function (key) {
    return allowedParams.includes(key);
  }).forEach(function (key) {
    if (key === 't') {
      // `t` is not supported in embeds; `start` is
      // `t` accepts more formats than `start`; start must be in seconds
      // so, format it as seconds first
      filteredQuery.start = parseTimeString(linkParams[key]);
    } else {
      filteredQuery[key] = linkParams[key];
    }
  });
  query = queryString.stringify(filteredQuery);
  if (query) {
    query = '?' + query;
  }
  return query;
}
/**
 * Return a YouTube embed (<iframe>) DOM element for the given video ID.
 */
function youTubeEmbed(id, link) {
  var query = youTubeQueryParams(link);
  return iframe('https://www.youtube.com/embed/' + id + query);
}

function vimeoEmbed(id) {
  return iframe('https://player.vimeo.com/video/' + id);
}

/**
 * A list of functions that return an "embed" DOM element (e.g. an <iframe> or
 * an html5 <audio> element) for a given link.
 *
 * Each function either returns `undefined` if it can't generate an embed for
 * the link, or a DOM element if it can.
 *
 */
var embedGenerators = [

// Matches URLs like https://www.youtube.com/watch?v=rw6oWkCojpw
function iframeFromYouTubeWatchURL(link) {
  if (link.hostname !== 'www.youtube.com') {
    return null;
  }

  if (!/\/watch\/?/.test(link.pathname)) {
    return null;
  }

  var groups = /[&\?]v=([^&#]+)/.exec(link.search);
  if (groups) {
    return youTubeEmbed(groups[1], link);
  }
  return null;
},

// Matches URLs like https://youtu.be/rw6oWkCojpw
function iframeFromYouTubeShareURL(link) {
  if (link.hostname !== 'youtu.be') {
    return null;
  }

  // extract video ID from URL
  var groups = /^\/([^\/]+)\/?$/.exec(link.pathname);
  if (groups) {
    return youTubeEmbed(groups[1], link);
  }
  return null;
},

// Matches URLs like https://vimeo.com/149000090
function iFrameFromVimeoLink(link) {
  if (link.hostname !== 'vimeo.com') {
    return null;
  }

  var groups = /^\/([^\/\?#]+)\/?$/.exec(link.pathname);
  if (groups) {
    return vimeoEmbed(groups[1]);
  }
  return null;
},

// Matches URLs like https://vimeo.com/channels/staffpicks/148845534
function iFrameFromVimeoChannelLink(link) {
  if (link.hostname !== 'vimeo.com') {
    return null;
  }

  var groups = /^\/channels\/[^\/]+\/([^\/?#]+)\/?$/.exec(link.pathname);
  if (groups) {
    return vimeoEmbed(groups[1]);
  }
  return null;
},

/**
 * Match Internet Archive URLs
 *
 *  The patterns are:
 *
 *  1. https://archive.org/embed/{slug}?start={startTime}&end={endTime}
 *     (Embed links)
 *
 *  2. https://archive.org/details/{slug}?start={startTime}&end={endTime}
 *     (Video page links for most videos)
 *
 *  3. https://archive.org/details/{slug}/start/{startTime}/end/{endTime}
 *     (Video page links for the TV News Archive [1])
 *
 *  (2) and (3) allow users to copy and paste URLs from archive.org video
 *  details pages directly into the sidebar to generate video embeds.
 *
 *  [1] https://archive.org/details/tv
 */
function iFrameFromInternetArchiveLink(link) {
  if (link.hostname !== 'archive.org') {
    return null;
  }

  // Extract the unique slug from the path.
  var slugMatch = /^\/(embed|details)\/(.+)/.exec(link.pathname);
  if (!slugMatch) {
    return null;
  }

  // Extract start and end times, which may appear either as query string
  // params or path params.
  var slug = slugMatch[2];
  var linkParams = queryString.parse(link.search);
  var startTime = linkParams.start;
  var endTime = linkParams.end;

  if (!startTime) {
    var startPathParam = slug.match(/\/start\/([^\/]+)/);
    if (startPathParam) {
      startTime = startPathParam[1];
      slug = slug.replace(startPathParam[0], '');
    }
  }

  if (!endTime) {
    var endPathParam = slug.match(/\/end\/([^\/]+)/);
    if (endPathParam) {
      endTime = endPathParam[1];
      slug = slug.replace(endPathParam[0], '');
    }
  }

  // Generate embed URL.
  var iframeUrl = new URL('https://archive.org/embed/' + slug);
  if (startTime) {
    iframeUrl.searchParams.append('start', startTime);
  }
  if (endTime) {
    iframeUrl.searchParams.append('end', endTime);
  }
  return iframe(iframeUrl.href);
},

// Matches URLs that end with .mp3, .ogg, or .wav (assumed to be audio files)
function html5audioFromMp3Link(link) {
  if (link.pathname.endsWith('.mp3') || link.pathname.endsWith('.ogg') || link.pathname.endsWith('.wav')) {
    return audioElement(link.href);
  }
  return null;
}];

/**
 * Return an embed element for the given link if it's an embeddable link.
 *
 * If the link is a link for a YouTube video or other embeddable media then
 * return an embed DOM element (for example an <iframe>) for that media.
 *
 * Otherwise return undefined.
 *
 */
function embedForLink(link) {
  var embed;
  var j;
  for (j = 0; j < embedGenerators.length; j++) {
    embed = embedGenerators[j](link);
    if (embed) {
      return embed;
    }
  }
  return null;
}

/** Replace the given link element with an embed.
 *
 * If the given link element is a link to an embeddable media and if its link
 * text is the same as its href then it will be replaced in the DOM with an
 * embed (e.g. an <iframe> or html5 <audio> element) of the same media.
 *
 * If the link text is different from the href, then the link will be left
 * untouched. We want to convert links like these from the Markdown source into
 * embeds:
 *
 *     https://vimeo.com/channels/staffpicks/148845534
 *     <https://vimeo.com/channels/staffpicks/148845534>
 *
 * But we don't want to convert links like this:
 *
 *     [Custom link text](https://vimeo.com/channels/staffpicks/148845534)
 *
 * because doing so would destroy the user's custom link text, and leave users
 * with no way to just insert a media link without it being embedded.
 *
 * If the link is not a link to an embeddable media it will be left untouched.
 *
 */
function replaceLinkWithEmbed(link) {
  if (link.href !== link.textContent) {
    return;
  }
  var embed = embedForLink(link);
  if (embed) {
    link.parentElement.replaceChild(embed, link);
  }
}

/**
 * Replace all embeddable link elements beneath the given element with embeds.
 *
 * All links to YouTube videos or other embeddable media will be replaced with
 * embeds of the same media.
 *
 */
function replaceLinksWithEmbeds(element) {
  var links = element.getElementsByTagName('a');

  // `links` is a "live list" of the <a> element children of `element`.
  // We want to iterate over `links` and replace some of them with embeds,
  // but we can't modify `links` while looping over it so we need to copy it to
  // a nice, normal array first.
  links = Array.prototype.slice.call(links, 0);

  var i;
  for (i = 0; i < links.length; i++) {
    replaceLinkWithEmbed(links[i]);
  }
}

module.exports = {
  replaceLinksWithEmbeds: replaceLinksWithEmbeds
};

},{"query-string":20}],111:[function(require,module,exports){
'use strict';

auth.$inject = ["$http", "$rootScope", "$window", "OAuthClient", "apiRoutes", "flash", "localStorage", "settings", "$filter"];
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var events = require('./events');
var resolve = require('./util/url-util').resolve;
var serviceConfig = require('./service-config');

/**
 * @typedef RefreshOptions
 * @property {boolean} persist - True if access tokens should be persisted for
 *   use in future sessions.
 */

/**
 * Authorization service.
 *
 * This service is responsible for acquiring access tokens for making API
 * requests and making them available via the `tokenGetter()` method.
 *
 * Access tokens are acquired via the OAuth authorization flow, loading valid
 * tokens from a previous session or, on some websites, by exchanging a grant
 * token provided by the host page.
 *
 * Interaction with OAuth endpoints in the annotation service is delegated to
 * the `OAuthClient` class.
 */
// @ngInject
function auth($http, $rootScope, $window, OAuthClient, apiRoutes, flash, localStorage, settings, $filter) {

  /**
   * Authorization code from auth popup window.
   * @type {string}
   */
  var authCode;

  /**
   * Token info retrieved via `POST /api/token` endpoint.
   *
   * Resolves to `null` if the user is not logged in.
   *
   * @type {Promise<TokenInfo|null>}
   */
  var tokenInfoPromise;

  /** @type {OAuthClient} */
  var client;

  /**
   * Absolute URL of the `/api/token` endpoint.
   */
  var tokenUrl = resolve('token', settings.apiUrl);

  /**
   * Show an error message telling the user that the access token has expired.
   */
  function showAccessTokenExpiredErrorMessage(message) {
    var msg = $filter('translate')('Hypothesis login lost');
    flash.error(message, msg, {
      extendedTimeOut: 0,
      tapToDismiss: false,
      timeOut: 0
    });
  }

  /**
   * Return the storage key used for storing access/refresh token data for a given
   * annotation service.
   */
  function storageKey() {
    // Use a unique key per annotation service. Currently OAuth tokens are only
    // persisted for the default annotation service. If in future we support
    // logging into other services from the client, this function will need to
    // take the API URL as an argument.
    var apiDomain = new URL(settings.apiUrl).hostname;

    // Percent-encode periods to avoid conflict with section delimeters.
    apiDomain = apiDomain.replace(/\./g, '%2E');

    return 'hypothesis.oauth.' + apiDomain + '.token';
  }

  /**
   * Fetch the last-saved access/refresh tokens for `authority` from local
   * storage.
   */
  function loadToken() {
    var token = localStorage.getObject(storageKey());

    if (!token || typeof token.accessToken !== 'string' || typeof token.refreshToken !== 'string' || typeof token.expiresAt !== 'number') {
      return null;
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt
    };
  }

  /**
   * Persist access & refresh tokens for future use.
   */
  function saveToken(token) {
    localStorage.setObject(storageKey(), token);
  }

  /**
   * Exchange the refresh token for a new access token and refresh token pair.
   *
   * @param {string} refreshToken
   * @param {RefreshOptions} options
   * @return {Promise<TokenInfo>} Promise for the new access token
   */
  function refreshAccessToken(refreshToken, options) {
    return oauthClient().then(function (client) {
      return client.refreshToken(refreshToken);
    }).then(function (tokenInfo) {
      if (options.persist) {
        saveToken(tokenInfo);
      }
      return tokenInfo;
    });
  }

  /**
   * Listen for updated access & refresh tokens saved by other instances of the
   * client.
   */
  function listenForTokenStorageEvents() {
    $window.addEventListener('storage', function (_ref) {
      var key = _ref.key;

      if (key === storageKey()) {
        // Reset cached token information. Tokens will be reloaded from storage
        // on the next call to `tokenGetter()`.
        tokenInfoPromise = null;
        $rootScope.$broadcast(events.OAUTH_TOKENS_CHANGED);
      }
    });
  }

  function oauthClient() {
    if (client) {
      return Promise.resolve(client);
    }
    return apiRoutes.links().then(function (links) {
      client = new OAuthClient($http, {
        clientId: settings.oauthClientId,
        authorizationEndpoint: links['oauth.authorize'],
        revokeEndpoint: links['oauth.revoke'],
        tokenEndpoint: tokenUrl
      });
      return client;
    });
  }

  /**
   * Retrieve an access token for the API.
   *
   * @return {Promise<string>} The API access token.
   */
  function tokenGetter() {
    if (!tokenInfoPromise) {
      var cfg = serviceConfig(settings);

      // Check if automatic login is being used, indicated by the presence of
      // the 'grantToken' property in the service configuration.
      if (cfg && typeof cfg.grantToken !== 'undefined') {
        if (cfg.grantToken) {
          // User is logged-in on the publisher's website.
          // Exchange the grant token for a new access token.
          tokenInfoPromise = oauthClient().then(function (client) {
            return client.exchangeGrantToken(cfg.grantToken);
          }).catch(function (err) {
            showAccessTokenExpiredErrorMessage('You must reload the page to annotate.');
            throw err;
          });
        } else {
          // User is anonymous on the publisher's website.
          tokenInfoPromise = Promise.resolve(null);
        }
      } else if (authCode) {
        // Exchange authorization code retrieved from login popup for a new
        // access token.
        var code = authCode;
        authCode = null; // Auth codes can only be used once.
        tokenInfoPromise = oauthClient().then(function (client) {
          return client.exchangeAuthCode(code);
        }).then(function (tokenInfo) {
          saveToken(tokenInfo);
          return tokenInfo;
        });
      } else {
        // Attempt to load the tokens from the previous session.
        tokenInfoPromise = Promise.resolve(loadToken());
      }
    }

    var origToken = tokenInfoPromise;

    return tokenInfoPromise.then(function (token) {
      if (!token) {
        // No token available. User will need to log in.
        return null;
      }

      if (origToken !== tokenInfoPromise) {
        // A token refresh has been initiated via a call to `refreshAccessToken`
        // below since `tokenGetter()` was called.
        return tokenGetter();
      }

      if (Date.now() > token.expiresAt) {
        var shouldPersist = true;

        // If we are using automatic login via a grant token, do not persist the
        // initial access token or refreshed tokens.
        var cfg = serviceConfig(settings);
        if (cfg && typeof cfg.grantToken !== 'undefined') {
          shouldPersist = false;
        }

        // Token expired. Attempt to refresh.
        tokenInfoPromise = refreshAccessToken(token.refreshToken, {
          persist: shouldPersist
        }).then(function (token) {
          // Sanity check that prevents an infinite loop. Mostly useful in
          // tests.
          if (Date.now() > token.expiresAt) {
            throw new Error('Refreshed token expired in the past');
          }
          return token;
        }).catch(function () {
          // If refreshing the token fails, the user is simply logged out.
          return null;
        });

        return tokenGetter();
      } else {
        return token.accessToken;
      }
    });
  }

  /**
   * Login to the annotation service using OAuth.
   *
   * This displays a popup window which allows the user to login to the service
   * (if necessary) and then responds with an auth code which the client can
   * then exchange for access and refresh tokens.
   */
  function login() {
    var authWindow = OAuthClient.openAuthPopupWindow($window);
    return oauthClient().then(function (client) {
      return client.authorize($window, authWindow);
    }).then(function (code) {
      // Save the auth code. It will be exchanged for an access token when the
      // next API request is made.
      authCode = code;
      tokenInfoPromise = null;
    });
  }

  /**
   * Log out of the service (in the client only).
   *
   * This revokes and then forgets any OAuth credentials that the user has.
   */
  function logout() {
    return Promise.all([tokenInfoPromise, oauthClient()]).then(function (_ref2) {
      var _ref3 = _slicedToArray(_ref2, 2),
          token = _ref3[0],
          client = _ref3[1];

      return client.revokeToken(token.accessToken);
    }).then(function () {
      tokenInfoPromise = Promise.resolve(null);
      localStorage.removeItem(storageKey());
    });
  }

  listenForTokenStorageEvents();

  return {
    login: login,
    logout: logout,
    tokenGetter: tokenGetter
  };
}

module.exports = auth;

},{"./events":97,"./service-config":129,"./util/url-util":181}],112:[function(require,module,exports){
'use strict';

Permissions.$inject = ["localStorage"];
var STORAGE_KEY = 'hypothesis.privacy';

/**
 * Object defining which principals can read, update and delete an annotation.
 *
 * This is the same as the `permissions` field retrieved on an annotation via
 * the API.
 *
 * Principals are strings of the form `type:id` where `type` is `'acct'` (for a
 * specific user) or `'group'` (for a group).
 *
 * @typedef Permissions
 * @property {string[]} read - List of principals that can read the annotation
 * @property {string[]} update - List of principals that can edit the annotation
 * @property {string[]} delete - List of principals that can delete the
 * annotation
 */

/**
 * A service for generating and querying `Permissions` objects for annotations.
 *
 * It also provides methods to save and restore permissions preferences for new
 * annotations to local storage.
 */
// @ngInject
function Permissions(localStorage) {
  var self = this;

  function defaultLevel() {
    var savedLevel = localStorage.getItem(STORAGE_KEY);
    switch (savedLevel) {
      case 'private':
      case 'shared':
        return savedLevel;
      default:
        return 'shared';
    }
  }

  /**
   * Return the permissions for a private annotation.
   *
   * A private annotation is one which is readable only by its author.
   *
   * @param {string} userid - User ID of the author
   * @return {Permissions}
   */
  this.private = function (userid) {
    return {
      read: [userid],
      update: [userid],
      delete: [userid]
    };
  };

  /**
   * Return the permissions for an annotation that is shared with the given
   * group.
   *
   * @param {string} userid - User ID of the author
   * @param {string} groupId - ID of the group the annotation is being
   * shared with
   * @return {Permissions}
   */
  this.shared = function (userid, groupId) {
    return Object.assign(self.private(userid), {
      read: ['group:' + groupId]
    });
  };

  /**
   * Return the default permissions for an annotation in a given group.
   *
   * @param {string} userid - User ID of the author
   * @param {string} groupId - ID of the group the annotation is being shared
   * with
   * @return {Permissions}
   */
  this.default = function (userid, groupId) {
    if (defaultLevel() === 'private') {
      return self.private(userid);
    } else {
      return self.shared(userid, groupId);
    }
  };

  /**
   * Set the default permissions for new annotations.
   *
   * @param {'private'|'shared'} level
   */
  this.setDefault = function (level) {
    localStorage.setItem(STORAGE_KEY, level);
  };

  /**
   * Return true if an annotation with the given permissions is shared with any
   * group.
   *
   * @param {Permissions} perms
   * @return {boolean}
   */
  this.isShared = function (perms) {
    return perms.read.some(function (principal) {
      return principal.indexOf('group:') === 0;
    });
  };

  /**
   * Return true if a user can perform the given `action` on an annotation.
   *
   * @param {Permissions} perms
   * @param {'update'|'delete'} action
   * @param {string} userid
   * @return {boolean}
   */
  this.permits = function (perms, action, userid) {
    return perms[action].indexOf(userid) !== -1;
  };
}

module.exports = Permissions;

},{}],113:[function(require,module,exports){
var QueryParser,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports = QueryParser = (function() {
  function QueryParser() {
    this.populateFilter = bind(this.populateFilter, this);
  }

  QueryParser.prototype.rules = {
    user: {
      path: '/user',
      and_or: 'or'
    },
    text: {
      path: '/text',
      and_or: 'and'
    },
    tag: {
      path: '/tags',
      and_or: 'and'
    },
    quote: {
      path: '/quote',
      and_or: 'and'
    },
    uri: {
      formatter: function(uri) {
        return uri.toLowerCase();
      },
      path: '/uri',
      and_or: 'or',
      options: {
        es: {
          query_type: 'match',
          cutoff_frequency: 0.001,
          and_or: 'and'
        }
      }
    },
    since: {
      formatter: function(past) {
        var seconds;
        seconds = (function() {
          switch (past) {
            case '5 min':
              return 5 * 60;
            case '30 min':
              return 30 * 60;
            case '1 hour':
              return 60 * 60;
            case '12 hours':
              return 12 * 60 * 60;
            case '1 day':
              return 24 * 60 * 60;
            case '1 week':
              return 7 * 24 * 60 * 60;
            case '1 month':
              return 30 * 24 * 60 * 60;
            case '1 year':
              return 365 * 24 * 60 * 60;
          }
        })();
        return new Date(new Date().valueOf() - seconds * 1000);
      },
      path: '/created',
      and_or: 'and',
      operator: 'ge'
    },
    any: {
      and_or: 'and',
      path: ['/quote', '/tags', '/text', '/uri', '/user'],
      options: {
        es: {
          query_type: 'multi_match',
          match_type: 'cross_fields',
          and_or: 'and',
          fields: ['quote', 'tags', 'text', 'uri.parts', 'user']
        }
      }
    }
  };

  QueryParser.prototype.populateFilter = function(filter, query) {
    var and_or, case_sensitive, category, i, len, mapped_field, oper_part, results, rule, t, term, terms, val, value, value_part;
    results = [];
    for (category in query) {
      value = query[category];
      if (this.rules[category] == null) {
        continue;
      }
      terms = value.terms;
      if (!terms.length) {
        continue;
      }
      rule = this.rules[category];
      case_sensitive = rule.case_sensitive != null ? rule.case_sensitive : false;
      and_or = rule.and_or != null ? rule.and_or : 'or';
      mapped_field = rule.path != null ? rule.path : '/' + category;
      if (and_or === 'or') {
        oper_part = rule.operator != null ? rule.operator : 'match_of';
        value_part = [];
        for (i = 0, len = terms.length; i < len; i++) {
          term = terms[i];
          t = rule.formatter ? rule.formatter(term) : term;
          value_part.push(t);
        }
        results.push(filter.addClause(mapped_field, oper_part, value_part, case_sensitive, rule.options));
      } else {
        oper_part = rule.operator != null ? rule.operator : 'matches';
        results.push((function() {
          var j, len1, results1;
          results1 = [];
          for (j = 0, len1 = terms.length; j < len1; j++) {
            val = terms[j];
            value_part = rule.formatter ? rule.formatter(val) : val;
            results1.push(filter.addClause(mapped_field, oper_part, value_part, case_sensitive, rule.options));
          }
          return results1;
        })());
      }
    }
    return results;
  };

  return QueryParser;

})();


},{}],114:[function(require,module,exports){
'use strict';

/**
 * This module configures Raven for reporting crashes
 * to Sentry.
 *
 * Logging requires the Sentry DSN and Hypothesis
 * version to be provided via the app's settings object.
 *
 * It also exports an Angular module via angularModule() which integrates
 * error logging into any Angular application that it is added to
 * as a dependency.
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Raven = require('raven-js');

// This is only used in apps where Angular is used,
// but is required globally due to
// https://github.com/thlorenz/proxyquireify/issues/40
//
// Fortunately it does not pull in Angular as a dependency but returns
// a function that takes it as an input argument.
var angularPlugin = require('raven-js/plugins/angular');

/**
 * Returns the input URL if it is an HTTP URL or the filename part of the URL
 * otherwise.
 *
 * @param {string} url - The script URL associated with an exception stack
 *                       frame.
 */
function convertLocalURLsToFilenames(url) {
  if (!url) {
    return url;
  }

  if (url.match(/https?:/)) {
    return url;
  }

  // Strip the query string (which is used as a cache buster)
  // and extract the filename from the URL
  return url.replace(/\?.*/, '').split('/').slice(-1)[0];
}

/**
 * Return a transformed version of `data` with local URLs replaced
 * with filenames.
 *
 * In environments where the client is served from a local URL,
 * eg. chrome-extension://<ID>/scripts/bundle.js, the script URL
 * and the sourcemap it references will not be accessible to Sentry.
 *
 * Therefore on the client we replace references to such URLs with just
 * the filename part and then as part of the release process, upload both
 * the source file and the source map to Sentry.
 *
 * Using just the filename allows us to upload a single set of source files
 * and sourcemaps for a release though a given release of H might be served
 * from multiple actual URLs (eg. different browser extensions).
 */
function translateSourceURLs(data) {
  try {
    var frames = data.exception.values[0].stacktrace.frames;
    frames.forEach(function (frame) {
      frame.filename = convertLocalURLsToFilenames(frame.filename);
    });
    data.culprit = frames[0].filename;
  } catch (err) {
    console.warn('Failed to normalize error stack trace', err, data);
  }
  return data;
}

function init(config) {
  Raven.config(config.dsn, {
    release: '1.64.0', // replaced by versionify
    dataCallback: translateSourceURLs
  }).install();
  installUnhandledPromiseErrorHandler();
}

function setUserInfo(info) {
  if (info) {
    Raven.setUserContext(info);
  } else {
    Raven.setUserContext();
  }
}

/**
 * Initializes and returns the Angular module which provides
 * a custom wrapper around Angular's $exceptionHandler service,
 * logging any exceptions passed to it using Sentry.
 *
 * This must be invoked _after_ Raven is configured using init().
 */
function angularModule(angular) {
  var prevCallback = Raven._globalOptions.dataCallback;
  angularPlugin(Raven, angular);

  // Hack: Ensure that both our data callback and the one provided by
  // the Angular plugin are run when submitting errors.
  //
  // The Angular plugin replaces any previously installed
  // data callback with its own which does not in turn call the
  // previously registered callback that we registered when calling
  // Raven.config().
  //
  // See https://github.com/getsentry/raven-js/issues/522
  var angularCallback = Raven._globalOptions.dataCallback;
  Raven.setDataCallback(function (data) {
    return angularCallback(prevCallback(data));
  });
  return angular.module('ngRaven');
}

/**
 * Report an error to Sentry.
 *
 * @param {Error} error - An error object describing what went wrong
 * @param {string} when - A string describing the context in which
 *                        the error occurred.
 * @param {Object} [context] - A JSON-serializable object containing additional
 *                             information which may be useful when
 *                             investigating the error.
 */
function report(error, when, context) {
  if (!(error instanceof Error)) {
    // If the passed object is not an Error, raven-js
    // will serialize it using toString() which produces unhelpful results
    // for objects that do not provide their own toString() implementations.
    //
    // If the error is a plain object or non-Error subclass with a message
    // property, such as errors returned by chrome.extension.lastError,
    // use that instead.
    if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error.message) {
      error = error.message;
    }
  }

  var extra = Object.assign({ when: when }, context);
  Raven.captureException(error, { extra: extra });
}

/**
 * Installs a handler to catch unhandled rejected promises.
 *
 * For this to work, the browser or the Promise polyfill must support
 * the unhandled promise rejection event (Chrome >= 49). On other browsers,
 * the rejections will simply go unnoticed. Therefore, app code _should_
 * always provide a .catch() handler on the top-most promise chain.
 *
 * See https://github.com/getsentry/raven-js/issues/424
 * and https://www.chromestatus.com/feature/4805872211460096
 *
 * It is possible that future versions of Raven JS may handle these events
 * automatically, in which case this code can simply be removed.
 */
function installUnhandledPromiseErrorHandler() {
  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason) {
      report(event.reason, 'Unhandled Promise rejection');
    }
  });
}

module.exports = {
  init: init,
  angularModule: angularModule,
  setUserInfo: setUserInfo,
  report: report
};

},{"raven-js":"raven-js","raven-js/plugins/angular":21}],115:[function(require,module,exports){
/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

'use strict';

var arrayUtil = require('../util/array-util');
var metadata = require('../annotation-metadata');
var uiConstants = require('../ui-constants');

var selection = require('./selection');
var util = require('./util');

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed.
 */
function excludeAnnotations(current, annotations) {
  var ids = {};
  var tags = {};
  annotations.forEach(function (annot) {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$tag) {
      tags[annot.$tag] = true;
    }
  });
  return current.filter(function (annot) {
    var shouldRemove = annot.id && annot.id in ids || annot.$tag && annot.$tag in tags;
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(function (annot) {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(function (annot) {
    return annot.$tag === tag;
  });
}

/**
 * Initialize the status flags and properties of a new annotation.
 */
function initializeAnnot(annotation, tag) {
  var orphan = annotation.$orphan;

  if (!annotation.id) {
    // Currently the user ID, permissions and group of new annotations are
    // initialized in the <annotation> component controller because the session
    // state and focused group are not stored in the Redux store. Once they are,
    // that initialization should be moved here.

    // New annotations must be anchored
    orphan = false;
  }

  return Object.assign({}, annotation, {
    // Flag indicating whether waiting for the annotation to anchor timed out.
    $anchorTimeout: false,
    $tag: annotation.$tag || tag,
    $orphan: orphan
  });
}

function init() {
  return {
    annotations: [],

    // The local tag to assign to the next annotation that is loaded into the
    // app
    nextTag: 1
  };
}

var update = {
  ADD_ANNOTATIONS: function ADD_ANNOTATIONS(state, action) {
    var updatedIDs = {};
    var updatedTags = {};

    var added = [];
    var unchanged = [];
    var updated = [];
    var nextTag = state.nextTag;

    action.annotations.forEach(function (annot) {
      var existing;
      if (annot.id) {
        existing = findByID(state.annotations, annot.id);
      }
      if (!existing && annot.$tag) {
        existing = findByTag(state.annotations, annot.$tag);
      }

      if (existing) {
        // Merge the updated annotation with the private fields from the local
        // annotation
        updated.push(Object.assign({}, existing, annot));
        if (annot.id) {
          updatedIDs[annot.id] = true;
        }
        if (existing.$tag) {
          updatedTags[existing.$tag] = true;
        }
      } else {
        added.push(initializeAnnot(annot, 't' + nextTag));
        ++nextTag;
      }
    });

    state.annotations.forEach(function (annot) {
      if (!updatedIDs[annot.id] && !updatedTags[annot.$tag]) {
        unchanged.push(annot);
      }
    });

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag: nextTag
    };
  },

  REMOVE_ANNOTATIONS: function REMOVE_ANNOTATIONS(state, action) {
    var annots = excludeAnnotations(state.annotations, action.annotations);
    var selectedTab = state.selectedTab;
    if (selectedTab === uiConstants.TAB_ORPHANS && arrayUtil.countIf(annots, metadata.isOrphan) === 0) {
      selectedTab = uiConstants.TAB_ANNOTATIONS;
    }

    var tabUpdateFn = selection.update.SELECT_TAB;
    return Object.assign({ annotations: annots }, tabUpdateFn(state, selection.actions.selectTab(selectedTab)));
  },

  CLEAR_ANNOTATIONS: function CLEAR_ANNOTATIONS() {
    return { annotations: [] };
  },

  UPDATE_FLAG_STATUS: function UPDATE_FLAG_STATUS(state, action) {
    var annotations = state.annotations.map(function (annot) {
      var match = annot.id && annot.id === action.id;
      if (match) {
        if (annot.flagged === action.isFlagged) {
          return annot;
        }

        var newAnn = Object.assign({}, annot, {
          flagged: action.isFlagged
        });
        if (newAnn.moderation) {
          var countDelta = action.isFlagged ? 1 : -1;
          newAnn.moderation = Object.assign({}, annot.moderation, {
            flagCount: annot.moderation.flagCount + countDelta
          });
        }
        return newAnn;
      } else {
        return annot;
      }
    });
    return { annotations: annotations };
  },

  UPDATE_ANCHOR_STATUS: function UPDATE_ANCHOR_STATUS(state, action) {
    var annotations = state.annotations.map(function (annot) {
      if (!action.statusUpdates.hasOwnProperty(annot.$tag)) {
        return annot;
      }

      var state = action.statusUpdates[annot.$tag];
      if (state === 'timeout') {
        return Object.assign({}, annot, { $anchorTimeout: true });
      } else {
        return Object.assign({}, annot, { $orphan: state === 'orphan' });
      }
    });
    return { annotations: annotations };
  },

  HIDE_ANNOTATION: function HIDE_ANNOTATION(state, action) {
    var anns = state.annotations.map(function (ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: true });
    });
    return { annotations: anns };
  },

  UNHIDE_ANNOTATION: function UNHIDE_ANNOTATION(state, action) {
    var anns = state.annotations.map(function (ann) {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  }
};

var actions = util.actionTypes(update);

/**
 * Updating the flagged status of an annotation.
 *
 * @param {string} id - Annotation ID
 * @param {boolean} isFlagged - The flagged status of the annotation. True if
 *        the user has flagged the annotation.
 *
 */
function updateFlagStatus(id, isFlagged) {
  return {
    type: actions.UPDATE_FLAG_STATUS,
    id: id,
    isFlagged: isFlagged
  };
}

/** Add annotations to the currently displayed set. */
function addAnnotations(annotations, now) {
  now = now || new Date();

  // Add dates to new annotations. These are ignored by the server but used
  // when sorting unsaved annotation cards.
  annotations = annotations.map(function (annot) {
    if (annot.id) {
      return annot;
    }
    return Object.assign({
      // Date.prototype.toISOString returns a 0-offset (UTC) ISO8601
      // datetime.
      created: now.toISOString(),
      updated: now.toISOString()
    }, annot);
  });

  return function (dispatch, getState) {
    var added = annotations.filter(function (annot) {
      return !findByID(getState().annotations, annot.id);
    });

    dispatch({
      type: actions.ADD_ANNOTATIONS,
      annotations: annotations
    });

    if (!getState().isSidebar) {
      return;
    }

    // If anchoring fails to complete in a reasonable amount of time, then
    // we assume that the annotation failed to anchor. If it does later
    // successfully anchor then the status will be updated.
    var ANCHORING_TIMEOUT = 500;

    var anchoringIDs = added.filter(metadata.isWaitingToAnchor).map(function (ann) {
      return ann.id;
    });
    if (anchoringIDs.length > 0) {
      setTimeout(function () {
        // Find annotations which haven't yet been anchored in the document.
        var anns = getState().annotations;
        var annsStillAnchoring = anchoringIDs.map(function (id) {
          return findByID(anns, id);
        }).filter(function (ann) {
          return ann && metadata.isWaitingToAnchor(ann);
        });

        // Mark anchoring as timed-out for these annotations.
        var anchorStatusUpdates = annsStillAnchoring.reduce(function (updates, ann) {
          updates[ann.$tag] = 'timeout';
          return updates;
        }, {});
        dispatch(updateAnchorStatus(anchorStatusUpdates));
      }, ANCHORING_TIMEOUT);
    }
  };
}

/** Remove annotations from the currently displayed set. */
function removeAnnotations(annotations) {
  return {
    type: actions.REMOVE_ANNOTATIONS,
    annotations: annotations
  };
}

/** Set the currently displayed annotations to the empty set. */
function clearAnnotations() {
  return { type: actions.CLEAR_ANNOTATIONS };
}

/**
 * Update the anchoring status of an annotation.
 *
 * @param {{ [tag: string]: 'anchored'|'orphan'|'timeout'} } statusUpdates - A map of annotation tag to orphan status
 */
function updateAnchorStatus(statusUpdates) {
  return {
    type: actions.UPDATE_ANCHOR_STATUS,
    statusUpdates: statusUpdates
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been hidden from
 * non-moderators.
 */
function hideAnnotation(id) {
  return {
    type: actions.HIDE_ANNOTATION,
    id: id
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been made visible
 * to non-moderators.
 */
function unhideAnnotation(id) {
  return {
    type: actions.UNHIDE_ANNOTATION,
    id: id
  };
}

/**
 * Return all loaded annotations which have been saved to the server.
 *
 * @param {state} - The global app state
 */
function savedAnnotations(state) {
  return state.annotations.filter(function (ann) {
    return !metadata.isNew(ann);
  });
}

/** Return true if the annotation with a given ID is currently loaded. */
function annotationExists(state, id) {
  return state.annotations.some(function (annot) {
    return annot.id === id;
  });
}

/**
 * Return the IDs of annotations that correspond to `tags`.
 *
 * If an annotation does not have an ID because it has not been created on
 * the server, there will be no entry for it in the returned array.
 *
 * @param {string[]} Local tags of annotations to look up
 */
function findIDsForTags(state, tags) {
  var ids = [];
  tags.forEach(function (tag) {
    var annot = findByTag(state.annotations, tag);
    if (annot && annot.id) {
      ids.push(annot.id);
    }
  });
  return ids;
}

/**
 * Return the annotation with the given ID.
 */
function findAnnotationByID(state, id) {
  return findByID(state.annotations, id);
}

module.exports = {
  init: init,
  update: update,
  actions: {
    addAnnotations: addAnnotations,
    clearAnnotations: clearAnnotations,
    removeAnnotations: removeAnnotations,
    updateAnchorStatus: updateAnchorStatus,
    updateFlagStatus: updateFlagStatus,
    hideAnnotation: hideAnnotation,
    unhideAnnotation: unhideAnnotation
  },

  // Selectors
  annotationExists: annotationExists,
  findAnnotationByID: findAnnotationByID,
  findIDsForTags: findIDsForTags,
  savedAnnotations: savedAnnotations
};

},{"../annotation-metadata":53,"../ui-constants":169,"../util/array-util":172,"./selection":120,"./util":122}],116:[function(require,module,exports){
'use strict';

/**
 * A debug utility that prints information about internal application state
 * changes to the console.
 *
 * Debugging is enabled by setting `window.debug` to a truthy value.
 *
 * When enabled, every action that changes application state will be printed
 * to the console, along with the application state before and after the action
 * was handled.
 */

function debugMiddleware(store) {
  /* eslint-disable no-console */
  var serial = 0;

  return function (next) {
    return function (action) {
      if (!window.debug) {
        next(action);
        return;
      }

      ++serial;

      var groupTitle = action.type + ' (' + serial.toString() + ')';
      console.group(groupTitle);
      console.log('Prev State:', store.getState());
      console.log('Action:', action);

      next(action);

      console.log('Next State:', store.getState());
      console.groupEnd(groupTitle);
    };
  };
  /* eslint-enable no-console */
}

module.exports = debugMiddleware;

},{}],117:[function(require,module,exports){
'use strict';

var util = require('./util');

function init() {
  return {
    // The list of frames connected to the sidebar app
    frames: []
  };
}

var update = {
  CONNECT_FRAME: function CONNECT_FRAME(state, action) {
    return { frames: state.frames.concat(action.frame) };
  },

  DESTROY_FRAME: function DESTROY_FRAME(state, action) {
    return {
      frames: state.frames.filter(function (f) {
        return f !== action.frame;
      })
    };
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function UPDATE_FRAME_ANNOTATION_FETCH_STATUS(state, action) {
    var frames = state.frames.map(function (frame) {
      var match = frame.uri && frame.uri === action.uri;
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete
        });
      } else {
        return frame;
      }
    });
    return {
      frames: frames
    };
  }
};

var actions = util.actionTypes(update);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 */
function connectFrame(frame) {
  return { type: actions.CONNECT_FRAME, frame: frame };
}

/**
 * Remove a frame from the list of frames currently connected to the sidebar app.
 */
function destroyFrame(frame) {
  return { type: actions.DESTROY_FRAME, frame: frame };
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 */
function updateFrameAnnotationFetchStatus(uri, status) {
  return {
    type: actions.UPDATE_FRAME_ANNOTATION_FETCH_STATUS,
    isAnnotationFetchComplete: status,
    uri: uri
  };
}

/**
 * Return the list of frames currently connected to the sidebar app.
 */
function frames(state) {
  return state.frames;
}

function searchUrisForFrame(frame) {
  var uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(function (link) {
      return link.href;
    });
  }

  if (frame.metadata && frame.metadata.link) {
    frame.metadata.link.forEach(function (link) {
      if (link.href.startsWith('doi:')) {
        uris.push(link.href);
      }
    });
  }

  return uris;
}

/**
 * Return the set of URIs that should be used to search for annotations on the
 * current page.
 */
function searchUris(state) {
  return state.frames.reduce(function (uris, frame) {
    return uris.concat(searchUrisForFrame(frame));
  }, []);
}

module.exports = {
  init: init,
  update: update,

  actions: {
    connectFrame: connectFrame,
    destroyFrame: destroyFrame,
    updateFrameAnnotationFetchStatus: updateFrameAnnotationFetchStatus
  },

  // Selectors
  frames: frames,
  searchUris: searchUris
};

},{"./util":122}],118:[function(require,module,exports){
'use strict';

/**
 * This module defines the main update function (or 'reducer' in Redux's
 * terminology) that handles app state updates. For an overview of how state
 * management in Redux works, see the comments at the top of `annotation-ui.js`
 *
 * Each sub-module in this folder defines:
 *
 *  - An `init` function that returns the initial state relating to some aspect
 *    of the application
 *  - An `update` object mapping action types to a state update function for
 *    that action
 *  - A set of action creators - functions that return actions that can then
 *    be passed to `store.dispatch()`
 *  - A set of selectors - Utility functions that calculate some derived data
 *    from the state
 */

var annotations = require('./annotations');
var frames = require('./frames');
var links = require('./links');
var selection = require('./selection');
var session = require('./session');
var viewer = require('./viewer');
var util = require('./util');

function init(settings) {
  return Object.assign({}, annotations.init(), frames.init(), links.init(), selection.init(settings), session.init(), viewer.init());
}

var update = util.createReducer(Object.assign(annotations.update, frames.update, links.update, selection.update, session.update, viewer.update));

module.exports = {
  init: init,
  update: update
};

},{"./annotations":115,"./frames":117,"./links":119,"./selection":120,"./session":121,"./util":122,"./viewer":123}],119:[function(require,module,exports){
/**
 * Reducer for storing a "links" object in the Redux state store.
 *
 * The links object is initially null, and can only be updated by completely
 * replacing it with a new links object.
 *
 * Used by serviceUrl.
 */

'use strict';

/** Return the initial links. */

function init() {
  return { links: null };
}

/** Return updated links based on the given current state and action object. */
function updateLinks(state, action) {
  return { links: action.newLinks };
}

/** Return an action object for updating the links to the given newLinks. */
function updateLinksAction(newLinks) {
  return { type: 'UPDATE_LINKS', newLinks: newLinks };
}

module.exports = {
  init: init,
  update: { UPDATE_LINKS: updateLinks },
  actions: { updateLinks: updateLinksAction }
};

},{}],120:[function(require,module,exports){
/**
 * This module handles state related to the current sort, search and filter
 * settings in the UI, including:
 *
 * - The set of annotations that are currently focused (hovered) or selected
 * - The selected tab
 * - The current sort order
 * - The current filter query
 */

'use strict';

var immutable = require('seamless-immutable');

var toSet = require('../util/array-util').toSet;
var uiConstants = require('../ui-constants');

var util = require('./util');

/**
* Default starting tab.
*/
var TAB_DEFAULT = uiConstants.TAB_ANNOTATIONS;

/**
 * Default sort keys for each tab.
 */
var TAB_SORTKEY_DEFAULT = {};
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ANNOTATIONS] = 'Location';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_NOTES] = 'Oldest';
TAB_SORTKEY_DEFAULT[uiConstants.TAB_ORPHANS] = 'Location';

/**
 * Available sort keys for each tab.
 */
var TAB_SORTKEYS_AVAILABLE = {};
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ANNOTATIONS] = ['Newest', 'Oldest', 'Location'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_NOTES] = ['Newest', 'Oldest'];
TAB_SORTKEYS_AVAILABLE[uiConstants.TAB_ORPHANS] = ['Newest', 'Oldest', 'Location'];

function initialSelection(settings) {
  var selection = {};
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return freeze(selection);
}

function freeze(selection) {
  if (Object.keys(selection).length) {
    return immutable(selection);
  } else {
    return null;
  }
}

function init(settings) {
  return {
    // Contains a map of annotation tag:true pairs.
    focusedAnnotationMap: null,

    // Contains a map of annotation id:true pairs.
    selectedAnnotationMap: initialSelection(settings),

    // Map of annotation IDs to expanded/collapsed state. For annotations not
    // present in the map, the default state is used which depends on whether
    // the annotation is a top-level annotation or a reply, whether it is
    // selected and whether it matches the current filter.
    expanded: initialSelection(settings) || {},

    // Set of IDs of annotations that have been explicitly shown
    // by the user even if they do not match the current search filter
    forceVisible: {},

    // IDs of annotations that should be highlighted
    highlighted: [],

    filterQuery: settings.query || null,

    selectedTab: TAB_DEFAULT,

    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT[TAB_DEFAULT],
    // Keys by which annotations can be sorted.
    sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[TAB_DEFAULT]
  };
}

var update = {
  CLEAR_SELECTION: function CLEAR_SELECTION() {
    return { filterQuery: null, selectedAnnotationMap: null };
  },

  SELECT_ANNOTATIONS: function SELECT_ANNOTATIONS(state, action) {
    return { selectedAnnotationMap: action.selection };
  },

  FOCUS_ANNOTATIONS: function FOCUS_ANNOTATIONS(state, action) {
    return { focusedAnnotationMap: action.focused };
  },

  SET_FORCE_VISIBLE: function SET_FORCE_VISIBLE(state, action) {
    return { forceVisible: action.forceVisible };
  },

  SET_EXPANDED: function SET_EXPANDED(state, action) {
    return { expanded: action.expanded };
  },

  HIGHLIGHT_ANNOTATIONS: function HIGHLIGHT_ANNOTATIONS(state, action) {
    return { highlighted: action.highlighted };
  },

  SELECT_TAB: function SELECT_TAB(state, action) {
    // Do nothing if the "new tab" is not a valid tab.
    if ([uiConstants.TAB_ANNOTATIONS, uiConstants.TAB_NOTES, uiConstants.TAB_ORPHANS].indexOf(action.tab) === -1) {
      return {};
    }
    // Shortcut if the tab is already correct, to avoid resetting the sortKey
    // unnecessarily.
    if (state.selectedTab === action.tab) {
      return {};
    }
    return {
      selectedTab: action.tab,
      sortKey: TAB_SORTKEY_DEFAULT[action.tab],
      sortKeysAvailable: TAB_SORTKEYS_AVAILABLE[action.tab]
    };
  },

  SET_FILTER_QUERY: function SET_FILTER_QUERY(state, action) {
    return {
      filterQuery: action.query,
      forceVisible: {},
      expanded: {}
    };
  },

  SET_SORT_KEY: function SET_SORT_KEY(state, action) {
    return { sortKey: action.key };
  }
};

var actions = util.actionTypes(update);

function select(annotations) {
  return {
    type: actions.SELECT_ANNOTATIONS,
    selection: freeze(annotations)
  };
}

/**
 * Set the currently selected annotation IDs.
 */
function selectAnnotations(ids) {
  return select(toSet(ids));
}

/** Toggle whether annotations are selected or not. */
function toggleSelectedAnnotations(ids) {
  return function (dispatch, getState) {
    var selection = Object.assign({}, getState().selectedAnnotationMap);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (selection[id]) {
        delete selection[id];
      } else {
        selection[id] = true;
      }
    }
    dispatch(select(selection));
  };
}

/**
 * Sets whether a given annotation should be visible, even if it does not
 * match the current search query.
 *
 * @param {string} id - Annotation ID
 * @param {boolean} visible
 */
function setForceVisible(id, visible) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function (dispatch, getState) {
    var forceVisible = Object.assign({}, getState().forceVisible);
    forceVisible[id] = visible;
    dispatch({
      type: actions.SET_FORCE_VISIBLE,
      forceVisible: forceVisible
    });
  };
}

/**
 * Sets which annotations are currently focused.
 *
 * @param {Array<string>} Tags of annotations to focus
 */
function focusAnnotations(tags) {
  return {
    type: actions.FOCUS_ANNOTATIONS,
    focused: freeze(toSet(tags))
  };
}

function setCollapsed(id, collapsed) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function (dispatch, getState) {
    var expanded = Object.assign({}, getState().expanded);
    expanded[id] = !collapsed;
    dispatch({
      type: actions.SET_EXPANDED,
      expanded: expanded
    });
  };
}

/**
 * Highlight annotations with the given `ids`.
 *
 * This is used to indicate the specific annotation in a thread that was
 * linked to for example.
 */
function highlightAnnotations(ids) {
  return {
    type: actions.HIGHLIGHT_ANNOTATIONS,
    highlighted: ids
  };
}

/** Set the type annotations to be displayed. */
function selectTab(type) {
  return {
    type: actions.SELECT_TAB,
    tab: type
  };
}

/** Set the query used to filter displayed annotations. */
function setFilterQuery(query) {
  return {
    type: actions.SET_FILTER_QUERY,
    query: query
  };
}

/** Sets the sort key for the annotation list. */
function setSortKey(key) {
  return {
    type: actions.SET_SORT_KEY,
    key: key
  };
}

/**
 * Returns true if the annotation with the given `id` is selected.
 */
function isAnnotationSelected(state, id) {
  return (state.selectedAnnotationMap || {}).hasOwnProperty(id);
}

/**
 * Return true if any annotations are currently selected.
 */
function hasSelectedAnnotations(state) {
  return !!state.selectedAnnotationMap;
}

/** De-select an annotation. */
function removeSelectedAnnotation(id) {
  // FIXME: This should be converted to a plain action and accessing the state
  // should happen in the update() function
  return function (dispatch, getState) {
    var selection = Object.assign({}, getState().selectedAnnotationMap);
    if (!selection || !id) {
      return;
    }
    delete selection[id];
    dispatch(select(selection));
  };
}

/** De-select all annotations. */
function clearSelectedAnnotations() {
  return { type: actions.CLEAR_SELECTION };
}

module.exports = {
  init: init,
  update: update,

  actions: {
    clearSelectedAnnotations: clearSelectedAnnotations,
    focusAnnotations: focusAnnotations,
    highlightAnnotations: highlightAnnotations,
    removeSelectedAnnotation: removeSelectedAnnotation,
    selectAnnotations: selectAnnotations,
    selectTab: selectTab,
    setCollapsed: setCollapsed,
    setFilterQuery: setFilterQuery,
    setForceVisible: setForceVisible,
    setSortKey: setSortKey,
    toggleSelectedAnnotations: toggleSelectedAnnotations
  },

  // Selectors
  hasSelectedAnnotations: hasSelectedAnnotations,
  isAnnotationSelected: isAnnotationSelected
};

},{"../ui-constants":169,"../util/array-util":172,"./util":122,"seamless-immutable":36}],121:[function(require,module,exports){
'use strict';

var util = require('./util');

function init() {
  return {
    /**
     * The state of the user's login session.
     *
     * This includes their user ID, set of enabled features, and the list of
     * groups they are a member of.
     */
    session: {
      /** A map of features that are enabled for the current user. */
      features: {},
      /** List of groups that the current user is a member of. */
      groups: [],
      /** A map of preference names and values. */
      preferences: {},
      /**
       * The authenticated user ID or null if the user is not logged in.
       */
      userid: null
    }
  };
}

var update = {
  UPDATE_SESSION: function UPDATE_SESSION(state, action) {
    return {
      session: action.session
    };
  }
};

var actions = util.actionTypes(update);

/**
 * Update the session state.
 */
function updateSession(session) {
  return {
    type: actions.UPDATE_SESSION,
    session: session
  };
}

/**
 * Return true if a given feature flag is enabled.
 *
 * @param {object} state - The application state
 * @param {string} feature - The name of the feature flag. This matches the
 *        name of the feature flag as declared in the Hypothesis service.
 */
function isFeatureEnabled(state, feature) {
  return !!state.session.features[feature];
}

/**
 * Return the user's profile.
 *
 * Returns the current user's profile fetched from the `/api/profile` endpoint.
 */
function profile(state) {
  return state.session;
}

module.exports = {
  init: init,
  update: update,

  actions: {
    updateSession: updateSession
  },

  // Selectors
  isFeatureEnabled: isFeatureEnabled,
  profile: profile
};

},{"./util":122}],122:[function(require,module,exports){
'use strict';

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 */

function actionTypes(updateFns) {
  return Object.keys(updateFns).reduce(function (types, key) {
    types[key] = key;
    return types;
  }, {});
}

/**
 * Given an object which maps action names to update functions, this returns
 * a reducer function that can be passed to the redux `createStore` function.
 */
function createReducer(updateFns) {
  return function (state, action) {
    var fn = updateFns[action.type];
    if (!fn) {
      return state;
    }
    return Object.assign({}, state, fn(state, action));
  };
}

/**
 * Takes an object mapping keys to selector functions and the `getState()`
 * function from the store and returns an object with the same keys but where
 * the values are functions that call the original functions with the `state`
 * argument set to the current value of `getState()`
 */
function bindSelectors(selectors, getState) {
  return Object.keys(selectors).reduce(function (bound, key) {
    var selector = selectors[key];
    bound[key] = function () {
      var args = [].slice.apply(arguments);
      args.unshift(getState());
      return selector.apply(null, args);
    };
    return bound;
  }, {});
}

module.exports = {
  actionTypes: actionTypes,
  bindSelectors: bindSelectors,
  createReducer: createReducer
};

},{}],123:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

function init() {
  return {
    // Flag that indicates whether the app is the sidebar and connected to
    // a page where annotations are being shown in context
    isSidebar: true,

    visibleHighlights: false
  };
}

var update = {
  SET_SIDEBAR: function SET_SIDEBAR(state, action) {
    return { isSidebar: action.isSidebar };
  },
  SET_HIGHLIGHTS_VISIBLE: function SET_HIGHLIGHTS_VISIBLE(state, action) {
    return { visibleHighlights: action.visible };
  }
};

var actions = util.actionTypes(update);

/** Set whether the app is the sidebar */
function setAppIsSidebar(isSidebar) {
  return { type: actions.SET_SIDEBAR, isSidebar: isSidebar };
}

/**
 * Sets whether annotation highlights in connected documents are shown
 * or not.
 */
function setShowHighlights(show) {
  return { type: actions.SET_HIGHLIGHTS_VISIBLE, visible: show };
}

/**
 * Returns true if the app is being used as the sidebar in the annotation
 * client, as opposed to the standalone annotation page or stream views.
 */
function isSidebar(state) {
  return state.isSidebar;
}

module.exports = {
  init: init,
  update: update,
  actions: {
    setAppIsSidebar: setAppIsSidebar,
    setShowHighlights: setShowHighlights
  },

  // Selectors
  isSidebar: isSidebar
};

},{"./util":122}],124:[function(require,module,exports){
'use strict';

var escapeHtml = require('escape-html');
var katex = require('katex');
var showdown = require('showdown');

function targetBlank() {
  function filter(text) {
    return text.replace(/<a href=/g, '<a target="_blank" href=');
  }
  return [{ type: 'output', filter: filter }];
}

var converter;

function renderMarkdown(markdown) {
  if (!converter) {
    // see https://github.com/showdownjs/showdown#valid-options
    converter = new showdown.Converter({
      extensions: [targetBlank],
      simplifiedAutoLink: true,
      // Since we're using simplifiedAutoLink we also use
      // literalMidWordUnderscores because otherwise _'s in URLs get
      // transformed into <em>'s.
      // See https://github.com/showdownjs/showdown/issues/211
      literalMidWordUnderscores: true
    });
  }
  return converter.makeHtml(markdown);
}

function mathPlaceholder(id) {
  return '{math:' + id.toString() + '}';
}

/**
 * Parses a string containing mixed markdown and LaTeX in between
 * '$$..$$' or '\( ... \)' delimiters and returns an object containing a
 * list of math blocks found in the string, plus the input string with math
 * blocks replaced by placeholders.
 */
function extractMath(content) {
  var mathBlocks = [];
  var pos = 0;
  var replacedContent = content;

  while (true) {
    // eslint-disable-line no-constant-condition
    var blockMathStart = replacedContent.indexOf('$$', pos);
    var inlineMathStart = replacedContent.indexOf('\\(', pos);

    if (blockMathStart === -1 && inlineMathStart === -1) {
      break;
    }

    var mathStart;
    var mathEnd;
    if (blockMathStart !== -1 && (inlineMathStart === -1 || blockMathStart < inlineMathStart)) {
      mathStart = blockMathStart;
      mathEnd = replacedContent.indexOf('$$', mathStart + 2);
    } else {
      mathStart = inlineMathStart;
      mathEnd = replacedContent.indexOf('\\)', mathStart + 2);
    }

    if (mathEnd === -1) {
      break;
    } else {
      mathEnd = mathEnd + 2;
    }

    var id = mathBlocks.length + 1;
    var placeholder = mathPlaceholder(id);
    mathBlocks.push({
      id: id,
      expression: replacedContent.slice(mathStart + 2, mathEnd - 2),
      inline: inlineMathStart !== -1
    });

    var replacement;
    if (inlineMathStart !== -1) {
      replacement = placeholder;
    } else {
      // Add new lines before and after math blocks so that they render
      // as separate paragraphs
      replacement = '\n\n' + placeholder + '\n\n';
    }

    replacedContent = replacedContent.slice(0, mathStart) + replacement + replacedContent.slice(mathEnd);
    pos = mathStart + replacement.length;
  }

  return {
    mathBlocks: mathBlocks,
    content: replacedContent
  };
}

function insertMath(html, mathBlocks) {
  return mathBlocks.reduce(function (html, block) {
    var renderedMath;
    try {
      if (block.inline) {
        renderedMath = katex.renderToString(block.expression);
      } else {
        renderedMath = katex.renderToString(block.expression, {
          displayMode: true
        });
      }
    } catch (err) {
      renderedMath = escapeHtml(block.expression);
    }
    return html.replace(mathPlaceholder(block.id), renderedMath);
  }, html);
}

function renderMathAndMarkdown(markdown, sanitizeFn) {
  // KaTeX takes care of escaping its input, so we want to avoid passing its
  // output through the HTML sanitizer. Therefore we first extract the math
  // blocks from the input, render and sanitize the remaining markdown and then
  // render and re-insert the math blocks back into the output.
  var mathInfo = extractMath(markdown);
  var markdownHTML = sanitizeFn(renderMarkdown(mathInfo.content));
  var mathAndMarkdownHTML = insertMath(markdownHTML, mathInfo.mathBlocks);
  return mathAndMarkdownHTML;
}

module.exports = renderMathAndMarkdown;

},{"escape-html":3,"katex":"katex","showdown":"showdown"}],125:[function(require,module,exports){
'use strict';

var retry = require('retry');

/**
 * Retry a Promise-returning operation until it succeeds or
 * fails after a set number of attempts.
 *
 * @param {Function} opFn - The operation to retry
 * @param {Object} options - The options object to pass to retry.operation()
 *
 * @return A promise for the first successful result of the operation, if
 *         it succeeds within the allowed number of attempts.
 */
function retryPromiseOperation(opFn, options) {
  return new Promise(function (resolve, reject) {
    var operation = retry.operation(options);
    operation.attempt(function () {
      opFn().then(function (result) {
        operation.retry();
        resolve(result);
      }).catch(function (err) {
        if (!operation.retry(err)) {
          reject(err);
        }
      });
    });
  });
}

module.exports = {
  retryPromiseOperation: retryPromiseOperation
};

},{"retry":32}],126:[function(require,module,exports){
'use strict';

RootThread.$inject = ["$rootScope", "annotationUI", "drafts", "searchFilter", "viewFilter"];
var buildThread = require('./build-thread');
var events = require('./events');
var memoize = require('./util/memoize');
var metadata = require('./annotation-metadata');
var tabs = require('./tabs');
var uiConstants = require('./ui-constants');

function truthyKeys(map) {
  return Object.keys(map).filter(function (k) {
    return !!map[k];
  });
}

// Mapping from sort order name to a less-than predicate
// function for comparing annotations to determine their sort order.
var sortFns = {
  'Newest': function Newest(a, b) {
    return a.updated > b.updated;
  },
  'Oldest': function Oldest(a, b) {
    return a.updated < b.updated;
  },
  'Location': function Location(a, b) {
    return metadata.location(a) < metadata.location(b);
  }
};

/**
 * Root conversation thread for the sidebar and stream.
 *
 * This performs two functions:
 *
 * 1. It listens for annotations being loaded, created and unloaded and
 *    dispatches annotationUI.{addAnnotations|removeAnnotations} actions.
 * 2. Listens for changes in the UI state and rebuilds the root conversation
 *    thread.
 *
 * The root thread is then displayed by viewer.html
 */
// @ngInject
function RootThread($rootScope, annotationUI, drafts, searchFilter, viewFilter) {

  /**
   * Build the root conversation thread from the given UI state.
   *
   * @param state - The current UI state (loaded annotations, sort mode,
   *        filter settings etc.)
   */
  function buildRootThread(state) {
    var sortFn = sortFns[state.sortKey];

    var filterFn;
    if (state.filterQuery) {
      var filters = searchFilter.generateFacetedFilter(state.filterQuery);
      filterFn = function filterFn(annot) {
        return viewFilter.filter([annot], filters).length > 0;
      };
    }

    var threadFilterFn;
    if (state.isSidebar && !state.filterQuery) {
      threadFilterFn = function threadFilterFn(thread) {
        if (!thread.annotation) {
          return false;
        }

        return tabs.shouldShowInTab(thread.annotation, state.selectedTab);
      };
    }

    // Get the currently loaded annotations and the set of inputs which
    // determines what is visible and build the visible thread structure
    return buildThread(state.annotations, {
      forceVisible: truthyKeys(state.forceVisible),
      expanded: state.expanded,
      highlighted: state.highlighted,
      selected: truthyKeys(state.selectedAnnotationMap || {}),
      sortCompareFn: sortFn,
      filterFn: filterFn,
      threadFilterFn: threadFilterFn
    });
  }

  function deleteNewAndEmptyAnnotations() {
    annotationUI.getState().annotations.filter(function (ann) {
      return metadata.isNew(ann) && !drafts.getIfNotEmpty(ann);
    }).forEach(function (ann) {
      drafts.remove(ann);
      $rootScope.$broadcast(events.ANNOTATION_DELETED, ann);
    });
  }

  // Listen for annotations being created or loaded
  // and show them in the UI.
  //
  // Note: These events could all be converted into actions that are handled by
  // the Redux store in annotationUI.
  var loadEvents = [events.ANNOTATION_CREATED, events.ANNOTATION_UPDATED, events.ANNOTATIONS_LOADED];
  loadEvents.forEach(function (event) {
    $rootScope.$on(event, function (event, annotation) {
      annotationUI.addAnnotations([].concat(annotation));
    });
  });

  $rootScope.$on(events.BEFORE_ANNOTATION_CREATED, function (event, ann) {
    // When a new annotation is created, remove any existing annotations
    // that are empty.
    deleteNewAndEmptyAnnotations();

    annotationUI.addAnnotations([ann]);

    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(ann)) {
      annotationUI.selectTab(uiConstants.TAB_NOTES);
    } else if (metadata.isAnnotation(ann)) {
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
    }

    (ann.references || []).forEach(function (parent) {
      annotationUI.setCollapsed(parent, false);
    });
  });

  // Remove any annotations that are deleted or unloaded
  $rootScope.$on(events.ANNOTATION_DELETED, function (event, annotation) {
    annotationUI.removeAnnotations([annotation]);
    if (annotation.id) {
      annotationUI.removeSelectedAnnotation(annotation.id);
    }
  });
  $rootScope.$on(events.ANNOTATIONS_UNLOADED, function (event, annotations) {
    annotationUI.removeAnnotations(annotations);
  });

  // Once the focused group state is moved to the app state store, then the
  // logic in this event handler can be moved to the annotations reducer.
  $rootScope.$on(events.GROUP_FOCUSED, function (event, focusedGroupId) {
    var updatedAnnots = annotationUI.getState().annotations.filter(function (ann) {
      return metadata.isNew(ann) && !metadata.isReply(ann);
    }).map(function (ann) {
      return Object.assign(ann, {
        group: focusedGroupId
      });
    });
    if (updatedAnnots.length > 0) {
      annotationUI.addAnnotations(updatedAnnots);
    }
  });

  /**
   * Build the root conversation thread from the given UI state.
   * @return {Thread}
   */
  this.thread = memoize(buildRootThread);
}

module.exports = RootThread;

},{"./annotation-metadata":53,"./build-thread":56,"./events":97,"./tabs":135,"./ui-constants":169,"./util/memoize":176}],127:[function(require,module,exports){
'use strict';

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');

/**
 * Client for the Hypothesis search API.
 *
 * SearchClient handles paging through results, canceling search etc.
 *
 * @param {Object} searchFn - Function for querying the search API
 * @param {Object} opts - Search options
 * @constructor
 */
function SearchClient(searchFn, opts) {
  opts = opts || {};

  var DEFAULT_CHUNK_SIZE = 200;
  this._searchFn = searchFn;
  this._chunkSize = opts.chunkSize || DEFAULT_CHUNK_SIZE;
  if (typeof opts.incremental !== 'undefined') {
    this._incremental = opts.incremental;
  } else {
    this._incremental = true;
  }
  this._canceled = false;
}
inherits(SearchClient, EventEmitter);

SearchClient.prototype._getBatch = function (query, offset) {
  var searchQuery = Object.assign({
    limit: this._chunkSize,
    offset: offset,
    sort: 'created',
    order: 'asc',
    _separate_replies: true
  }, query);

  var self = this;
  this._searchFn(searchQuery).then(function (results) {
    if (self._canceled) {
      return;
    }

    var chunk = results.rows.concat(results.replies || []);
    if (self._incremental) {
      self.emit('results', chunk);
    } else {
      self._results = self._results.concat(chunk);
    }

    // Check if there are additional pages of results to fetch. In addition to
    // checking the `total` figure from the server, we also require that at
    // least one result was returned in the current page, otherwise we would
    // end up repeating the same query for the next page. If the server's
    // `total` count is incorrect for any reason, that will lead to the client
    // polling the server indefinitely.
    var nextOffset = offset + results.rows.length;
    if (results.total > nextOffset && chunk.length > 0) {
      self._getBatch(query, nextOffset);
    } else {
      if (!self._incremental) {
        self.emit('results', self._results);
      }
      self.emit('end');
    }
  }).catch(function (err) {
    if (self._canceled) {
      return;
    }
    self.emit('error', err);
  }).then(function () {
    if (self._canceled) {
      return;
    }
    self.emit('end');
  });
};

/**
 * Perform a search against the Hypothesis API.
 *
 * Emits a 'results' event with an array of annotations as they become
 * available (in incremental mode) or when all annotations are available
 * (in non-incremental mode).
 *
 * Emits an 'error' event if the search fails.
 * Emits an 'end' event once the search completes.
 */
SearchClient.prototype.get = function (query) {
  this._results = [];
  this._getBatch(query, 0);
};

/**
 * Cancel the current search and emit the 'end' event.
 * No further events will be emitted after this.
 */
SearchClient.prototype.cancel = function () {
  this._canceled = true;
  this.emit('end');
};

module.exports = SearchClient;

},{"inherits":5,"tiny-emitter":40}],128:[function(require,module,exports){
'use strict';

/**
 * Splits a search term into filter and data.
 *
 * ie. 'user:johndoe' -> ['user', 'johndoe']
 *     'example:text' -> [null, 'example:text']
 */

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function splitTerm(term) {
  var filter = term.slice(0, term.indexOf(':'));
  if (!filter) {
    // The whole term is data
    return [null, term];
  }

  if (['group', 'quote', 'result', 'since', 'tag', 'text', 'uri', 'user'].includes(filter)) {
    var data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    // The filter is not a power search filter, so the whole term is data
    return [null, term];
  }
}

/**
 * Tokenize a search query.
 *
 * Splits `searchtext` into tokens, separated by spaces.
 * Quoted phrases in `searchtext` are returned as a single token.
 */
function tokenize(searchtext) {
  if (!searchtext) {
    return [];
  }

  // Small helper function for removing quote characters
  // from the beginning- and end of a string, if the
  // quote characters are the same.
  // I.e.
  //   'foo' -> foo
  //   "bar" -> bar
  //   'foo" -> 'foo"
  //   bar"  -> bar"
  var _removeQuoteCharacter = function _removeQuoteCharacter(text) {
    var start = text.slice(0, 1);
    var end = text.slice(-1);
    if ((start === '"' || start === "'") && start === end) {
      text = text.slice(1, text.length - 1);
    }
    return text;
  };

  var tokens = searchtext.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

  // Cut the opening and closing quote characters
  tokens = tokens.map(_removeQuoteCharacter);

  // Remove quotes for power search.
  // I.e. 'tag:"foo bar"' -> 'tag:foo bar'
  for (var index = 0; index < tokens.length; index++) {
    var token = tokens[index];

    var _splitTerm = splitTerm(token),
        _splitTerm2 = _slicedToArray(_splitTerm, 2),
        filter = _splitTerm2[0],
        data = _splitTerm2[1];

    if (filter) {
      tokens[index] = filter + ':' + _removeQuoteCharacter(data);
    }
  }

  return tokens;
}

/**
 * Parse a search query into a map of search field to term.
 *
 * @param {string} searchtext
 * @return {Object}
 */
function toObject(searchtext) {
  var obj = {};
  var backendFilter = function backendFilter(f) {
    return f === 'tag' ? 'tags' : f;
  };

  var addToObj = function addToObj(key, data) {
    if (obj[key]) {
      return obj[key].push(data);
    } else {
      return obj[key] = [data];
    }
  };

  if (searchtext) {
    var terms = tokenize(searchtext);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = terms[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var term = _step.value;

        var _splitTerm3 = splitTerm(term),
            _splitTerm4 = _slicedToArray(_splitTerm3, 2),
            filter = _splitTerm4[0],
            data = _splitTerm4[1];

        if (!filter) {
          filter = 'any';
          data = term;
        }
        addToObj(backendFilter(filter), data);
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
  }
  return obj;
}

/**
 * @typedef Facet
 * @property {'and'|'or'|'min'} operator
 * @property {boolean} lowercase
 * @property {string[]} terms
 */

/**
 * Parse a search query into a map of filters.
 *
 * Returns an object mapping facet names to Facet.
 *
 * Terms that are not associated with a particular facet are stored in the "any"
 * facet.
 *
 * @param {string} searchtext
 * @return {Object}
 */
function generateFacetedFilter(searchtext) {
  var terms;
  var any = [];
  var quote = [];
  var result = [];
  var since = [];
  var tag = [];
  var text = [];
  var uri = [];
  var user = [];

  if (searchtext) {
    terms = tokenize(searchtext);
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = terms[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var term = _step2.value;

        var t;
        var filter = term.slice(0, term.indexOf(':'));
        switch (filter) {
          case 'quote':
            quote.push(term.slice(6));
            break;
          case 'result':
            result.push(term.slice(7));
            break;
          case 'since':
            {
              // We'll turn this into seconds
              var time = term.slice(6).toLowerCase();
              if (time.match(/^\d+$/)) {
                // Only digits, assuming seconds
                since.push(time * 1);
              }
              if (time.match(/^\d+sec$/)) {
                // Time given in seconds
                t = /^(\d+)sec$/.exec(time)[1];
                since.push(t * 1);
              }
              if (time.match(/^\d+min$/)) {
                // Time given in minutes
                t = /^(\d+)min$/.exec(time)[1];
                since.push(t * 60);
              }
              if (time.match(/^\d+hour$/)) {
                // Time given in hours
                t = /^(\d+)hour$/.exec(time)[1];
                since.push(t * 60 * 60);
              }
              if (time.match(/^\d+day$/)) {
                // Time given in days
                t = /^(\d+)day$/.exec(time)[1];
                since.push(t * 60 * 60 * 24);
              }
              if (time.match(/^\d+week$/)) {
                // Time given in week
                t = /^(\d+)week$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 7);
              }
              if (time.match(/^\d+month$/)) {
                // Time given in month
                t = /^(\d+)month$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 30);
              }
              if (time.match(/^\d+year$/)) {
                // Time given in year
                t = /^(\d+)year$/.exec(time)[1];
                since.push(t * 60 * 60 * 24 * 365);
              }
            }
            break;
          case 'tag':
            tag.push(term.slice(4));break;
          case 'text':
            text.push(term.slice(5));break;
          case 'uri':
            uri.push(term.slice(4));break;
          case 'user':
            user.push(term.slice(5));break;
          default:
            any.push(term);
        }
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

  return {
    any: {
      terms: any,
      operator: 'and'
    },
    quote: {
      terms: quote,
      operator: 'and'
    },
    result: {
      terms: result,
      operator: 'min'
    },
    since: {
      terms: since,
      operator: 'and'
    },
    tag: {
      terms: tag,
      operator: 'and'
    },
    text: {
      terms: text,
      operator: 'and'
    },
    uri: {
      terms: uri,
      operator: 'or'
    },
    user: {
      terms: user,
      operator: 'or'
    }
  };
}

// @ngInject
function searchFilter() {
  return {
    toObject: toObject,
    generateFacetedFilter: generateFacetedFilter
  };
}

module.exports = searchFilter;

},{}],129:[function(require,module,exports){
'use strict';

/**
 * Return the configuration for the annotation service which the client would retrieve
 * annotations from which may contain the authority, grantToken and icon.
 *
 * @param {Object} settings - The settings object which would contain the services array.
 */

function serviceConfig(settings) {
  if (!Array.isArray(settings.services) || settings.services.length === 0) {
    return null;
  }
  return settings.services[0];
}

module.exports = serviceConfig;

},{}],130:[function(require,module,exports){
'use strict';

serviceUrl.$inject = ["annotationUI", "apiRoutes"];
var urlUtil = require('./util/url-util');

/**
 * A function that returns an absolute URL given a link name and params, by
 * expanding named URL templates received from the annotation service's API.
 *
 * The links object from the API is a map of link names to URL templates:
 *
 * {
 *   signup: "http://localhost:5000/signup",
 *   user: "http://localhost:5000/u/:user",
 *   ...
 * }
 *
 * Given a link name (e.g. 'user') and params (e.g. {user: 'bob'}) return
 * an absolute URL by expanding the named URL template from the API with the
 * given params (e.g. "http://localhost:5000/u/bob").
 *
 * Before the links object has been received from the API this function
 * always returns empty strings as the URLs. After the links object has been
 * received from the API this function starts returning the real URLs.
 *
 * @param {string} linkName - The name of the link to expand
 * @param {object} params - The params with which to expand the link
 * @returns {string} The expanded absolute URL, or an empty string if the
 *                   links haven't been received from the API yet
 * @throws {Error} If the links have been received from the API but the given
 *                 linkName is unknown
 * @throws {Error} If one or more of the params given isn't used in the URL
 *                 template
 *
 * @ngInject
 */
function serviceUrl(annotationUI, apiRoutes) {

  apiRoutes.links().then(annotationUI.updateLinks).catch(function (error) {
    console.warn('The links API request was rejected: ' + error.message);
  });

  return function (linkName, params) {
    var links = annotationUI.getState().links;

    if (links === null) {
      return '';
    }

    var path = links[linkName];

    if (!path) {
      throw new Error('Unknown link ' + linkName);
    }

    params = params || {};
    var url = urlUtil.replaceURLParams(path, params);

    var unused = Object.keys(url.params);
    if (unused.length > 0) {
      throw new Error('Unknown link parameters: ' + unused.join(', '));
    }

    return url.url;
  };
}

module.exports = serviceUrl;

},{"./util/url-util":181}],131:[function(require,module,exports){
'use strict';

session.$inject = ["$q", "$rootScope", "analytics", "annotationUI", "auth", "flash", "raven", "settings", "serviceConfig", "store"];
var angular = require('angular');

var events = require('./events');
var retryUtil = require('./retry-util');

var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @typedef Profile
 *
 * An object returned by the API (`GET /api/profile`) containing profile data
 * for the current user.
 */

/**
 * This service handles fetching the user's profile, updating profile settings
 * and logging out.
 *
 * Access to the current profile is exposed via the `state` property.
 *
 * @ngInject
 */
function session($q, $rootScope, analytics, annotationUI, auth, flash, raven, settings, serviceConfig, store) {
  // Cache the result of load()
  var lastLoad;
  var lastLoadTime;

  // Return the authority from the first service defined in the settings.
  // Return null if there are no services defined in the settings.
  function getAuthority() {
    var service = serviceConfig(settings);
    if (service === null) {
      return null;
    }
    return service.authority;
  }

  // Options to pass to `retry.operation` when fetching the user's profile.
  var profileFetchRetryOpts = {};

  /**
   * Fetch the user's profile from the annotation service.
   *
   * If the profile has been previously fetched within `CACHE_TTL` ms, then this
   * method returns a cached profile instead of triggering another fetch.
   *
   * @return {Promise<Profile>} A promise for the user's profile data.
   */
  function load() {
    if (!lastLoadTime || Date.now() - lastLoadTime > CACHE_TTL) {

      // The load attempt is automatically retried with a backoff.
      //
      // This serves to make loading the app in the extension cope better with
      // flakey connectivity but it also throttles the frequency of calls to
      // the /app endpoint.
      lastLoadTime = Date.now();
      lastLoad = retryUtil.retryPromiseOperation(function () {
        var authority = getAuthority();
        var opts = {};
        if (authority) {
          opts.authority = authority;
        }
        return store.profile.read(opts);
      }, profileFetchRetryOpts).then(function (session) {
        update(session);
        lastLoadTime = Date.now();
        return session;
      }).catch(function (err) {
        lastLoadTime = null;
        throw err;
      });
    }
    return lastLoad;
  }

  /**
   * Store the preference server-side that the user dismissed the sidebar
   * tutorial and then update the local profile data.
   */
  function dismissSidebarTutorial() {
    return store.profile.update({}, { preferences: { show_sidebar_tutorial: false } }).then(update);
  }

  /**
   * Update the local profile data.
   *
   * This method can be used to update the profile data in the client when new
   * data is pushed from the server via the real-time API.
   *
   * @param {Profile} model
   * @return {Profile} The updated profile data
   */
  function update(model) {
    var prevSession = annotationUI.getState().session;
    var userChanged = model.userid !== prevSession.userid;
    var groupsChanged = !angular.equals(model.groups, prevSession.groups);

    // Update the session model used by the application
    annotationUI.updateSession(model);

    lastLoad = Promise.resolve(model);
    lastLoadTime = Date.now();

    if (userChanged) {
      $rootScope.$broadcast(events.USER_CHANGED, {
        profile: model
      });

      // Associate error reports with the current user in Sentry.
      if (model.userid) {
        raven.setUserInfo({
          id: model.userid
        });
      } else {
        raven.setUserInfo(undefined);
      }
    }

    if (groupsChanged) {
      $rootScope.$broadcast(events.GROUPS_CHANGED);
    }

    // Return the model
    return model;
  }

  /**
   * Log the user out of the current session.
   */
  function logout() {
    var loggedOut = auth.logout().then(function () {
      // Re-fetch the logged-out user's profile.
      return reload();
    });

    return loggedOut.catch(function (err) {
      flash.error('Log out failed');
      analytics.track(analytics.events.LOGOUT_FAILURE);
      return $q.reject(new Error(err));
    }).then(function () {
      analytics.track(analytics.events.LOGOUT_SUCCESS);
    });
  }

  /**
   * Clear the cached profile information and re-fetch it from the server.
   *
   * This can be used to refresh the user's profile state after logging in.
   *
   * @return {Promise<Profile>}
   */
  function reload() {
    lastLoad = null;
    lastLoadTime = null;
    return load();
  }

  $rootScope.$on(events.OAUTH_TOKENS_CHANGED, function () {
    reload();
  });

  return {
    dismissSidebarTutorial: dismissSidebarTutorial,
    load: load,
    logout: logout,
    reload: reload,

    // Exposed for use in tests
    profileFetchRetryOpts: profileFetchRetryOpts,

    // For the moment, we continue to expose the session state as a property on
    // this service. In future, other services which access the session state
    // will do so directly from annotationUI or via selector functions
    get state() {
      return annotationUI.getState().session;
    },

    update: update
  };
}

module.exports = session;

},{"./events":97,"./retry-util":125,"angular":"angular"}],132:[function(require,module,exports){
'use strict';

store.$inject = ["$http", "$q", "apiRoutes", "auth"];
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var get = require('lodash.get');

var urlUtil = require('./util/url-util');

/**
 * Translate the response from a failed API call into an Error-like object.
 *
 * The details of the response are available on the `response` property of the
 * error.
 */
function translateResponseToError(response) {
  var message;
  if (response.status <= 0) {
    message = 'Service unreachable.';
  } else {
    message = response.status + ' ' + response.statusText;
    if (response.data && response.data.reason) {
      message = message + ': ' + response.data.reason;
    }
  }
  var err = new Error(message);
  err.response = response;
  return err;
}

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 */
function stripInternalProperties(obj) {
  var result = {};

  for (var k in obj) {
    if (obj.hasOwnProperty(k) && k[0] !== '$') {
      result[k] = obj[k];
    }
  }

  return result;
}

function forEachSorted(obj, iterator, context) {
  var keys = Object.keys(obj).sort();
  for (var i = 0; i < keys.length; i++) {
    iterator.call(context, obj[keys[i]], keys[i]);
  }
  return keys;
}

function serializeValue(v) {
  if ((typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object') {
    return v instanceof Date ? v.toISOString() : JSON.stringify(v);
  }
  return v;
}

function encodeUriQuery(val) {
  return encodeURIComponent(val).replace(/%20/g, '+');
}

// Serialize an object containing parameters into a form suitable for a query
// string.
//
// This is an almost identical copy of the default Angular parameter serializer
// ($httpParamSerializer), with one important change. In Angular 1.4.x
// semicolons are not encoded in query parameter values. This is a problem for
// us as URIs around the web may well contain semicolons, which our backend will
// then proceed to parse as a delimiter in the query string. To avoid this
// problem we use a very conservative encoder, found above.
function serializeParams(params) {
  if (!params) {
    return '';
  }
  var parts = [];
  forEachSorted(params, function (value, key) {
    if (value === null || typeof value === 'undefined') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (v) {
        parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(v)));
      });
    } else {
      parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(value)));
    }
  });

  return parts.join('&');
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param $http - The Angular HTTP service
 * @param $q - The Angular Promises ($q) service.
 * @param links - Object or promise for an object mapping named API routes to
 *                URL templates and methods
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 * @param {Function} tokenGetter - Function which returns a Promise for an
 *                   access token for the API.
 */
function createAPICall($http, $q, links, route, tokenGetter) {
  return function (params, data) {
    // `$q.all` is used here rather than `Promise.all` because testing code that
    // mixes native Promises with the `$q` promises returned by `$http`
    // functions gets awkward in tests.
    return $q.all([links, tokenGetter()]).then(function (linksAndToken) {
      var links = linksAndToken[0];
      var token = linksAndToken[1];

      var descriptor = get(links, route);
      var url = urlUtil.replaceURLParams(descriptor.url, params);
      var headers = {};

      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }

      var req = {
        data: data ? stripInternalProperties(data) : null,
        headers: headers,
        method: descriptor.method,
        params: url.params,
        paramSerializer: serializeParams,
        url: url.url
      };
      return $http(req);
    }).then(function (response) {
      return response.data;
    }).catch(function (response) {
      // Translate the API result into an `Error` to follow the convention that
      // Promises should be rejected with an Error or Error-like object.
      //
      // Use `$q.reject` rather than just rethrowing the Error here due to
      // mishandling of errors thrown inside `catch` handlers in Angular < 1.6
      return $q.reject(translateResponseToError(response));
    });
  };
}

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/).
 *
 * This service handles authenticated calls to the API, using the `auth` service
 * to get auth tokens. The URLs for API endpoints are fetched from the `/api`
 * endpoint, a responsibility delegated to the `apiRoutes` service which does
 * not use authentication.
 */
// @ngInject
function store($http, $q, apiRoutes, auth) {
  var links = apiRoutes.routes();
  function apiCall(route) {
    return createAPICall($http, $q, links, route, auth.tokenGetter);
  }

  return {
    search: apiCall('search'),
    annotation: {
      create: apiCall('annotation.create'),
      delete: apiCall('annotation.delete'),
      get: apiCall('annotation.read'),
      update: apiCall('annotation.update'),
      flag: apiCall('annotation.flag'),
      hide: apiCall('annotation.hide'),
      unhide: apiCall('annotation.unhide')
    },
    group: {
      member: {
        delete: apiCall('group.member.delete')
      }
    },
    profile: {
      read: apiCall('profile.read'),
      update: apiCall('profile.update')
    }

    // The `links` endpoint is not included here. Clients should fetch these
    // from the `apiRoutes` service.
  };
}

module.exports = store;

},{"./util/url-util":181,"lodash.get":7}],133:[function(require,module,exports){
var StreamFilter;

module.exports = StreamFilter = (function() {
  StreamFilter.prototype.strategies = ['include_any', 'include_all', 'exclude_any', 'exclude_all'];

  StreamFilter.prototype.filter = {
    match_policy: 'include_any',
    clauses: [],
    actions: {
      create: true,
      update: true,
      "delete": true
    }
  };

  function StreamFilter() {}

  StreamFilter.prototype.getFilter = function() {
    return this.filter;
  };

  StreamFilter.prototype.getMatchPolicy = function() {
    return this.filter.match_policy;
  };

  StreamFilter.prototype.getClauses = function() {
    return this.filter.clauses;
  };

  StreamFilter.prototype.getActions = function() {
    return this.filter.actions;
  };

  StreamFilter.prototype.getActionCreate = function() {
    return this.filter.actions.create;
  };

  StreamFilter.prototype.getActionUpdate = function() {
    return this.filter.actions.update;
  };

  StreamFilter.prototype.getActionDelete = function() {
    return this.filter.actions["delete"];
  };

  StreamFilter.prototype.setMatchPolicy = function(policy) {
    this.filter.match_policy = policy;
    return this;
  };

  StreamFilter.prototype.setMatchPolicyIncludeAny = function() {
    this.filter.match_policy = 'include_any';
    return this;
  };

  StreamFilter.prototype.setMatchPolicyIncludeAll = function() {
    this.filter.match_policy = 'include_all';
    return this;
  };

  StreamFilter.prototype.setMatchPolicyExcludeAny = function() {
    this.filter.match_policy = 'exclude_any';
    return this;
  };

  StreamFilter.prototype.setMatchPolicyExcludeAll = function() {
    this.filter.match_policy = 'exclude_all';
    return this;
  };

  StreamFilter.prototype.setActions = function(actions) {
    this.filter.actions = actions;
    return this;
  };

  StreamFilter.prototype.setActionCreate = function(action) {
    this.filter.actions.create = action;
    return this;
  };

  StreamFilter.prototype.setActionUpdate = function(action) {
    this.filter.actions.update = action;
    return this;
  };

  StreamFilter.prototype.setActionDelete = function(action) {
    this.filter.actions["delete"] = action;
    return this;
  };

  StreamFilter.prototype.noClauses = function() {
    this.filter.clauses = [];
    return this;
  };

  StreamFilter.prototype.addClause = function(field, operator, value, case_sensitive, options) {
    if (case_sensitive == null) {
      case_sensitive = false;
    }
    if (options == null) {
      options = {};
    }
    this.filter.clauses.push({
      field: field,
      operator: operator,
      value: value,
      case_sensitive: case_sensitive,
      options: options
    });
    return this;
  };

  StreamFilter.prototype.resetFilter = function() {
    this.setMatchPolicyIncludeAny();
    this.setActionCreate(true);
    this.setActionUpdate(true);
    this.setActionDelete(true);
    this.noClauses();
    return this;
  };

  return StreamFilter;

})();


},{}],134:[function(require,module,exports){
'use strict';

Streamer.$inject = ["$rootScope", "annotationMapper", "annotationUI", "auth", "groups", "session", "settings"];
var queryString = require('query-string');
var uuid = require('node-uuid');

var events = require('./events');
var Socket = require('./websocket');

/**
 * Open a new WebSocket connection to the Hypothesis push notification service.
 * Only one websocket connection may exist at a time, any existing socket is
 * closed.
 *
 * @param $rootScope - Scope used to $apply() app state changes
 *                     resulting from WebSocket messages, in order to update
 *                     appropriate watchers.
 * @param annotationMapper - The local annotation store
 * @param groups - The local groups store
 * @param session - Provides access to read and update the session state
 * @param settings - Application settings
 */
// @ngInject
function Streamer($rootScope, annotationMapper, annotationUI, auth, groups, session, settings) {
  // The randomly generated session UUID
  var clientId = uuid.v4();

  // The socket instance for this Streamer instance
  var socket;

  // Client configuration messages, to be sent each time a new connection is
  // established.
  var configMessages = {};

  // The streamer maintains a set of pending updates and deletions which have
  // been received via the WebSocket but not yet applied to the contents of the
  // app.
  //
  // This state should be managed as part of the global app state in
  // annotationUI, but that is currently difficult because applying updates
  // requires filtering annotations against the focused group (information not
  // currently stored in the app state) and triggering events in order to update
  // the annotations displayed in the page.

  // Map of ID -> updated annotation for updates that have been received over
  // the WS but not yet applied
  var pendingUpdates = {};
  // Set of IDs of annotations which have been deleted but for which the
  // deletion has not yet been applied
  var pendingDeletions = {};

  function handleAnnotationNotification(message) {
    var action = message.options.action;
    var annotations = message.payload;

    switch (action) {
      case 'create':
      case 'update':
      case 'past':
        annotations.forEach(function (ann) {
          // In the sidebar, only save pending updates for annotations in the
          // focused group, since we only display annotations from the focused
          // group and reload all annotations and discard pending updates
          // when switching groups.
          if (ann.group === groups.focused().id || !annotationUI.isSidebar()) {
            pendingUpdates[ann.id] = ann;
          }
        });
        break;
      case 'delete':
        annotations.forEach(function (ann) {
          // Discard any pending but not-yet-applied updates for this annotation
          delete pendingUpdates[ann.id];

          // If we already have this annotation loaded, then record a pending
          // deletion. We do not check the group of the annotation here because a)
          // that information is not included with deletion notifications and b)
          // even if the annotation is from the current group, it might be for a
          // new annotation (saved in pendingUpdates and removed above), that has
          // not yet been loaded.
          if (annotationUI.annotationExists(ann.id)) {
            pendingDeletions[ann.id] = true;
          }
        });
        break;
    }

    if (!annotationUI.isSidebar()) {
      applyPendingUpdates();
    }
  }

  function handleSessionChangeNotification(message) {
    session.update(message.model);
  }

  function handleSocketOnError(event) {
    console.warn('Error connecting to H push notification service:', event);

    // In development, warn if the connection failure might be due to
    // the app's origin not having been whitelisted in the H service's config.
    //
    // Unfortunately the error event does not provide a way to get at the
    // HTTP status code for HTTP -> WS upgrade requests.
    var websocketHost = new URL(settings.websocketUrl).hostname;
    if (['localhost', '127.0.0.1'].indexOf(websocketHost) !== -1) {
      console.warn('Check that your H service is configured to allow ' + 'WebSocket connections from ' + window.location.origin);
    }
  }

  function handleSocketOnMessage(event) {
    // Wrap message dispatches in $rootScope.$apply() so that
    // scope watches on app state affected by the received message
    // are updated
    $rootScope.$apply(function () {
      var message = JSON.parse(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'annotation-notification') {
        handleAnnotationNotification(message);
      } else if (message.type === 'session-change') {
        handleSessionChangeNotification(message);
      } else if (message.type === 'whoyouare') {
        var userid = annotationUI.getState().session.userid;
        if (message.userid !== userid) {
          console.warn('WebSocket user ID "%s" does not match logged-in ID "%s"', message.userid, userid);
        }
      } else {
        console.warn('received unsupported notification', message.type);
      }
    });
  }

  function sendClientConfig() {
    Object.keys(configMessages).forEach(function (key) {
      if (configMessages[key]) {
        socket.send(configMessages[key]);
      }
    });
  }

  /**
   * Send a configuration message to the push notification service.
   * Each message is associated with a key, which is used to re-send
   * configuration data to the server in the event of a reconnection.
   */
  function setConfig(key, configMessage) {
    configMessages[key] = configMessage;
    if (socket && socket.isConnected()) {
      socket.send(configMessage);
    }
  }

  var _connect = function _connect() {
    // If we have no URL configured, don't do anything.
    if (!settings.websocketUrl) {
      return Promise.resolve();
    }

    return auth.tokenGetter().then(function (token) {
      var url;
      if (token) {
        // Include the access token in the URL via a query param. This method
        // is used to send credentials because the `WebSocket` constructor does
        // not support setting the `Authorization` header directly as we do for
        // other API requests.
        var parsedURL = new URL(settings.websocketUrl);
        var queryParams = queryString.parse(parsedURL.search);
        queryParams.access_token = token;
        parsedURL.search = queryString.stringify(queryParams);
        url = parsedURL.toString();
      } else {
        url = settings.websocketUrl;
      }

      socket = new Socket(url);

      socket.on('open', sendClientConfig);
      socket.on('error', handleSocketOnError);
      socket.on('message', handleSocketOnMessage);

      // Configure the client ID
      setConfig('client-id', {
        messageType: 'client_id',
        value: clientId
      });

      // Send a "whoami" message. The server will respond with a "whoyouare"
      // reply which is useful for verifying that authentication worked as
      // expected.
      setConfig('auth-check', {
        type: 'whoami',
        id: 1
      });
    }).catch(function (err) {
      console.error('Failed to fetch token for WebSocket authentication', err);
    });
  };

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this does nothing.
   *
   * @return {Promise} Promise which resolves once the WebSocket connection
   *                   process has started.
   */
  function connect() {
    if (socket) {
      return Promise.resolve();
    }

    return _connect();
  }

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this closes the existing connection
   * and reconnects.
   *
   * @return {Promise} Promise which resolves once the WebSocket connection
   *                   process has started.
   */
  function reconnect() {
    if (socket) {
      socket.close();
    }

    return _connect();
  }

  function applyPendingUpdates() {
    var updates = Object.values(pendingUpdates);
    var deletions = Object.keys(pendingDeletions).map(function (id) {
      return { id: id };
    });

    if (updates.length) {
      annotationMapper.loadAnnotations(updates);
    }
    if (deletions.length) {
      annotationMapper.unloadAnnotations(deletions);
    }

    pendingUpdates = {};
    pendingDeletions = {};
  }

  function countPendingUpdates() {
    return Object.keys(pendingUpdates).length + Object.keys(pendingDeletions).length;
  }

  function hasPendingDeletion(id) {
    return pendingDeletions.hasOwnProperty(id);
  }

  function removePendingUpdates(event, anns) {
    if (!Array.isArray(anns)) {
      anns = [anns];
    }
    anns.forEach(function (ann) {
      delete pendingUpdates[ann.id];
      delete pendingDeletions[ann.id];
    });
  }

  function clearPendingUpdates() {
    pendingUpdates = {};
    pendingDeletions = {};
  }

  var updateEvents = [events.ANNOTATION_DELETED, events.ANNOTATION_UPDATED, events.ANNOTATIONS_UNLOADED];

  updateEvents.forEach(function (event) {
    $rootScope.$on(event, removePendingUpdates);
  });
  $rootScope.$on(events.GROUP_FOCUSED, clearPendingUpdates);

  this.applyPendingUpdates = applyPendingUpdates;
  this.countPendingUpdates = countPendingUpdates;
  this.hasPendingDeletion = hasPendingDeletion;
  this.clientId = clientId;
  this.configMessages = configMessages;
  this.connect = connect;
  this.reconnect = reconnect;
  this.setConfig = setConfig;
}

module.exports = Streamer;

},{"./events":97,"./websocket":185,"node-uuid":18,"query-string":20}],135:[function(require,module,exports){
'use strict';

// Selectors that calculate the annotation counts displayed in tab headings
// and determine which tab an annotation should be displayed in.

var countIf = require('./util/array-util').countIf;
var metadata = require('./annotation-metadata');
var uiConstants = require('./ui-constants');

/**
 * Return the tab in which an annotation should be displayed.
 *
 * @param {Annotation} ann
 */
function tabForAnnotation(ann) {
  if (metadata.isOrphan(ann)) {
    return uiConstants.TAB_ORPHANS;
  } else if (metadata.isPageNote(ann)) {
    return uiConstants.TAB_NOTES;
  } else {
    return uiConstants.TAB_ANNOTATIONS;
  }
}

/**
 * Return true if an annotation should be displayed in a given tab.
 *
 * @param {Annotation} ann
 * @param {number} tab - The TAB_* value indicating the tab
 */
function shouldShowInTab(ann, tab) {
  if (metadata.isWaitingToAnchor(ann)) {
    // Until this annotation anchors or fails to anchor, we do not know which
    // tab it should be displayed in.
    return false;
  }
  return tabForAnnotation(ann) === tab;
}

/**
 * Return the counts for the headings of different tabs.
 *
 * @param {Annotation[]} annotations - List of annotations to display
 */
function counts(annotations) {
  var counts = {
    notes: countIf(annotations, metadata.isPageNote),
    annotations: countIf(annotations, metadata.isAnnotation),
    orphans: countIf(annotations, metadata.isOrphan),
    anchoring: countIf(annotations, metadata.isWaitingToAnchor)
  };

  return counts;
}

module.exports = {
  counts: counts,
  shouldShowInTab: shouldShowInTab,
  tabForAnnotation: tabForAnnotation
};

},{"./annotation-metadata":53,"./ui-constants":169,"./util/array-util":172}],136:[function(require,module,exports){
'use strict';

/**
 * @typedef Tag
 * @property {string} text - The label of the tag
 * @property {number} count - The number of times this tag has been used.
 * @property {number} updated - The timestamp when this tag was last used.
 */

/**
 * Service for fetching tag suggestions and storing data to generate them.
 *
 * The `tags` service stores metadata about recently used tags to local storage
 * and provides a `filter` method to fetch tags matching a query, ranked based
 * on frequency of usage.
 */
// @ngInject

tags.$inject = ["localStorage"];
function tags(localStorage) {
  var TAGS_LIST_KEY = 'hypothesis.user.tags.list';
  var TAGS_MAP_KEY = 'hypothesis.user.tags.map';

  /**
   * Return a list of tag suggestions matching `query`.
   *
   * @param {string} query
   * @return {Tag[]} List of matching tags
   */
  function filter(query) {
    var savedTags = localStorage.getObject(TAGS_LIST_KEY) || [];

    return savedTags.filter(function (e) {
      return e.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
  }

  /**
   * Update the list of stored tag suggestions based on the tags that a user has
   * entered for a given annotation.
   *
   * @param {Tag} tags - List of tags.
   */
  function store(tags) {
    // Update the stored (tag, frequency) map.
    var savedTags = localStorage.getObject(TAGS_MAP_KEY) || {};
    tags.forEach(function (tag) {
      if (savedTags[tag.text]) {
        savedTags[tag.text].count += 1;
        savedTags[tag.text].updated = Date.now();
      } else {
        savedTags[tag.text] = {
          text: tag.text,
          count: 1,
          updated: Date.now()
        };
      }
    });
    localStorage.setObject(TAGS_MAP_KEY, savedTags);

    // Sort tag suggestions by frequency.
    var tagsList = Object.keys(savedTags).sort(function (t1, t2) {
      if (savedTags[t1].count !== savedTags[t2].count) {
        return savedTags[t2].count - savedTags[t1].count;
      }
      return t1.localeCompare(t2);
    });
    localStorage.setObject(TAGS_LIST_KEY, tagsList);
  }

  return {
    filter: filter,
    store: store
  };
}

module.exports = tags;

},{}],137:[function(require,module,exports){
module.exports = "<button class=\"btn btn-clean annotation-action-btn\"\n  ng-click=\"vm.onClick()\"\n  ng-disabled=\"vm.isDisabled\"\n  aria-label=\"{{ vm.label }}\"\n  h-tooltip>\n  <i class=\"{{ vm.icon }} btn-icon\"></i>\n</button>\n";

},{}],138:[function(require,module,exports){
module.exports = "<header class=\"annotation-header\">\n  <!-- User -->\n  <span ng-if=\"vm.user()\">\n    <a class=\"annotation-header__user\"\n      target=\"_blank\"\n      ng-if=\"!vm.isThirdPartyUser()\"\n      ng-href=\"{{vm.serviceUrl('user',{user:vm.user()})}}\"\n      ><i ng-show=\"vm.isPrivate\" class=\"h-icon-visibility-off\"></i>{{vm.displayName()}}</a>\n    <a class=\"annotation-header__user\"\n      target=\"_blank\"\n      ng-if=\"vm.isThirdPartyUser() && vm.thirdPartyUsernameLink()\"\n      href=\"{{ vm.thirdPartyUsernameLink() }}\"\n      ><i ng-show=\"vm.isPrivate\" class=\"h-icon-visibility-off\"></i>{{vm.displayName()}}</a>\n    <span class=\"annotation-header__user\"\n      ng-if=\"vm.isThirdPartyUser() && !vm.thirdPartyUsernameLink()\"\n      >{{vm.displayName()}}</span>\n    <span class=\"annotation-collapsed-replies\">\n      <a class=\"annotation-link\" href=\"\"\n        ng-click=\"vm.onReplyCountClick()\"\n        ng-pluralize count=\"vm.replyCount\"\n        when=\"{'0': '', 'one': '1 reply', 'other': '{} replies'}\"></a>\n    </span>\n    <br>\n    <span class=\"annotation-header__share-info\">\n      <a class=\"annotation-header__group\"\n        target=\"_blank\" ng-if=\"vm.group() && vm.group().url\" href=\"{{vm.group().url}}\">\n        <i class=\"h-icon-group\"></i><span class=\"annotation-header__group-name\">{{vm.group().name}}</span>\n      </a>\n      <span ng-show=\"vm.isPrivate\"\n        title=\"{{'This feedback is visible only to you.' | translate}}\">\n        <i class=\"h-icon-lock\"></i><span class=\"annotation-header__group-name\" ng-show=\"!vm.group().url\">{{'Only me' | translate}}</span>\n      </span>\n      <i class=\"h-icon-border-color\" ng-show=\"vm.isHighlight && !vm.isEditing\" title=\"{{'This is a highlight. Click \\'edit\\' to add a note or tag.'| translate}}\"></i>\n      <span ng-if=\"::vm.showDocumentInfo\">\n        <span class=\"annotation-citation\" ng-if=\"vm.documentMeta().titleLink\">\n          on \"<a ng-href=\"{{vm.documentMeta().titleLink}}\">{{vm.documentMeta().titleText}}</a>\"\n        </span>\n        <span class=\"annotation-citation\" ng-if=\"!vm.documentMeta().titleLink\">\n          on \"{{vm.documentMeta().titleText}}\"\n        </span>\n        <span class=\"annotation-citation-domain\"\n              ng-if=\"vm.documentMeta().domain\">({{vm.documentMeta().domain}})</span>\n      </span>\n    </span>\n  </span>\n\n  <span class=\"u-flex-spacer\"></span>\n\n  <timestamp\n    class-name=\"'annotation-header__timestamp'\"\n    timestamp=\"vm.updated()\"\n    href=\"vm.htmlLink()\"\n    ng-if=\"!vm.editing() && vm.updated()\"></timestamp>\n</header>\n";

},{}],139:[function(require,module,exports){
module.exports = "<div class=\"annotation-share-dialog__backdrop\"\n     ng-if=\"vm.isOpen\"\n     ng-click=\"vm.onClose()\"></div>\n<div class=\"annotation-share-dialog\" ng-class=\"{'is-open': vm.isOpen}\">\n  <div class=\"annotation-share-dialog-target\">\n    <span class=\"annotation-share-dialog-target__label\">{{'Share' | translate}}:</span>\n    <a href=\"https://twitter.com/intent/tweet?url={{vm.uri | urlEncode}}&hashtags=annotated\"\n      target=\"_blank\"\n      title=\"{{'Tweet link' | translate}}\"\n      class=\"annotation-share-dialog-target__icon h-icon-twitter\"\n      ng-click=\"vm.onShareClick('twitter')\"></a>\n    <a href=\"https://www.facebook.com/sharer/sharer.php?u={{vm.uri | urlEncode}}\"\n      target=\"_blank\"\n      title=\"{{'Share on Facebook' | translate}}\"\n      class=\"annotation-share-dialog-target__icon h-icon-facebook\"\n      ng-click=\"vm.onShareClick('facebook')\"></a>\n    <a href=\"https://plus.google.com/share?url={{vm.uri | urlEncode}}\"\n      target=\"_blank\"\n      title=\"{{'Post on Google Plus' | translate}}\"\n      class=\"annotation-share-dialog-target__icon h-icon-google-plus\"\n      ng-click=\"vm.onShareClick('googlePlus')\"></a>\n    <a href=\"mailto:?subject=Let's%20Annotate&amp;body={{vm.uri}}\"\n      target=\"_blank\"\n      title=\"{{'Share via email' | translate}}\"\n      class=\"annotation-share-dialog-target__icon h-icon-mail\"\n      ng-click=\"vm.onShareClick('email')\"></a>\n  </div>\n  <div class=\"annotation-share-dialog-link\" type=\"text\">\n    <input class=\"annotation-share-dialog-link__text\"\n      value=\"{{vm.uri}}\" readonly>\n    <span class=\"annotation-share-dialog-link__feedback\" ng-if=\"vm.copyToClipboardMessage\">\n      {{vm.copyToClipboardMessage}}\n    </span>\n    <button class=\"btn btn-clean annotation-share-dialog-link__btn\"\n      ng-click=\"vm.copyToClipboard($event)\">\n      <i class=\"h-icon-clipboard btn-icon\"></i>\n    </button>\n  </div>\n  <div class=\"annotation-share-dialog-msg\" ng-if=\"vm.group && !vm.group.public && !vm.isPrivate\">\n    <span class=\"annotation-share-dialog-msg__audience\">\n      {{'Group.' | translate}}\n    </span>\n    {{'Only group members will be able to view this annotation.' | translate}}\n  </div>\n  <div class=\"annotation-share-dialog-msg\" ng-if=\"vm.isPrivate\">\n    <span class=\"annotation-share-dialog-msg__audience\">\n      {{'Only me.' | translate}}\n    </span>\n    {{'No one else will be able to view this annotation.' | translate}}\n  </div>\n</div>\n";

},{}],140:[function(require,module,exports){
module.exports = "<div ng-class=\"vm.threadClasses()\">\n  <div class=\"annotation-thread__thread-edge\" ng-if=\"!vm.isTopLevelThread()\">\n    <a href=\"\"\n       ng-class=\"vm.threadToggleClasses()\"\n       title=\"{{(vm.thread.collapsed && 'Expand' | translate) || ('Collapse' | translate)}}\"\n       ng-click=\"vm.toggleCollapsed()\">\n       <span ng-class=\"{'h-icon-arrow-right': vm.thread.collapsed,\n                        'h-icon-arrow-drop-down': !vm.thread.collapsed}\"></span>\n    </a>\n    <div class=\"annotation-thread__thread-line\"></div>\n  </div>\n  <div class=\"annotation-thread__content\">\n    <moderation-banner annotation=\"vm.thread.annotation\"\n                       ng-if=\"vm.thread.annotation\">\n    </moderation-banner>\n    <annotation ng-class=\"vm.annotationClasses()\"\n             annotation=\"vm.thread.annotation\"\n             is-collapsed=\"vm.thread.collapsed\"\n             name=\"annotation\"\n             ng-mouseenter=\"vm.annotationHovered = true\"\n             ng-mouseleave=\"vm.annotationHovered = false\"\n             ng-if=\"vm.thread.annotation\"\n             ng-show=\"vm.thread.visible\"\n             show-document-info=\"vm.showDocumentInfo\"\n             on-reply-count-click=\"vm.toggleCollapsed()\"\n             reply-count=\"vm.thread.replyCount\">\n    </annotation>\n\n    <div ng-if=\"!vm.thread.annotation\" class=\"thread-deleted\">\n      <p><em>{{'Message not available.' | translate}}</em></p>\n    </div>\n\n    <div ng-if=\"vm.hiddenCount() > 0\">\n      <a class=\"small\"\n         href=\"\"\n         ng-click=\"vm.showThreadAndReplies()\"\n         ng-pluralize\n         count=\"vm.hiddenCount()\"\n         when=\"{'0': '',\n               one: 'View one more in conversation',\n               other: 'View {} more in conversation'}\"\n         ></a>\n    </div>\n\n    <!-- Replies -->\n    <ul ng-show=\"!vm.thread.collapsed\">\n      <li ng-repeat=\"child in vm.thread.children track by child.id\"\n          ng-show=\"vm.shouldShowReply(child)\">\n        <annotation-thread\n          show-document-info=\"false\"\n          thread=\"child\"\n          on-change-collapsed=\"vm.onChangeCollapsed({id:id, collapsed:collapsed})\"\n          on-force-visible=\"vm.onForceVisible({thread:thread})\">\n        </annotation-thread>\n      </li>\n    </ul>\n  </div>\n</div>\n";

},{}],141:[function(require,module,exports){
module.exports = "<thread-list\n  on-change-collapsed=\"vm.setCollapsed(id, collapsed)\"\n  on-force-visible=\"vm.forceVisible(thread)\"\n  show-document-info=\"true\"\n  thread=\"vm.rootThread\">\n</thread-list>\n";

},{}],142:[function(require,module,exports){
module.exports = "<header class=\"annotation-header\" ng-if=\"!vm.user()\">\n  <strong>{{'You must be logged in to leave feedback.' | translate}}</strong>\n</header>\n\n<div ng-keydown=\"vm.onKeydown($event)\" ng-if=\"vm.user()\">\n\n  <!-- Excerpts -->\n  <section class=\"annotation-quote-list\"\n    ng-class=\"{'is-orphan' : vm.isOrphan()}\"\n    ng-if=\"vm.quote()\">\n    <excerpt collapsed-height=\"35\"\n      inline-controls=\"true\"\n      overflow-hysteresis=\"20\"\n      content-data=\"selector.exact\">\n      <blockquote class=\"annotation-quote\"\n        h-branding=\"selectionFontFamily\"\n        ng-bind=\"vm.quote()\"></blockquote>\n    </excerpt>\n  </section>\n\n  <!-- / Excerpts -->\n\n  <!-- Body -->\n  <section name=\"text\" class=\"annotation-body\">\n    <excerpt enabled=\"!vm.editing()\"\n      inline-controls=\"false\"\n      on-collapsible-changed=\"vm.setBodyCollapsible(collapsible)\"\n      collapse=\"vm.collapseBody\"\n      collapsed-height=\"400\"\n      overflow-hysteresis=\"20\"\n      content-data=\"vm.state().text\">\n      <markdown text=\"vm.state().text\"\n                custom-text-class=\"{'annotation-body is-hidden':vm.isHiddenByModerator(),\n                                    'has-content':vm.hasContent()}\"\n                on-edit-text=\"vm.setText(text)\"\n                read-only=\"!vm.editing()\">\n      </markdown>\n    </excerpt>\n  </section>\n  <!-- / Body -->\n  <annotation-header annotation=\"vm.annotation\"\n                    ng-hide=\"vm.editing()\"\n                     is-editing=\"vm.editing()\"\n                     is-highlight=\"vm.isHighlight()\"\n                     is-private=\"vm.state().isPrivate\"\n                     on-reply-count-click=\"vm.onReplyCountClick()\"\n                     reply-count=\"vm.replyCount\"\n                     show-document-info=\"vm.showDocumentInfo\">\n  </annotation-header>\n\n  <!-- Tags -->\n  <div class=\"annotation-body form-field\" ng-if=\"vm.editing() && !vm.isThemeCustom\">\n    <tag-editor tags=\"vm.state().tags\"\n                on-edit-tags=\"vm.setTags(tags)\"></tag-editor>\n  </div>\n\n  <div class=\"annotation-body u-layout-row tags tags-read-only\"\n       ng-if=\"(vm.canCollapseBody || vm.state().tags.length) && !vm.editing()\">\n    <ul class=\"tag-list\" ng-if=\"vm.isThemeCustom\">\n      <li class=\"tag-item\" ng-repeat=\"tag in vm.state().tags\">\n        <a ng-href=\"{{vm.tagSearchURL(tag)}}\" target=\"_blank\">{{tag}}</a>\n      </li>\n    </ul>\n    <div class=\"u-stretch\"></div>\n    <a class=\"annotation-link u-strong\" ng-show=\"vm.canCollapseBody\"\n      ng-click=\"vm.toggleCollapseBody($event)\"\n      ng-title=\"vm.collapseBody ? ('Show the full annotation text' | translate): ('Show the first few lines only' | translate)\"\n      ng-bind=\"vm.collapseBody ? ('More' | translate) : ('Less' | translate)\"\n      h-branding=\"accentColor\"></a>\n  </div>\n  <!-- / Tags -->\n\n  <footer class=\"annotation-footer\">\n    <div class=\"annotation-form-actions\" ng-if=\"vm.editing()\">\n      <publish-annotation-btn\n        class=\"publish-annotation-btn\"\n        group=\"vm.group()\"\n        can-post=\"vm.hasContent()\"\n        is-shared=\"vm.isShared()\"\n        on-cancel=\"vm.revert()\"\n        on-save=\"vm.save()\"\n        on-set-privacy=\"vm.setPrivacy(level)\"></publish-annotation-btn>\n    </div>\n\n    <div class=\"annotation-section annotation-license\"\n         ng-show=\"vm.shouldShowLicense()\"\n         ng-if=\"!vm.isThemeCustom\">\n      <a class=\"annotation-license__link\" href=\"http://creativecommons.org/publicdomain/zero/1.0/\"\n        title=\"{{'View more information about the Creative Commons Public Domain dedication' | translate}}\"\n        target=\"_blank\">\n        <i class=\"h-icon-cc-logo\"></i><i class=\"h-icon-cc-zero\"></i>\n        {{'Feedback can be freely reused by anyone for any purpose.' | translate}}\n      </a>\n    </div>\n\n    <div class=\"annotation-replies\" ng-if=\"!vm.isReply() && vm.replyCount > 0\">\n      <a href=\"\"\n        ng-click=\"vm.onReplyCountClick()\">\n        <span class=\"annotation-replies__link\">{{ vm.isCollapsed ? ('Show replies' | translate) : ('Hide replies' | translate)}}</span>\n        <span class=\"annotation-replies__count\">({{ vm.replyCount }})</span>\n      </a>\n    </div>\n\n    <div class=\"annotation-actions\" ng-if=\"vm.isSaving\">\n      {{'Saving...' | translate}}\n    </div>\n\n    <div class=\"annotation-actions\" ng-if=\"!vm.isSaving && !vm.editing() && vm.id()\">\n      <div ng-show=\"vm.isSaving\">{{'Saving...' | translate}}</div>\n      <annotation-action-button\n        icon=\"'h-icon-annotation-edit'\"\n        is-disabled=\"vm.isDeleted()\"\n        label=\"'Edit' | translate\"\n        ng-show=\"vm.authorize('update') && !vm.isSaving\"\n        on-click=\"vm.edit()\"\n      ></annotation-action-button>\n      <annotation-action-button\n        icon=\"'h-icon-annotation-delete'\"\n        is-disabled=\"vm.isDeleted()\"\n        label=\"'Delete' | translate\"\n        ng-show=\"vm.authorize('delete')\"\n        on-click=\"vm.delete()\"\n      ></annotation-action-button>\n\n      <!-- Reply Button - is only visible if the theme is not custom -->\n      <annotation-action-button\n        ng-if=\"!vm.isThemeCustom\"\n        icon=\"'h-icon-annotation-reply'\"\n        is-disabled=\"vm.isDeleted()\"\n        label=\"'Reply' | translate\"\n        on-click=\"vm.reply()\"\n      ></annotation-action-button>\n\n       <!-- Share - is only visible if the theme is not custom -->\n      <span class=\"annotation-share-dialog-wrapper\" ng-if=\"vm.incontextLink() && !vm.isThemeCustom\">\n        <annotation-action-button\n         icon=\"'h-icon-annotation-share'\"\n         is-disabled=\"vm.isDeleted()\"\n         label=\"'Share' | translate\"\n         on-click=\"vm.showShareDialog = true\"\n        ></annotation-action-button>\n        <annotation-share-dialog\n          group=\"vm.group()\"\n          uri=\"vm.incontextLink()\"\n          is-private=\"vm.state().isPrivate\"\n          is-open=\"vm.showShareDialog\"\n          on-close=\"vm.showShareDialog = false\">\n        </annotation-share-dialog>\n      </span>\n\n      <!-- Flag - is only visible if the theme is not custom -->\n      <span ng-if=\"!vm.isThemeCustom\">\n        <annotation-action-button\n         icon=\"'h-icon-annotation-flag'\"\n         is-disabled=\"vm.isDeleted()\"\n         label=\"'Report this annotation to the moderators' | translate\"\n         ng-if=\"!vm.isFlagged()\"\n         on-click=\"vm.flag()\"\n        ></annotation-action-button>\n        <annotation-action-button\n         icon=\"'h-icon-annotation-flag annotation--flagged'\"\n         is-disabled=\"vm.isDeleted()\"\n         label=\"'Feedback has been reported to the moderators' | translate\"\n         ng-if=\"vm.isFlagged()\"\n         ></annotation-action-button>\n        </annotation-action-button>\n      </span>\n    </div>\n  </footer>\n</div>\n";

},{}],143:[function(require,module,exports){
module.exports = "<div class=\"dropdown-menu-btn\" >\n  <button\n    class=\"dropdown-menu-btn__btn\"\n    ng-bind=\"vm.label\"\n    ng-click=\"vm.onClick($event)\"\n    ng-disabled=\"vm.isDisabled\"\n    h-branding=\"ctaTextColor, ctaBackgroundColor\">\n  </button>\n  <button\n    class=\"dropdown-menu-btn__dropdown-arrow\"\n    title=\"{{vm.dropdownMenuLabel}}\"\n    ng-click=\"vm.toggleDropdown($event)\">\n    <div class=\"dropdown-menu-btn__dropdown-arrow-separator\"></div>\n    <div\n      class=\"dropdown-menu-btn__dropdown-arrow-indicator\"\n      h-branding=\"ctaTextColor, ctaBackgroundColor\">\n      <div>▼</div>\n    </div>\n  </button>\n</div>\n";

},{}],144:[function(require,module,exports){
module.exports = "<div ng-transclude ng-if=\"!vm.enabled\"></div>\n<div class=\"excerpt__container\" ng-if=\"vm.enabled\">\n  <div class=\"excerpt\" ng-style=\"vm.contentStyle()\">\n    <div ng-transclude></div>\n    <div ng-click=\"vm.expand()\"\n         ng-class=\"vm.bottomShadowStyles()\"\n         title=\"{{'Show the full excerpt' | translate}}\"></div>\n    <div class=\"excerpt__inline-controls\"\n         ng-show=\"vm.showInlineControls()\">\n      <span class=\"excerpt__toggle-link\" ng-show=\"vm.isExpandable()\">\n        … <a ng-click=\"vm.toggle($event)\"\n            title=\"{{'Show the full excerpt' | translate}}\"\n            h-branding=\"accentColor, selectionFontFamily\">{{'More' | translate}}</a>\n      </span>\n      <span class=\"excerpt__toggle-link\" ng-show=\"vm.isCollapsible()\">\n        <a ng-click=\"vm.toggle($event)\"\n            title=\"{{'Show the first few lines only' | translate}}\"\n            h-branding=\"accentColor, selectionFontFamily\">{{'Less' | translate}}</a>\n      </span>\n    </div>\n  </div>\n</div>\n";

},{}],145:[function(require,module,exports){
module.exports = "<span ng-if=\"vm.auth.status === 'logged-out'\"\n      ng-switch on=\"vm.groups.focused().public\">\n  <img class=\"group-list-label__icon group-list-label__icon--third-party\"\n    ng-src=\"{{ vm.thirdPartyGroupIcon }}\"\n    ng-if=\"vm.thirdPartyGroupIcon\"\n    ng-switch-when=\"true\"><!-- nospace\n  !--><i class=\"group-list-label__icon h-icon-public\"\n    ng-if=\"!vm.thirdPartyGroupIcon\"\n    ng-switch-when=\"true\"></i><!-- nospace\n  !--><i class=\"group-list-label__icon h-icon-group\" ng-switch-default></i>\n  <span class=\"group-list-label__label\">{{vm.groups.focused().name}}</span>\n</span>\n\n<div class=\"pull-right\"\n     ng-if=\"vm.auth.status === 'logged-in'\"\n     dropdown\n     keyboard-nav>\n  <div class=\"dropdown-toggle\"\n        dropdown-toggle\n        data-toggle=\"dropdown\"\n        role=\"button\"\n        ng-switch on=\"vm.groups.focused().public\"\n        title=\"{{'Change the selected group' | translate}}\">\n    <img class=\"group-list-label__icon group-list-label__icon--third-party\"\n         ng-src=\"{{ vm.thirdPartyGroupIcon }}\"\n         ng-if=\"vm.thirdPartyGroupIcon\"\n         ng-switch-when=\"true\"><!-- nospace\n    !--><i class=\"group-list-label__icon h-icon-public\"\n           ng-switch-when=\"true\"\n           ng-if=\"!vm.thirdPartyGroupIcon\"></i><!-- nospace\n    !--><i class=\"group-list-label__icon h-icon-group\"\n           ng-switch-default></i>\n    <span class=\"group-list-label__label\">{{vm.groups.focused().name}}</span><!-- nospace\n    !--><i class=\"h-icon-arrow-drop-down\"></i>\n  </div>\n  <div class=\"dropdown-menu__top-arrow\"></div>\n  <ul class=\"dropdown-menu pull-none\" role=\"menu\">\n    <li class=\"dropdown-menu__row dropdown-menu__row--unpadded \"\n        ng-repeat=\"group in vm.groups.all()\">\n      <div ng-class=\"{'group-item': true, selected: group.id == vm.groups.focused().id}\"\n           ng-click=\"vm.focusGroup(group.id)\">\n        <!-- the group icon !-->\n        <div class=\"group-icon-container\" ng-switch on=\"group.public\">\n          <img class=\"group-list-label__icon group-list-label__icon--third-party\"\n               ng-src=\"{{ vm.thirdPartyGroupIcon }}\"\n               ng-if=\"vm.thirdPartyGroupIcon\"\n               ng-switch-when=\"true\">\n          <i class=\"h-icon-public\" ng-if=\"!vm.thirdPartyGroupIcon\" ng-switch-when=\"true\"></i>\n          <i class=\"h-icon-group\" ng-switch-default></i>\n        </div>\n        <!-- the group name and share link !-->\n        <div class=\"group-details\">\n          <div class=\"group-name-container\">\n            <a class=\"group-name-link\"\n               href=\"\"\n               title=\"{{ group.public ? ('Show public annotations' | translate ) : ('Show and create annotations in ' | translate) + group.name  }}\">\n               {{group.name}}\n            </a>\n          </div>\n          <div class=\"share-link-container\" ng-click=\"$event.stopPropagation()\" ng-if=\"!group.public\">\n            <a class=\"share-link\"\n               href=\"{{group.url}}\"\n               target=\"_blank\"\n               ng-click=\"vm.viewGroupActivity()\">\n              {{'View group activity and invite others' | translate}}\n            </a>\n          </div>\n        </div>\n        <!-- the 'Leave group' icon !-->\n        <div class=\"group-cancel-icon-container\" ng-click=\"$event.stopPropagation()\">\n          <i class=\"h-icon-cancel-outline btn--cancel\"\n             ng-if=\"!group.public\"\n             ng-click=\"vm.leaveGroup(group.id)\"\n             title=\"'Leave' | translate '{{group.name}}'\"></i>\n        </div>\n      </div>\n    </li>\n    <li ng-if=\"!vm.isThirdPartyUser()\" class=\"dropdown-menu__row dropdown-menu__row--unpadded new-group-btn\">\n      <div class=\"group-item\" ng-click=\"vm.createNewGroup()\">\n        <div class=\"group-icon-container\"><i class=\"h-icon-add\"></i></div>\n        <div class=\"group-details\">\n          <a href=\"\" class=\"group-name-link\" title=\"{{'Create a new group to share annotations' | translate}}\">\n            {{'New group' | translate}}\n          </a>\n        </div>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],146:[function(require,module,exports){
module.exports = "\n<a class=\"help-panel-content__link\"\n   href=\"mailto:support@hypothes.is?subject=Hypothesis%20support&amp;body=Version:%20{{ vm.version }}%0D%0AUser%20Agent:%20{{vm.userAgent}}%0D%0AURL:%20{{ vm.url }}%0D%0APDF%20fingerprint:%20{{ vm.documentFingerprint ? vm.documentFingerprint : '-' }}%0D%0AUsername:%20{{ vm.auth.username ? vm.auth.username : '-' }}%0D%0ADate:%20{{ vm.dateTime | date:'dd MMM yyyy HH:mm:ss Z' }} \"\n>{{'Send us an email' | translate}}</a>\n";

},{}],147:[function(require,module,exports){
module.exports = "<div class=\"help-panel\">\n  <i class=\"close h-icon-close\"\n    role=\"button\"\n    title=\"{{'Close' | translate}}\"\n    ng-click=\"vm.onClose()\"></i>\n\n  <header class=\"help-panel-title\">\n    {{'Help' | translate}}\n  </header>\n  <div class=\"help-panel-content\">\n    <help-link\n      version=\"vm.version\"\n      user-agent=\"vm.userAgent\"\n      url=\"vm.url\"\n      document-fingerprint=\"vm.documentFingerprint\"\n      auth=\"vm.auth\"\n      date-time=\"vm.dateTime\">\n    </help-link>\n    <p ng-bind-html=\"'if you have any questions or want to give us feedback.\n    You can also send <a class=\\'help-panel-content__link\\' href=\\'https://hypothesis.zendesk.com/hc/en-us/requests/new\\' target=\\'_blank\\'>a support ticket</a>\n    or visit our <a class=\\'help-panel-content__link\\' href=\\'https://hypothesis.zendesk.com/hc/en-us\\' target=\\'_blank\\'> help documents</a>.' | translate\"\n    ></p>\n  </div>\n  <header class=\"help-panel-title\">\n    {{'About this version' | translate}}\n  </header>\n  <dl class=\"help-panel-content\">\n    <dt class=\"help-panel-content__key\">{{'Version' | translate}}: </dt>\n    <dd class=\"help-panel-content__val\">{{ vm.version }}</dd>\n    <dt class=\"help-panel-content__key\">{{'User agent' | translate}}: </dt>\n    <dd class=\"help-panel-content__val\">{{ vm.userAgent }}</dd>\n    <div ng-if=\"vm.url\">\n      <dt class=\"help-panel-content__key\">{{'URL' | translate}}: </dt>\n      <dd class=\"help-panel-content__val\">{{ vm.url }}</dd>\n    </div>\n    <div ng-if=\"vm.documentFingerprint\">\n      <dt class=\"help-panel-content__key\">{{'PDF fingerprint' | translate}}: </dt>\n      <dd class=\"help-panel-content__val\">{{ vm.documentFingerprint }}</dd>\n    </div>\n    <div ng-if=\"vm.auth.userid\">\n      <dt class=\"help-panel-content__key\">{{'Username' | translate}}: </dt>\n      <dd class=\"help-panel-content__val\">{{ vm.auth.username }}</dd>\n    </div>\n    <dt class=\"help-panel-content__key\">{{'Date' | translate}}: </dt>\n    <dd class=\"help-panel-content__val\">{{ vm.dateTime | date:'dd MMM yyyy HH:mm:ss Z' }}</dd>\n  </div>\n</div>\n";

},{}],148:[function(require,module,exports){
module.exports = "<div class=\"app-content-wrapper js-thread-list-scroll-root\" h-branding=\"appBackgroundColor\">\n  <top-bar\n    auth=\"vm.auth\"\n    on-login=\"vm.login()\"\n    on-sign-up=\"vm.signUp()\"\n    on-logout=\"vm.logout()\"\n    on-share-page=\"vm.share()\"\n    on-show-help-panel=\"vm.showHelpPanel()\"\n    is-sidebar=\"::vm.isSidebar\"\n    pending-update-count=\"vm.countPendingUpdates()\"\n    on-apply-pending-updates=\"vm.applyPendingUpdates()\"\n    search-controller=\"vm.search\"\n    sort-key=\"vm.sortKey()\"\n    sort-keys-available=\"vm.sortKeysAvailable()\"\n    on-change-sort-key=\"vm.setSortKey(sortKey)\">\n  </top-bar>\n\n  <div class=\"content\">\n    <sidebar-tutorial ng-if=\"vm.isSidebar\"></sidebar-tutorial>\n    <share-dialog\n      ng-if=\"vm.shareDialog.visible\"\n      on-close=\"vm.shareDialog.visible = false\">\n    </share-dialog>\n    <help-panel ng-if=\"vm.helpPanel.visible\"\n      on-close=\"vm.helpPanel.visible = false\"\n      auth=\"vm.auth\">\n    </help-panel>\n    <main ng-view=\"\"></main>\n  </div>\n</div>\n";

},{}],149:[function(require,module,exports){
module.exports = "<!-- message to display to loggedout users when they visit direct linked annotations -->\n<li class=\"loggedout-message\">\n  <span>\n    {{'This is a public annotation created with Hypothesis.' | translate}}\n    <br>\n    <p ng-bing-html=\"'To reply or make your own annotations on this document,\n    <a class=\\'loggedout-message__link\\' href=\\'{{vm.serviceUrl(\\'signup\\')}}\\' target=\\'_blank\\'>create a free account</a>\n    or\n    <a class=\\'loggedout-message__link\\' href=\\'\\' ng-click=\\'vm.onLogin()\\'>log in</a>.' | translate\"\n  </span>\n  <span class=\"loggedout-message-logo\">\n    <a href=\"https://hypothes.is\">\n      <i class=\"h-icon-hypothesis-logo loggedout-message-logo__icon\"></i>\n    </a>\n  </span>\n</li>\n";

},{}],150:[function(require,module,exports){
module.exports = "<!-- New controls -->\n<span class=\"login-text\"\n      ng-if=\"vm.newStyle && vm.auth.status === 'unknown'\">⋯</span>\n<span class=\"login-text\"\n      ng-if=\"vm.newStyle && vm.auth.status === 'logged-out'\">\n  <a href=\"\" ng-click=\"vm.onSignUp()\" target=\"_blank\" h-branding=\"accentColor\">{{'Sign up' | translate}}</a>\n  / <a href=\"\" ng-click=\"vm.onLogin()\" h-branding=\"accentColor\">{{'Log in' | translate}}</a>\n</span>\n<div ng-if=\"vm.newStyle\"\n     class=\"pull-right login-control-menu\"\n     dropdown\n     keyboard-nav>\n  <a role=\"button\"\n     class=\"top-bar__btn\"\n     data-toggle=\"dropdown\"\n     dropdown-toggle\n     title=\"{{vm.auth.username}}\">\n    <i class=\"h-icon-account\" ng-if=\"vm.auth.status === 'logged-in'\"></i><!--\n    !--><i class=\"h-icon-arrow-drop-down top-bar__dropdown-arrow\"></i>\n  </a>\n  <ul class=\"dropdown-menu pull-right\" role=\"menu\">\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.auth.status === 'logged-in'\">\n      <span ng-if=\"!vm.shouldEnableProfileButton()\"\n            class=\"dropdown-menu__link dropdown-menu__link--disabled js-user-profile-btn is-disabled\">\n        {{vm.auth.displayName}}</span>\n      <a ng-if=\"vm.shouldEnableProfileButton()\"\n         ng-click=\"vm.showProfile()\"\n         class=\"dropdown-menu__link js-user-profile-btn is-enabled\"\n         title=\"{{'View all your annotations' | translate}}\"\n         target=\"_blank\">{{vm.auth.displayName}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.auth.status === 'logged-in' && !vm.isThirdPartyUser()\">\n      <a class=\"dropdown-menu__link js-account-settings-btn\" href=\"{{vm.serviceUrl('account.settings')}}\" target=\"_blank\">{{'Account settings' | translate}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\">\n      <a class=\"dropdown-menu__link js-help-btn\" ng-click=\"vm.onShowHelpPanel()\">{{'Help' | translate}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.shouldShowLogOutButton()\">\n      <a class=\"dropdown-menu__link dropdown-menu__link--subtle js-log-out-btn\"\n         href=\"\" ng-click=\"vm.onLogout()\">{{'Log out' | translate}}</a>\n    </li>\n  </ul>\n</div>\n\n<!-- Old controls -->\n<span ng-if=\"!vm.newStyle && vm.auth.status === 'unknown'\">⋯</span>\n<span ng-if=\"!vm.newStyle && vm.auth.status === 'logged-out'\">\n  <a href=\"\" ng-click=\"vm.onLogin()\">{{'Log in' | translate}}</a>\n</span>\n<div ng-if=\"!vm.newStyle\"\n     class=\"pull-right login-control-menu\"\n     dropdown\n     keyboard-nav>\n  <span role=\"button\" data-toggle=\"dropdown\" dropdown-toggle>\n    {{vm.auth.username}}<!--\n    --><span class=\"provider\"\n             ng-if=\"vm.auth.provider\">/{{vm.auth.provider}}</span><!--\n    --><i class=\"h-icon-arrow-drop-down\"></i>\n  </span>\n  <ul class=\"dropdown-menu pull-right\" role=\"menu\">\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.auth.status === 'logged-in'\">\n      <a class=\"dropdown-menu__link\" href=\"{{vm.serviceUrl('account.settings')}}\" target=\"_blank\">{{'Account' | translate}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\" >\n      <a class=\"dropdown-menu__link\" ng-click=\"vm.onShowHelpPanel()\">{{'Help' | translate}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.auth.status === 'logged-in'\">\n      <a class=\"dropdown-menu__link\" href=\"{{vm.serviceUrl('user',{user: vm.auth.username})}}\"\n         target=\"_blank\">{{'My Annotations' | translate}}</a>\n    </li>\n    <li class=\"dropdown-menu__row\" ng-if=\"vm.auth.status === 'logged-in'\">\n      <a class=\"dropdown-menu__link\" href=\"\" ng-click=\"vm.onLogout()\">{{'Log out' | translate}}</a>\n    </li>\n  </ul>\n</div>\n";

},{}],151:[function(require,module,exports){
module.exports = "<div ng-if=\"!vm.readOnly && !vm.isThemeCustom\" class=\"markdown-tools\" ng-class=\"vm.preview && 'disable'\">\n  <span class=\"markdown-preview-toggle\">\n    <a class=\"markdown-tools-badge h-icon-markdown\" href=\"https://help.github.com/articles/markdown-basics\" title=\"{{'Parsed as Markdown' | translate}}\" target=\"_blank\"></a>\n    <a href=\"\" class=\"markdown-tools-toggle\" ng-click=\"vm.togglePreview()\"\n      ng-show=\"!vm.preview\">{{'Preview' | translate}}</a>\n    <a href=\"\" class=\"markdown-tools-toggle\" ng-click=\"vm.togglePreview()\"\n      ng-show=\"vm.preview\">{{'Write' | translate}}</a>\n  </span>\n  <i class=\"h-icon-format-bold markdown-tools-button\" ng-click=\"vm.insertBold()\" title=\"{{'Embolden text' | translate}}\"></i>\n  <i class=\"h-icon-format-italic markdown-tools-button\" ng-click=\"vm.insertItalic()\" title=\"{{'Italicize text' | translate}}\"></i>\n  <i class=\"h-icon-format-quote markdown-tools-button\" ng-click=\"vm.insertQuote()\" title=\"{{'Quote text' | translate}}\"></i>\n  <i class=\"h-icon-insert-link markdown-tools-button\" ng-click=\"vm.insertLink()\" title=\"{{'Insert link' | translate}}\"></i>\n  <i class=\"h-icon-insert-photo markdown-tools-button\" ng-click=\"vm.insertIMG()\" title=\"{{'Insert image' | translate}}\"></i>\n  <i class=\"h-icon-functions markdown-tools-button\" ng-click=\"vm.insertMath()\" title=\"{{'Insert mathematical notation (LaTex is supported)' | translate}}\"></i>\n  <i class=\"h-icon-format-list-numbered markdown-tools-button\" ng-click=\"vm.insertNumList()\" title=\"{{'Insert numbered list' | translate}}\"></i>\n  <i class=\"h-icon-format-list-bulleted markdown-tools-button\" ng-click=\"vm.insertList()\" title=\"{{'Insert list' | translate}}\"></i>\n</div>\n<textarea class=\"form-input form-textarea js-markdown-input\"\n          ng-show=\"vm.showEditor()\"\n          ng-click=\"$event.stopPropagation()\"\n          h-branding=\"annotationFontFamily\"></textarea>\n<div class=\"markdown-body js-markdown-preview\"\n     ng-class=\"(vm.preview && 'markdown-preview') || vm.customTextClass\"\n     ng-dblclick=\"vm.togglePreview()\"\n     ng-show=\"!vm.showEditor()\"\n     h-branding=\"annotationFontFamily\"></div>\n";

},{}],152:[function(require,module,exports){
module.exports = "<div class=\"moderation-banner\"\n     ng-if=\"vm.isHiddenOrFlagged()\"\n     ng-class=\"{'is-flagged': vm.flagCount() > 0,\n                'is-hidden': vm.isHidden(),\n                'is-reply': vm.isReply()}\">\n  <span ng-if=\"vm.flagCount() > 0 && !vm.isHidden()\">\n    Flagged for review x{{ vm.flagCount() }}\n  </span>\n  <span ng-if=\"vm.isHidden()\">\n    {{'Hidden from users.' | translate}} Flagged x{{ vm.flagCount() }}\n  </span>\n  <span class=\"u-stretch\"></span>\n  <button ng-if=\"!vm.isHidden()\"\n          ng-click=\"vm.hideAnnotation()\"\n          title=\"{{'Hide this feedback from non-moderators' | translate}}\">\n    {{'Hide' | translate}}\n  </button>\n  <button ng-if=\"vm.isHidden()\"\n          ng-click=\"vm.unhideAnnotation()\"\n          title=\"{{'Make this feedback visible to everyone' | translate}}\">\n    {{'Unhide' | translate}}\n  </button>\n</div>\n";

},{}],153:[function(require,module,exports){
module.exports = "<button class=\"new-note__create\" ng-click=\"vm.onNewNoteBtnClick()\" h-branding=\"ctaBackgroundColor\">\n  + {{'New note' | translate}}\n</button>\n";

},{}],154:[function(require,module,exports){
module.exports = "<div ng-if=\"!vm.isThemeCustom\" class=\"privateFeedbackInput\"><input type=\"checkbox\" id=\"privateCheckbox\"  name=\"private-feedback\" ng-model=\"vm.private\" ng-change=\"vm.setPrivacy(vm.private)\"><label for=\"privateCheckbox\"><i class=\"h-icon-visibility-off\"></i>Private - visible to Red Hat only</label></div>\n<button class=\"publish-annotation-cancel-btn btn-clean\"\n        ng-click=\"vm.onCancel()\"\n        title=\"{{'Cancel changes to this feedback' | translate}}\"\n        >\n  <!-- <i class=\"h-icon-cancel-outline publish-annotation-cancel-btn__icon btn-icon\"></i> -->\n  {{'Cancel' | translate}}\n</button>\n<button class=\"btn-app btn-update\"\n        ng-click=\"vm.onSave()\"\n        title=\"{{'Submit' | translate}}\"\n        >\n  <!-- <i class=\"h-icon-cancel-outline publish-annotation-cancel-btn__icon btn-icon\"></i> -->\n  {{'Submit' | translate}}\n</button>\n\n\n\n<!-- If the theme is not custom -->\n<div ng-if=\"!vm.isThemeCustom\" dropdown=\"\" class=\"publish-annotation-btn__btn\" is-open=\"vm.showDropdown\" keyboard-nav>\n  <dropdown-menu-btn\n    label=\"('Post to' | translate) + ' ' + vm.publishDestination()\"\n    on-click=\"vm.onSave()\"\n    on-toggle-dropdown=\"vm.showDropdown = !vm.showDropdown\"\n    title=\"{{'Publish this feedback to' | translate}} {{vm.publishDestination()}}\"\n    dropdown-menu-label=\"{{'Change annotation sharing setting' | translate}}\"\n    is-disabled=\"!vm.canPost\">\n  </dropdown-menu-btn>\n  <div class=\"publish-annotation-btn__dropdown-container\">\n    <ul class=\"dropdown-menu pull-center group-list publish-annotation-btn__dropdown-menu\" role=\"menu\">\n      <li class=\"dropdown-menu__row\" ng-click=\"vm.setPrivacy('shared')\">\n        <div class=\"group-item\">\n          <div class=\"group-icon-container\">\n            <i class=\"small\" ng-class=\"'h-icon-' + vm.groupType()\"></i>\n          </div>\n          <div class=\"group-details\">\n            <div class=\"group-name-container\">\n              <a href=\"\" class=\"group-name-link\" ng-bind=\"vm.group.name\"></a>\n            </div>\n          </div>\n        </div>\n      </li>\n      <li class=\"dropdown-menu__row\" ng-click=\"vm.setPrivacy('private')\">\n        <div class=\"group-item\">\n          <div class=\"group-icon-container\">\n            <i class=\"small h-icon-lock\"></i>\n          </div>\n          <div class=\"group-details\">\n            <div class=\"group-name-container\">\n              <a href=\"\" class=\"group-name-link\" ng-bind=\"vm.privateLabel\"></a>\n            </div>\n          </div>\n        </div>\n      </li>\n    </ul>\n  </div>\n</div>\n";

},{}],155:[function(require,module,exports){
module.exports = "<form class=\"simple-search-form\"\n      name=\"searchForm\"\n      ng-class=\"!vm.query && 'simple-search-inactive'\">\n  <input class=\"simple-search-input\"\n         type=\"text\"\n         name=\"query\"\n         placeholder=\"{{vm.loading && ('Loading' | translate) || ('Search' | translate) }}…\"\n         ng-disabled=\"vm.loading\"\n         ng-class=\"vm.inputClasses()\"/>\n  <button type=\"button\" class=\"simple-search-icon top-bar__btn\" ng-hide=\"vm.loading\">\n    <i class=\"h-icon-search\"></i>\n  </button>\n  <button type=\"button\" class=\"simple-search-icon btn btn-clean\" ng-show=\"vm.loading\" disabled>\n    <span class=\"btn-icon\"><span class=\"spinner\"></span></span>\n  </button>\n</form>\n";

},{}],156:[function(require,module,exports){
module.exports = "<div class=\"search-status-bar\" ng-if=\"vm.filterActive\">\n  <button class=\"primary-action-btn primary-action-btn--short\"\n          ng-click=\"vm.onClearSelection()\"\n          title=\"{{'Clear the search filter and show all feedback' | translate}}\"\n  >\n    <i class=\"primary-action-btn__icon h-icon-close\"></i> {{'Clear search' | translate}}\n  </button>\n  <span ng-pluralize\n           count=\"vm.filterMatchCount\"\n           when=\"{'0': 'No results for “{{vm.searchQuery}}”',\n                  'one': '1 search result',\n                  'other': '{} search results'}\"></span>\n</div>\n<div class=\"search-status-bar\" ng-if=\"!vm.filterActive && vm.selectionCount > 0\">\n  <button class=\"primary-action-btn primary-action-btn--short\"\n          ng-click=\"vm.onClearSelection()\"\n          title=\"Clear the selection and show all annotations\">\n    <span ng-if=\"!vm.selectedTab || vm.selectedTab === vm.TAB_ORPHANS\">\n      {{'Show all feedback and notes' | translate}}\n    </span>\n    <span ng-if=\"vm.selectedTab === vm.TAB_ANNOTATIONS\">\n      {{'Show all feedback' | translate }}\n      <span ng-if=\"vm.totalAnnotations > 1\">\n        ({{vm.totalAnnotations}})\n      </span>\n    </span>\n    <span ng-if=\"vm.selectedTab === vm.TAB_NOTES\">\n      {{'Show all notes' | translate}}\n      <span ng-if=\"vm.totalNotes > 1\">\n        ({{vm.totalNotes}})\n      </span>\n    </span>\n  </button>\n\n</div>\n";

},{}],157:[function(require,module,exports){
module.exports = "<!-- Tabbed display of annotations and notes. -->\n<div class=\"selection-tabs\"\n  ng-if=\"!vm.isThemeCustom\"\n  ng-class=\"{'selection-tabs--theme-clean' : vm.isThemeClean }\">\n  <a class=\"selection-tabs__type\"\n     href=\"#\"\n     ng-class=\"{'is-selected': vm.selectedTab === vm.TAB_ANNOTATIONS}\"\n     h-on-touch=\"vm.selectTab(vm.TAB_ANNOTATIONS)\">\n     {{'Feedback' | translate}}\n    <span class=\"selection-tabs__count\"\n      ng-if=\"vm.totalAnnotations > 0 && !vm.isWaitingToAnchorAnnotations\">\n      {{ vm.totalAnnotations }}\n    </span>\n  </a>\n  <a class=\"selection-tabs__type\"\n     ng-if=\"!vm.isThemeCustom\"\n     href=\"#\"\n     ng-class=\"{'is-selected': vm.selectedTab === vm.TAB_NOTES}\"\n     h-on-touch=\"vm.selectTab(vm.TAB_NOTES)\">\n     {{'Page Notes' | translate}}\n    <span class=\"selection-tabs__count\"\n      ng-if=\"vm.totalNotes > 0 && !vm.isWaitingToAnchorAnnotations\">\n      {{ vm.totalNotes }}\n    </span>\n  </a>\n  <a class=\"selection-tabs__type selection-tabs__type--orphan\"\n    ng-if=\"vm.totalOrphans > 0 && !vm.isThemeCustom\"\n    href=\"#\"\n    ng-class=\"{'is-selected': vm.selectedTab === vm.TAB_ORPHANS}\"\n    h-on-touch=\"vm.selectTab(vm.TAB_ORPHANS)\">\n    {{'Orphans' | translate}}\n    <span class=\"selection-tabs__count\"\n      ng-if=\"vm.totalOrphans > 0 && !vm.isWaitingToAnchorAnnotations\">\n      {{ vm.totalOrphans }}\n    </span>\n  </a>\n</div>\n<new-note-btn\n  ng-if=\"vm.selectedTab === vm.TAB_NOTES && vm.enableExperimentalNewNoteButton\">\n</new-note-btn>\n<div ng-if=\"!vm.isLoading()\" class=\"selection-tabs__empty-message\">\n  <div ng-if=\"vm.showNotesUnavailableMessage() && !vm.isThemeCustom\"  class=\"annotation-unavailable-message\">\n    <p class=\"annotation-unavailable-message__label\">\n        {{'There are no page notes in this group.' | translate}}\n      <br />\n      <div ng-if=\"!vm.enableExperimentalNewNoteButton && !vm.showSidebarTutorial()\" class=\"annotation-unavailable-message__tutorial\">\n        <p ng-bind-html=\"'Create one by clicking the <i class=\\'help-icon h-icon-note\\'></i> button' | translate\"></p>\n      </div>\n    </p>\n  </div>\n  <div ng-if=\"vm.showAnnotationsUnavailableMessage()\"  class=\"annotation-unavailable-message\">\n    <p class=\"annotation-unavailable-message__label\">\n      {{'We welcome your feedback' | translate}}\n      <br />\n      <div ng-if=\"!vm.showSidebarTutorial()\" class=\"annotation-unavailable-message__tutorial\">\n        <p ng-bind-html=\"'Leave feedback on documentation by <span class=\\'annotation-unavailable-message__tutorial-highlight\\'> highlighting text. </span>' | translate\"></p>\n        <div class=\"sidebar-tutorial-svg_cursor\">\n          <svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n        \t viewBox=\"0 0 28 28\" enable-background=\"new 0 0 28 28\" xml:space=\"preserve\">\n           <polygon fill=\"#FFFFFF\" points=\"8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 \"/>\n           <polygon fill=\"#FFFFFF\" points=\"17.3,21.6 13.7,23.1 9,12 12.7,10.5 \"/>\n           <rect x=\"12.5\" y=\"13.6\" transform=\"matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)\" width=\"2\" height=\"8\"/>\n           <polygon points=\"9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 \"/>\n         </svg>\n       </div>\n      </div>\n    </p>\n  </div>\n</div>\n";

},{}],158:[function(require,module,exports){
module.exports = "<div class=\"sheet\">\n  <i class=\"close h-icon-close\"\n     role=\"button\"\n     title=\"{{'Close' | translate}}\"\n     ng-click=\"vm.onClose()\"></i>\n  <div class=\"form-vertical\">\n    <ul class=\"nav nav-tabs\">\n      <li class=\"active\"><a href=\"\">{{'Share' | translate}}</a></li>\n    </ul>\n    <div class=\"tab-content\">\n      <p>{{'Share the link below to show anyone these annotations and invite them to contribute their own.' | translate}}</p>\n      <p><input class=\"js-via form-input\"\n          type=\"text\"\n          ng-value=\"vm.viaPageLink\"\n          readonly /></p>\n      <p class=\"share-link-icons\">\n      <a href=\"https://twitter.com/intent/tweet?url={{vm.viaPageLink | urlEncode}}&hashtags=annotated\"\n         target=\"_blank\"\n         title=\"{{'Tweet link' | translate}}\"\n         class=\"share-link-icon h-icon-twitter\"\n         ng-click=\"onShareClick('twitter')\"></a>\n      <a href=\"https://www.facebook.com/sharer/sharer.php?u={{vm.viaPageLink | urlEncode}}\"\n         target=\"_blank\"\n         title=\"{{'Share on Facebook' | translate}}\"\n         class=\"share-link-icon h-icon-facebook\"\n         ng-click=\"onShareClick('facebook')\"></a>\n      <a href=\"https://plus.google.com/share?url={{vm.viaPageLink | urlEncode}}\"\n         target=\"_blank\"\n         title=\"{{'Post on Google Plus' | translate}}\"\n         class=\"share-link-icon h-icon-google-plus\"\n         ng-click=\"onShareClick('googlePlus')\"></a>\n      <a href=\"mailto:?subject=Let's%20Annotate&amp;body={{vm.viaPageLink}}\"\n         target=\"_blank\"\n         title=\"{{'Share via email' | translate}}\"\n         class=\"share-link-icon h-icon-mail\"\n         ng-click=\"onShareClick('email')\"></a>\n      </p>\n    </div>\n  </div>\n</div>\n";

},{}],159:[function(require,module,exports){
module.exports = "<div class=\"sidebar__header\">\n  <h3 class=\"sidebar__header-title\">Feedback</h3>\n  <!--add close button here-->\n  <button id=\"sidebar-toggle-close\" class=\"sidebar-close\" ng-click=\"vm.disableSidebar()\">x</button>\n  <button id=\"highlight-visibility\" class=\"{{vm.visibility}}\" title=\"{{vm.visibilityTitle}}\" ng-click=\"vm.setVisibleHighlights()\"></button>\n</div>\n<selection-tabs\n  ng-if=\"!vm.search.query() && vm.selectedAnnotationCount() === 0\"\n  is-waiting-to-anchor-annotations=\"vm.waitingToAnchorAnnotations\"\n  is-loading=\"vm.isLoading\"\n  selected-tab=\"vm.selectedTab\"\n  total-annotations=\"vm.totalAnnotations\"\n  total-notes=\"vm.totalNotes\"\n  total-orphans=\"vm.totalOrphans\">\n</selection-tabs>\n\n<search-status-bar\n  ng-show=\"!vm.isLoading()\"\n  filter-active=\"!!vm.search.query()\"\n  filter-match-count=\"vm.visibleCount()\"\n  on-clear-selection=\"vm.clearSelection()\"\n  search-query=\"vm.search ? vm.search.query : ''\"\n  selection-count=\"vm.selectedAnnotationCount()\"\n  total-count=\"vm.topLevelThreadCount()\"\n  selected-tab=\"vm.selectedTab\"\n  total-annotations=\"vm.totalAnnotations\"\n  total-notes=\"vm.totalNotes\">\n</search-status-bar>\n\n<div class=\"annotation-unavailable-message\"\n    ng-if=\"vm.selectedAnnotationUnavailable()\">\n  <div class=\"annotation-unavailable-message__icon\"></div>\n  <p class=\"annotation-unavailable-message__label\">\n    <span ng-if=\"vm.auth.status === 'logged-out'\">\n      {{'This feedback is not available.' | translate}}\n      <br>\n      <p ng-bind-html=\"'You may need to <a class=\\'loggedout-message__link\\' href=\\'\\' ng-click=\\'vm.login()\\'>log in</a> to see it.' | translate\"></p>\n    </span>\n    <span ng-if=\"vm.auth.status === 'logged-in'\">\n      {{'You do not have permission to view this feedback.' | translate}}\n    </span>\n  </p>\n</div>\n<thread-list\n  on-change-collapsed=\"vm.setCollapsed(id, collapsed)\"\n  on-clear-selection=\"vm.clearSelection()\"\n  on-focus=\"vm.focus(annotation)\"\n  on-force-visible=\"vm.forceVisible(thread)\"\n  on-select=\"vm.scrollTo(annotation)\"\n  show-document-info=\"false\"\n  thread=\"vm.rootThread\">\n</thread-list>\n\n<loggedout-message ng-if=\"vm.shouldShowLoggedOutMessage()\" on-login=\"vm.login()\">\n</loggedout-message>\n";

},{}],160:[function(require,module,exports){
module.exports = "<div class=\"sheet\" ng-if=\"vm.showSidebarTutorial() &&  !vm.isThemeClean\">\n  <i class=\"close h-icon-close\" role=\"button\" title=\"Close\"\n     ng-click=\"vm.dismiss()\"></i>\n  <h1 class=\"sidebar-tutorial__header\">{{'How to get started' | translate}}</h1>\n  <ol class=\"sidebar-tutorial__list\">\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\" \n        ng-bind-html=\"'To create an annotation, select text and click the <i class=\\'h-icon-annotate\\'></i> button.' | translate\">\n      </p>\n    </li>\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\"\n        ng-bind-html=\"'To add a note to the page you are viewing, click the <i class=\\'h-icon-note\\'></i> button.' | translate\">\n      </p>\n    </li>\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\"\n        ng-bind-html=\"'To create a highlight, select text and click the <i class=\\'h-icon-highlight\\'></i> button.' | translate\">\n      </p>\n    </li>\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\"\n          ng-bind-html=\"'To reply to an annotation, click the <i class=\\'h-icon-annotation-reply\\'></i> button. <strong>Reply</strong> link.' | translate\">\n      </p>\n    </li>\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\"\n          ng-bind-html=\"'To share an annotated page, click the <i class=\\'h-icon-annotation-share\\'></i> button at the top.' | translate\">\n      </p>\n    </li>\n    <li class=\"sidebar-tutorial__list-item\">\n      <p class=\"sidebar-tutorial__list-item-content\"\n      ng-bind-html=\"'To create a private group, select <strong>Public</strong>, open the dropdown, click <strong>+ New group</strong>.' | translate\">\n      </p>\n    </li>\n  </ol>\n</div>\n<div class=\"sheet sheet--is-theme-clean\" ng-if=\"vm.showSidebarTutorial() && vm.isThemeClean\">\n  <i class=\"close h-icon-close\" role=\"button\" title=\"Close\"\n     ng-click=\"vm.dismiss()\"></i>\n  <h1 class=\"sidebar-tutorial__header sidebar-tutorial__header--is-theme-clean\">\n    <i class=\"h-icon-annotate sidebar-tutorial__header-annotate\" h-branding=\"accentColor\"></i>\n    {{'Start annotating' | translate}}\n  </h1>\n  <ol class=\"sidebar-tutorial__list\">\n    <li class=\"sidebar-tutorial__list-item sidebar-tutorial__list-item--is-theme-clean\">\n      <div class=\"sidebar-tutorial__list-item-content\">\n        <p ng-html-bind=\"'Select some text to\n          <span class=\\'sidebar-tutorial__list-item-annotate\\'> leave feedback </span>\n          <svg-icon class=\\'sidebar-tutorial__list-item-cursor\\' name=\\'\\'cursor\\'\\'></svg-icon>\n        or highlight.' | translate\">\n      </p>\n      </div>\n    </li>\n    <li class=\"sidebar-tutorial__list-item sidebar-tutorial__list-item--is-theme-clean\">\n      <div class=\"sidebar-tutorial__list-item-content sidebar-tutorial__list-item-content--is-theme-clean\">\n        {{'Create page level notes' | translate}}\n        <span class=\"sidebar-tutorial__list-item-new-note-btn\" h-branding=\"ctaBackgroundColor\">\n          + {{'New note' | translate}}\n        </span>\n      </div>\n    </li>\n    <li class=\"sidebar-tutorial__list-item sidebar-tutorial__list-item--is-theme-clean\">\n      <div class=\"sidebar-tutorial__list-item-content\">\n        {{'View feedback through your profile' | translate}}\n        <i class=\"h-icon-account sidebar-tutorial__list-item-profile\"></i>\n        <i class=\"h-icon-arrow-drop-down sidebar-tutorial__list-item-drop-down\"></i>\n      </div>\n    </li>\n  </ol>\n</div>\n";

},{}],161:[function(require,module,exports){
module.exports = "<span dropdown keyboard-nav>\n  <button\n    type=\"button\"\n    class=\"top-bar__btn\"\n    dropdown-toggle\n    title=\"{{'Sort by' | translate}} {{vm.sortKey}}\">\n    <i class=\"h-icon-sort\"></i>\n  </button>\n  <div class=\"dropdown-menu__top-arrow\"></div>\n  <ul class=\"dropdown-menu pull-right\" role=\"menu\">\n    <li class=\"dropdown-menu__row\"\n        ng-repeat=\"key in vm.sortKeysAvailable\"\n        ng-click=\"vm.onChangeSortKey({sortKey: key})\"\n        ><span class=\"dropdown-menu-radio\"\n               ng-class=\"{'is-selected' : vm.sortKey === key}\"\n        ></span><a class=\"dropdown-menu__link\" href=\"\">{{key}}</a></li>\n  </ul>\n</span>\n";

},{}],162:[function(require,module,exports){
module.exports = "<span window-scroll=\"vm.loadMore(20)\">\n  <thread-list\n    on-change-collapsed=\"vm.setCollapsed(id, collapsed)\"\n    on-force-visible=\"vm.forceVisible(thread)\"\n    show-document-info=\"true\"\n    thread=\"vm.rootThread\">\n  </thread-list>\n</span>\n";

},{}],163:[function(require,module,exports){
module.exports = "<tags-input ng-model=\"vm.tagList\"\n  name=\"tags\"\n  class=\"tags\"\n  placeholder=\"Add tags…\"\n  min-length=\"1\"\n  replace-spaces-with-dashes=\"false\"\n  enable-editing-last-tag=\"true\"\n  on-tag-added=\"vm.onTagsChanged()\"\n  on-tag-removed=\"vm.onTagsChanged()\">\n  <auto-complete source=\"vm.autocomplete($query)\"\n    min-length=\"1\"\n    max-results-to-show=\"10\"></auto-complete>\n</tags-input>\n";

},{}],164:[function(require,module,exports){
module.exports = "<ul class=\"thread-list\">\n  <li class=\"thread-list__spacer\"\n      ng-style=\"{height: vm.virtualThreadList.offscreenUpperHeight}\"></li>\n  <li ng-repeat=\"child in vm.virtualThreadList.visibleThreads track by child.id\">\n    <div id=\"{{child.id}}\"\n        class=\"thread-list__card\"\n        ng-mouseenter=\"vm.onFocus({annotation: child.annotation})\"\n        ng-class=\"{'thread-list__card--theme-clean' : vm.isThemeClean}\"\n        ng-click=\"vm.onSelect({annotation: child.annotation})\"\n        ng-mouseleave=\"vm.onFocus({annotation: child.annotation})\">\n        <annotation-thread\n          thread=\"child\"\n          show-document-info=\"vm.showDocumentInfo\"\n          on-change-collapsed=\"vm.onChangeCollapsed({id: id, collapsed: collapsed})\"\n          on-force-visible=\"vm.onForceVisible({thread: thread})\">\n        </annotation-thread>\n    </div>\n    <hr ng-if=\"vm.isThemeClean\"\n        class=\"thread-list__separator--theme-clean\" />\n  </li>\n  <li id=\"{{child.id}}\"\n      ng-show=\"false\"\n      ng-repeat=\"child in vm.virtualThreadList.invisibleThreads track by child.id\">\n      <annotation-thread thread=\"child\" />\n  </li>\n  <li class=\"thread-list__spacer\"\n      ng-style=\"{height: vm.virtualThreadList.offscreenLowerHeight}\"></li>\n</ul>\n";

},{}],165:[function(require,module,exports){
module.exports = "<div ng-switch=\"vm.href\">\n  <span ng-switch-when=\"\"\n        class=\"{{ vm.className }}\"\n        title=\"{{ vm.absoluteTimestamp }}\">\n    {{ vm.relativeTimestamp }}\n  </span>\n  <a ng-switch-default\n     class=\"{{ vm.className }}\"\n     target=\"_blank\"\n     title=\"{{ vm.absoluteTimestamp }}\"\n     href=\"{{ vm.href }}\">\n     {{ vm.relativeTimestamp }}\n  </a>\n</div>\n";

},{}],166:[function(require,module,exports){
module.exports = "<!-- top bar for the sidebar and the stream.\n!-->\n<div class=\"top-bar\"\n  ng-class=\"{'top-bar--theme-clean' : vm.isThemeClean }\"\n  ng-if=\"!vm.isThemeCustom\">\n  <!-- Legacy design for top bar, as used in the stream !-->\n  <div class=\"top-bar__inner content\" ng-if=\"::!vm.isSidebar\">\n    <search-input\n      class=\"search-input\"\n      query=\"vm.searchController.query()\"\n      on-search=\"vm.searchController.update($query)\"\n      always-expanded=\"true\">\n    </search-input>\n    <div class=\"top-bar__expander\"></div>\n    <login-control\n      auth=\"vm.auth\"\n      new-style=\"false\"\n      on-show-help-panel=\"vm.onShowHelpPanel()\"\n      on-login=\"vm.onLogin()\"\n      on-logout=\"vm.onLogout()\">\n    </login-control>\n  </div>\n  <!-- New design for the top bar, as used in the sidebar.\n\n       The inner div is styled with 'content' to center it in\n       the stream view.\n  !-->\n  <div class=\"top-bar__inner content\" ng-if=\"::vm.isSidebar\">\n    <group-list class=\"group-list\" auth=\"vm.auth\"></group-list>\n    <div class=\"top-bar__expander\"></div>\n    <a class=\"top-bar__apply-update-btn\"\n       ng-if=\"vm.pendingUpdateCount > 0\"\n       ng-click=\"vm.onApplyPendingUpdates()\"\n       h-tooltip\n       tooltip-direction=\"up\"\n       aria-label=\"Show {{vm.pendingUpdateCount}} new/updated annotation(s)\">\n       <svg-icon class=\"top-bar__apply-icon\" name=\"'refresh'\"></svg-icon>\n    </a>\n    <search-input\n      class=\"search-input\"\n      query=\"vm.searchController.query()\"\n      on-search=\"vm.searchController.update($query)\"\n      title=\"{{'Filter the feedback list' | translate}}\">\n    </search-input>\n    <sort-dropdown\n      ng-if=\"!vm.isThemeCustom\"\n      sort-keys-available=\"vm.sortKeysAvailable\"\n      sort-key=\"vm.sortKey\"\n      on-change-sort-key=\"vm.onChangeSortKey({sortKey: sortKey})\">\n    </sort-dropdown>\n    <a class=\"top-bar__btn\"\n       ng-click=\"vm.onSharePage()\"\n       ng-if=\"vm.showSharePageButton() && !vm.isThemeCustom\"\n       title=\"{{'Share this page' | translate}}\">\n      <i class=\"h-icon-annotation-share\"></i>\n    </a>\n    <login-control\n      class=\"login-control\"\n      auth=\"vm.auth\"\n      new-style=\"true\"\n      on-show-help-panel=\"vm.onShowHelpPanel()\"\n      on-login=\"vm.onLogin()\"\n      on-logout=\"vm.onLogout()\"\n      on-sign-up=\"vm.onSignUp()\">\n    </login-control>\n  </div>\n</div>\n";

},{}],167:[function(require,module,exports){
'use strict';

var minute = 60;
var hour = minute * 60;

function lessThanThirtySecondsAgo(date, now) {
  return now - date < 30 * 1000;
}

function lessThanOneMinuteAgo(date, now) {
  return now - date < 60 * 1000;
}

function lessThanOneHourAgo(date, now) {
  return now - date < 60 * 60 * 1000;
}

function lessThanOneDayAgo(date, now) {
  return now - date < 24 * 60 * 60 * 1000;
}

function thisYear(date, now) {
  return date.getFullYear() === now.getFullYear();
}

function delta(date, now) {
  return Math.round((now - date) / 1000);
}

function nSec(date, now) {
  return '{} secs'.replace('{}', Math.floor(delta(date, now)));
}

function nMin(date, now) {
  var n = Math.floor(delta(date, now) / minute);
  var template = '{} min';

  if (n > 1) {
    template = template + 's';
  }

  return template.replace('{}', n);
}

function nHr(date, now) {
  var n = Math.floor(delta(date, now) / hour);
  var template = '{} hr';

  if (n > 1) {
    template = template + 's';
  }

  return template.replace('{}', n);
}

// Cached DateTimeFormat instances,
// because instantiating a DateTimeFormat is expensive.
var formatters = {};

/**
 * Efficiently return `date` formatted with `options`.
 *
 * This is a wrapper for Intl.DateTimeFormat.format() that caches
 * DateTimeFormat instances because they're expensive to create.
 * Calling Date.toLocaleDateString() lots of times is also expensive in some
 * browsers as it appears to create a new formatter for each call.
 *
 * @returns {string}
 *
 */
function format(date, options, Intl) {
  // If the tests have passed in a mock Intl then use it, otherwise use the
  // real one.
  if (typeof Intl === 'undefined') {
    Intl = window.Intl;
  }

  if (Intl && Intl.DateTimeFormat) {
    var key = JSON.stringify(options);
    var formatter = formatters[key];

    if (!formatter) {
      formatter = formatters[key] = new Intl.DateTimeFormat(undefined, options);
    }

    return formatter.format(date);
  } else {
    // IE < 11, Safari <= 9.0.
    return date.toDateString();
  }
}

function dayAndMonth(date, now, Intl) {
  return format(date, { month: 'short', day: 'numeric' }, Intl);
}

function dayAndMonthAndYear(date, now, Intl) {
  return format(date, { day: 'numeric', month: 'short', year: 'numeric' }, Intl);
}

var BREAKPOINTS = [{
  test: lessThanThirtySecondsAgo,
  format: function format() {
    return 'Just now';
  },
  nextUpdate: 1
}, {
  test: lessThanOneMinuteAgo,
  format: nSec,
  nextUpdate: 1
}, {
  test: lessThanOneHourAgo,
  format: nMin,
  nextUpdate: minute
}, {
  test: lessThanOneDayAgo,
  format: nHr,
  nextUpdate: hour
}, {
  test: thisYear,
  format: dayAndMonth,
  nextUpdate: null
}, {
  test: function test() {
    return true;
  },
  format: dayAndMonthAndYear,
  nextUpdate: null
}];

function getBreakpoint(date, now) {

  // Turn the given ISO 8601 string into a Date object.
  date = new Date(date);

  var breakpoint;
  for (var i = 0; i < BREAKPOINTS.length; i++) {
    breakpoint = BREAKPOINTS[i];
    if (breakpoint.test(date, now)) {
      return breakpoint;
    }
  }

  return null;
}

function nextFuzzyUpdate(date) {
  if (!date) {
    return null;
  }

  var secs = getBreakpoint(date, new Date()).nextUpdate;

  if (secs === null) {
    return null;
  }

  // We don't want to refresh anything more often than 5 seconds
  secs = Math.max(secs, 5);

  // setTimeout limit is MAX_INT32=(2^31-1) (in ms),
  // which is about 24.8 days. So we don't set up any timeouts
  // longer than 24 days, that is, 2073600 seconds.
  secs = Math.min(secs, 2073600);

  return secs;
}

/**
 * Starts an interval whose frequency decays depending on the relative
 * age of 'date'.
 *
 * This can be used to refresh parts of a UI whose
 * update frequency depends on the age of a timestamp.
 *
 * @return {Function} A function that cancels the automatic refresh.
 */
function decayingInterval(date, callback) {
  var timer;
  var update = function update() {
    var fuzzyUpdate = nextFuzzyUpdate(date);
    if (fuzzyUpdate === null) {
      return;
    }
    var nextUpdate = 1000 * fuzzyUpdate + 500;
    timer = setTimeout(function () {
      callback(date);
      update();
    }, nextUpdate);
  };
  update();

  return function () {
    clearTimeout(timer);
  };
}

/**
 * Formats a date as a string relative to the current date.
 *
 * @param {number} date - The absolute timestamp to format.
 * @return {string} A 'fuzzy' string describing the relative age of the date.
 */
function toFuzzyString(date, Intl) {
  if (!date) {
    return '';
  }
  var now = new Date();

  return getBreakpoint(date, now).format(new Date(date), now, Intl);
}

module.exports = {
  decayingInterval: decayingInterval,
  nextFuzzyUpdate: nextFuzzyUpdate,
  toFuzzyString: toFuzzyString
};

},{}],168:[function(require,module,exports){
'use strict';

function translate(translateProvider) {
  // Seperated translation files for all supported language.
  translateProvider.translations('en', require('../shared/translations/english_en.json')).translations('ja', require('../shared/translations/japanese_ja.json'));
}

module.exports = {
  translate: translate
};

},{"../shared/translations/english_en.json":48,"../shared/translations/japanese_ja.json":49}],169:[function(require,module,exports){
'use strict';

/**
 * uiConstants is a set of globally used constants across the application.
 */

module.exports = {
  TAB_ANNOTATIONS: 'annotation',
  TAB_NOTES: 'note',
  TAB_ORPHANS: 'orphan'
};

},{}],170:[function(require,module,exports){
'use strict';

var unorm = require('unorm');

/**
 * Unicode combining characters
 * from http://xregexp.com/addons/unicode/unicode-categories.js line:30
 */
var COMBINING_MARKS = /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u08FE\u0900-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C82\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D02\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u192B\u1930-\u193B\u19B0-\u19C0\u19C8\u19C9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1DC0-\u1DE6\u1DFC-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE26]/g;

// @ngInject
function unicode() {
  return {
    normalize: function normalize(str) {
      return unorm.nfkd(str);
    },
    fold: function fold(str) {
      return str.replace(COMBINING_MARKS, '');
    }
  };
}

module.exports = unicode;

},{"unorm":"unorm"}],171:[function(require,module,exports){
'use strict';

/**
 * Parses H account names of the form 'acct:<username>@<provider>'
 * into a {username, provider} object or null if the input does not
 * match the expected form.
 */

function parseAccountID(user) {
  if (!user) {
    return null;
  }
  var match = user.match(/^acct:([^@]+)@(.+)/);
  if (!match) {
    return null;
  }
  return {
    username: match[1],
    provider: match[2]
  };
}

/**
 * Returns the username part of an account ID or an empty string.
 */
function username(user) {
  var account = parseAccountID(user);
  if (!account) {
    return '';
  }
  return account.username;
}

/**
 * Returns true if the authority is of a 3rd party user.
 */
function isThirdPartyUser(user, authDomain) {
  var account = parseAccountID(user);

  if (!account) {
    return false;
  }

  return account.provider !== authDomain;
}

module.exports = {
  isThirdPartyUser: isThirdPartyUser,
  parseAccountID: parseAccountID,
  username: username
};

},{}],172:[function(require,module,exports){
'use strict';

/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 *
 * @param {Array} ary
 * @param {Function} predicate
 */

function countIf(ary, predicate) {
  return ary.reduce(function (count, item) {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Create a new array with the result of calling `mapFn` on every element in
 * `ary`.
 *
 * Only truthy values are included in the resulting array.
 *
 * @param {Array} ary
 * @param {Function} mapFn
 */
function filterMap(ary, mapFn) {
  return ary.reduce(function (newArray, item) {
    var mapped = mapFn(item);
    if (mapped) {
      newArray.push(mapped);
    }
    return newArray;
  }, []);
}

/**
 * Convert an array to a set represented as an object.
 *
 * @param {string[]} list - List of keys for the set.
 */
function toSet(list) {
  return list.reduce(function (set, key) {
    set[key] = true;
    return set;
  }, {});
}

module.exports = {
  countIf: countIf,
  filterMap: filterMap,
  toSet: toSet
};

},{}],173:[function(require,module,exports){
'use strict';

/**
 * Prevent windows or tabs opened via links under `root` from accessing their
 * opening `Window`.
 *
 * This makes links with `target="blank"` attributes act as if they also had
 * the `rel="noopener"` [1] attribute set.
 *
 * In addition to preventing tab-jacking [2], this also enables multi-process
 * browsers to more easily use a new process for instances of Hypothesis in the
 * newly-opened tab and works around a bug in Chrome [3]
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types#noopener
 * [2] https://mathiasbynens.github.io/rel-noopener/
 * [3] https://bugs.chromium.org/p/chromium/issues/detail?id=753314
 *
 * @param {Element} root - Root element
 */

function disableOpenerForExternalLinks(root) {
  root.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') {
      var linkEl = event.target;
      if (linkEl.target === '_blank') {
        linkEl.rel = 'noopener';
      }
    }
  });
}

module.exports = disableOpenerForExternalLinks;

},{}],174:[function(require,module,exports){
'use strict';

function toPx(val) {
  return val.toString() + 'px';
}

/**
 * Interface used by ExcerptOverflowMonitor to retrieve the state of the
 * <excerpt> and report when the state changes.
 *
 * interface Excerpt {
 *   getState(): State;
 *   contentHeight(): number | undefined;
 *   onOverflowChanged(): void;
 * }
 */

/**
 * A helper for the <excerpt> component which handles determinination of the
 * overflow state and content styling given the current state of the component
 * and the height of its contents.
 *
 * When the state of the excerpt or its content changes, the component should
 * call check() to schedule an async update of the overflow state.
 *
 * @param {Excerpt} excerpt - Interface used to query the current state of the
 *        excerpt and notify it when the overflow state changes.
 * @param {(callback) => number} requestAnimationFrame -
 *        Function called to schedule an async recalculation of the overflow
 *        state.
 */
function ExcerptOverflowMonitor(excerpt, requestAnimationFrame) {
  var pendingUpdate = false;

  // Last-calculated overflow state
  var prevOverflowing;

  function update() {
    var state = excerpt.getState();

    if (!pendingUpdate) {
      return;
    }

    pendingUpdate = false;

    var overflowing = false;
    if (state.enabled) {
      var hysteresisPx = state.overflowHysteresis || 0;
      overflowing = excerpt.contentHeight() > state.collapsedHeight + hysteresisPx;
    }
    if (overflowing === prevOverflowing) {
      return;
    }

    prevOverflowing = overflowing;
    excerpt.onOverflowChanged(overflowing);
  }

  /**
   * Schedule a deferred check of whether the content is collapsed.
   */
  function check() {
    if (pendingUpdate) {
      return;
    }
    pendingUpdate = true;
    requestAnimationFrame(update);
  }

  /**
   * Returns an object mapping CSS properties to values that should be applied
   * to an excerpt's content element in order to truncate it based on the
   * current overflow state.
   */
  function contentStyle() {
    var state = excerpt.getState();
    if (!state.enabled) {
      return {};
    }

    var maxHeight = '';
    if (prevOverflowing) {
      if (state.collapse) {
        maxHeight = toPx(state.collapsedHeight);
      } else if (state.animate) {
        // Animating the height change requires that the final
        // height be specified exactly, rather than relying on
        // auto height
        maxHeight = toPx(excerpt.contentHeight());
      }
    } else if (typeof prevOverflowing === 'undefined' && state.collapse) {
      // If the excerpt is collapsed but the overflowing state has not yet
      // been computed then the exact max height is unknown, but it will be
      // in the range [state.collapsedHeight, state.collapsedHeight +
      // state.overflowHysteresis]
      //
      // Here we guess that the final content height is most likely to be
      // either less than `collapsedHeight` or more than `collapsedHeight` +
      // `overflowHysteresis`, in which case it will be truncated to
      // `collapsedHeight`.
      maxHeight = toPx(state.collapsedHeight);
    }

    return {
      'max-height': maxHeight
    };
  }

  this.contentStyle = contentStyle;
  this.check = check;
}

module.exports = ExcerptOverflowMonitor;

},{}],175:[function(require,module,exports){
'use strict';

var serviceConfig = require('../service-config');

/**
 * Return `true` if the first configured service is a "third-party" service.
 *
 * Return `true` if the first custom annotation service configured in the
 * services array in the host page is a third-party service, `false` otherwise.
 *
 * If no custom annotation services are configured then return `false`.
 *
 * @param {Object} settings - the sidebar settings object
 *
 */
function isThirdPartyService(settings) {
  var service = serviceConfig(settings);

  if (service === null) {
    return false;
  }

  if (!service.hasOwnProperty('authority')) {
    return false;
  }

  return service.authority !== settings.authDomain;
}

module.exports = isThirdPartyService;

},{"../service-config":129}],176:[function(require,module,exports){
'use strict';

/**
 * A simple memoization function which caches the last result of
 * a single-argument function.
 *
 * The argument to the input function may be of any type and is compared
 * using reference equality.
 */

function memoize(fn) {
  if (fn.length !== 1) {
    throw new Error('Memoize input must be a function of one argument');
  }

  var lastArg;
  var lastResult;

  return function (arg) {
    if (arg === lastArg) {
      return lastResult;
    }
    lastArg = arg;
    lastResult = fn(arg);
    return lastResult;
  };
}

module.exports = memoize;

},{}],177:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var queryString = require('query-string');

var random = require('./random');

/**
 * An object holding the details of an access token from the tokenUrl endpoint.
 * @typedef {Object} TokenInfo
 * @property {string} accessToken  - The access token itself.
 * @property {number} expiresAt    - The date when the timestamp will expire.
 * @property {string} refreshToken - The refresh token that can be used to
 *                                   get a new access token.
 */

/**
 * Return a new TokenInfo object from the given tokenUrl endpoint response.
 * @param {Object} response - The HTTP response from a POST to the tokenUrl
 *                            endpoint (an Angular $http response object).
 * @returns {TokenInfo}
 */
function tokenInfoFrom(response) {
  var data = response.data;
  return {
    accessToken: data.access_token,

    // Set the expiry date to some time slightly before that implied by
    // `expires_in` to account for the delay in the client receiving the
    // response.
    expiresAt: Date.now() + (data.expires_in - 10) * 1000,

    refreshToken: data.refresh_token
  };
}

/**
 * Generate a short random string suitable for use as the "state" param in
 * authorization requests.
 *
 * See https://tools.ietf.org/html/rfc6749#section-4.1.1.
 */
function generateState() {
  return random.generateHexString(16);
}

/**
 * OAuthClient configuration.
 *
 * @typedef {Object} Config
 * @property {string} clientId - OAuth client ID
 * @property {string} tokenEndpoint - OAuth token exchange/refresh endpoint
 * @property {string} authorizationEndpoint - OAuth authorization endpoint
 * @property {string} revokeEndpoint - RFC 7009 token revocation endpoint
 * @property {() => string} [generateState] - Authorization "state" parameter generator
 */

/**
 * OAuthClient handles interaction with the annotation service's OAuth
 * endpoints.
 */

var OAuthClient = function () {
  /**
   * Create a new OAuthClient
   *
   * @param {Object} $http - HTTP client
   * @param {Config} config
   */
  function OAuthClient($http, config) {
    _classCallCheck(this, OAuthClient);

    this.$http = $http;

    this.clientId = config.clientId;
    this.tokenEndpoint = config.tokenEndpoint;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.revokeEndpoint = config.revokeEndpoint;

    // Test seam
    this.generateState = config.generateState || generateState;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param {string} code
   * @return {Promise<TokenInfo>}
   */


  _createClass(OAuthClient, [{
    key: 'exchangeAuthCode',
    value: function exchangeAuthCode(code) {
      var data = {
        client_id: this.clientId,
        grant_type: 'authorization_code',
        code: code
      };
      return this._formPost(this.tokenEndpoint, data).then(function (response) {
        if (response.status !== 200) {
          throw new Error('Authorization code exchange failed');
        }
        return tokenInfoFrom(response);
      });
    }

    /**
     * Exchange a grant token for access and refresh tokens.
     *
     * See https://tools.ietf.org/html/rfc7523#section-4
     *
     * @param {string} token
     * @return {Promise<TokenInfo>}
     */

  }, {
    key: 'exchangeGrantToken',
    value: function exchangeGrantToken(token) {
      var data = {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      };
      return this._formPost(this.tokenEndpoint, data).then(function (response) {
        if (response.status !== 200) {
          throw new Error('Failed to retrieve access token');
        }
        return tokenInfoFrom(response);
      });
    }

    /**
     * Refresh an access and refresh token pair.
     *
     * See https://tools.ietf.org/html/rfc6749#section-6
     *
     * @param {string} refreshToken
     * @return {Promise<TokenInfo>}
     */

  }, {
    key: 'refreshToken',
    value: function refreshToken(_refreshToken) {
      var data = { grant_type: 'refresh_token', refresh_token: _refreshToken };
      return this._formPost(this.tokenEndpoint, data).then(function (response) {
        if (response.status !== 200) {
          throw new Error('Failed to refresh access token');
        }
        return tokenInfoFrom(response);
      });
    }

    /**
     * Revoke an access and refresh token pair.
     *
     * @param {string} accessToken
     * @return {Promise}
     */

  }, {
    key: 'revokeToken',
    value: function revokeToken(accessToken) {
      return this._formPost(this.revokeEndpoint, { token: accessToken });
    }

    /**
     * Prompt the user for permission to access their data.
     *
     * Returns an authorization code which can be passed to `exchangeAuthCode`.
     *
     * @param {Window} $window - Window which will receive the auth response.
     * @param {Window} authWindow - Popup window where the login prompt will be shown.
     *   This should be created using `openAuthPopupWindow`.
     * @return {Promise<string>}
     */

  }, {
    key: 'authorize',
    value: function authorize($window, authWindow) {
      // Random state string used to check that auth messages came from the popup
      // window that we opened.
      var state = this.generateState();

      // Promise which resolves or rejects when the user accepts or closes the
      // auth popup.
      var authResponse = new Promise(function (resolve, reject) {
        function authRespListener(event) {
          if (_typeof(event.data) !== 'object') {
            return;
          }

          if (event.data.state !== state) {
            // This message came from a different popup window.
            return;
          }

          if (event.data.type === 'authorization_response') {
            resolve(event.data);
          }
          if (event.data.type === 'authorization_canceled') {
            reject(new Error('Authorization window was closed'));
          }
          $window.removeEventListener('message', authRespListener);
        }
        $window.addEventListener('message', authRespListener);
      });

      // Authorize user and retrieve grant token
      var authUrl = this.authorizationEndpoint;
      authUrl += '?' + queryString.stringify({
        client_id: this.clientId,
        origin: $window.location.origin,
        response_mode: 'web_message',
        response_type: 'code',
        state: state
      });
      authWindow.location = authUrl;

      return authResponse.then(function (rsp) {
        return rsp.code;
      });
    }

    /**
     * Make an `application/x-www-form-urlencoded` POST request.
     *
     * @param {string} url
     * @param {Object} data - Parameter dictionary
     */

  }, {
    key: '_formPost',
    value: function _formPost(url, data) {
      data = queryString.stringify(data);
      var requestConfig = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      };
      return this.$http.post(url, data, requestConfig);
    }

    /**
     * Create and show a pop-up window for use with `OAuthClient#authorize`.
     *
     * This function _must_ be called in the same turn of the event loop as the
     * button or link which initiates login to avoid triggering the popup blocker
     * in certain browsers. See https://github.com/hypothesis/client/issues/534
     * and https://github.com/hypothesis/client/issues/535.
     *
     * @param {Window} $window - The parent of the created window.
     * @return {Window} The new popup window.
     */

  }], [{
    key: 'openAuthPopupWindow',
    value: function openAuthPopupWindow($window) {
      // In Chrome & Firefox the sizes passed to `window.open` are used for the
      // viewport size. In Safari the size is used for the window size including
      // title bar etc. There is enough vertical space at the bottom to allow for
      // this.
      //
      // See https://bugs.webkit.org/show_bug.cgi?id=143678
      var width = 475;
      var height = 430;
      var left = $window.screen.width / 2 - width / 2;
      var top = $window.screen.height / 2 - height / 2;

      // Generate settings for `window.open` in the required comma-separated
      // key=value format.
      var authWindowSettings = queryString.stringify({
        left: left,
        top: top,
        width: width,
        height: height
      }).replace(/&/g, ',');

      return $window.open('about:blank', 'Log in to Hypothesis', authWindowSettings);
    }
  }]);

  return OAuthClient;
}();

module.exports = OAuthClient;

},{"./random":178,"query-string":20}],178:[function(require,module,exports){
'use strict';

/* global Uint8Array */

function byteToHex(val) {
  var str = val.toString(16);
  return str.length === 1 ? '0' + str : str;
}

/**
 * Generate a random hex string of `len` chars.
 *
 * @param {number} - An even-numbered length string to generate.
 * @return {string}
 */
function generateHexString(len) {
  var crypto = window.crypto || window.msCrypto /* IE 11 */;
  var bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byteToHex).join('');
}

module.exports = {
  generateHexString: generateHexString
};

},{}],179:[function(require,module,exports){
'use strict';

/**
 * Sets a timeout which is linked to the lifetime of an Angular scope.
 *
 * When the scope is destroyed, the timeout will be cleared if it has
 * not already fired.
 *
 * The callback is not invoked within a $scope.$apply() context. It is up
 * to the caller to do that if necessary.
 *
 * @param {Scope} $scope - An Angular scope
 * @param {Function} fn - Callback to invoke with setTimeout
 * @param {number} delay - Delay argument to pass to setTimeout
 */

module.exports = function ($scope, fn, delay, setTimeoutFn, clearTimeoutFn) {
  setTimeoutFn = setTimeoutFn || setTimeout;
  clearTimeoutFn = clearTimeoutFn || clearTimeout;

  var removeDestroyHandler;
  var id = setTimeoutFn(function () {
    removeDestroyHandler();
    fn();
  }, delay);
  removeDestroyHandler = $scope.$on('$destroy', function () {
    clearTimeoutFn(id);
  });
};

},{}],180:[function(require,module,exports){
'use strict';

/**
 * Returns true if the sidebar tutorial has to be shown to a user for a given session.
 */

function shouldShowSidebarTutorial(sessionState) {
  if (sessionState.preferences.show_sidebar_tutorial) {
    return true;
  }
  return false;
}

module.exports = {
  shouldShowSidebarTutorial: shouldShowSidebarTutorial
};

},{}],181:[function(require,module,exports){
'use strict';

/**
 * Replace parameters in a URL template with values from a `params` object.
 *
 * Returns an object containing the expanded URL and a dictionary of unused
 * parameters.
 *
 *   replaceURLParams('/things/:id', {id: 'foo', q: 'bar'}) =>
 *     {url: '/things/foo', params: {q: 'bar'}}
 */

function replaceURLParams(url, params) {
  var unusedParams = {};
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      var value = params[param];
      var urlParam = ':' + param;
      if (url.indexOf(urlParam) !== -1) {
        url = url.replace(urlParam, encodeURIComponent(value));
      } else {
        unusedParams[param] = value;
      }
    }
  }
  return { url: url, params: unusedParams };
}

/**
 * Resolve a relative URL against a base URL to get an absolute URL.
 *
 * @param {string} relativeURL
 * @param {string} baseURL
 */
function resolve(relativeURL, baseURL) {
  return new URL(relativeURL, baseURL).href;
}

module.exports = {
  replaceURLParams: replaceURLParams,
  resolve: resolve
};

},{}],182:[function(require,module,exports){
/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.13.4 - 2015-09-03
 * License: MIT
 */
angular.module("ui.bootstrap", ["ui.bootstrap.tpls","ui.bootstrap.dropdown","ui.bootstrap.position"]);
angular.module("ui.bootstrap.tpls", []);
angular.module('ui.bootstrap.dropdown', ['ui.bootstrap.position'])

.constant('dropdownConfig', {
  openClass: 'open'
})

.service('dropdownService', ['$document', '$rootScope', function($document, $rootScope) {
  var openScope = null;

  this.open = function(dropdownScope) {
    if (!openScope) {
      $document.bind('click', closeDropdown);
      $document.bind('keydown', keybindFilter);
    }

    if (openScope && openScope !== dropdownScope) {
      openScope.isOpen = false;
    }

    openScope = dropdownScope;
  };

  this.close = function(dropdownScope) {
    if (openScope === dropdownScope) {
      openScope = null;
      $document.unbind('click', closeDropdown);
      $document.unbind('keydown', keybindFilter);
    }
  };

  var closeDropdown = function(evt) {
    // This method may still be called during the same mouse event that
    // unbound this event handler. So check openScope before proceeding.
    if (!openScope) { return; }

    if (evt && openScope.getAutoClose() === 'disabled')  { return ; }

    var toggleElement = openScope.getToggleElement();
    if (evt && toggleElement && toggleElement[0].contains(evt.target)) {
      return;
    }

    var dropdownElement = openScope.getDropdownElement();
    if (evt && openScope.getAutoClose() === 'outsideClick' &&
      dropdownElement && dropdownElement[0].contains(evt.target)) {
      return;
    }

    openScope.isOpen = false;

    if (!$rootScope.$$phase) {
      openScope.$apply();
    }
  };

  var keybindFilter = function(evt) {
    if (evt.which === 27) {
      openScope.focusToggleElement();
      closeDropdown();
    } else if (openScope.isKeynavEnabled() && /(38|40)/.test(evt.which) && openScope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      openScope.focusDropdownEntry(evt.which);
    }
  };
}])

.controller('DropdownController', ['$scope', '$attrs', '$parse', 'dropdownConfig', 'dropdownService', '$animate', '$position', '$document', '$compile', '$templateRequest', function($scope, $attrs, $parse, dropdownConfig, dropdownService, $animate, $position, $document, $compile, $templateRequest) {
  var self = this,
    scope = $scope.$new(), // create a child scope so we are not polluting original one
    templateScope,
    openClass = dropdownConfig.openClass,
    getIsOpen,
    setIsOpen = angular.noop,
    toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop,
    appendToBody = false,
    keynavEnabled = false,
    selectedOption = null,
    body = $document.find('body');

  this.init = function(element) {
    self.$element = element;

    if ($attrs.isOpen) {
      getIsOpen = $parse($attrs.isOpen);
      setIsOpen = getIsOpen.assign;

      $scope.$watch(getIsOpen, function(value) {
        scope.isOpen = !!value;
      });
    }

    appendToBody = angular.isDefined($attrs.dropdownAppendToBody);
    keynavEnabled = angular.isDefined($attrs.keyboardNav);

    if (appendToBody && self.dropdownMenu) {
      body.append(self.dropdownMenu);
      body.addClass('dropdown');
      element.on('$destroy', function handleDestroyEvent() {
        self.dropdownMenu.remove();
      });
    }
  };

  this.toggle = function(open) {
    return scope.isOpen = arguments.length ? !!open : !scope.isOpen;
  };

  // Allow other directives to watch status
  this.isOpen = function() {
    return scope.isOpen;
  };

  scope.getToggleElement = function() {
    return self.toggleElement;
  };

  scope.getAutoClose = function() {
    return $attrs.autoClose || 'always'; //or 'outsideClick' or 'disabled'
  };

  scope.getElement = function() {
    return self.$element;
  };

  scope.isKeynavEnabled = function() {
    return keynavEnabled;
  };

  scope.focusDropdownEntry = function(keyCode) {
    var elems = self.dropdownMenu ? //If append to body is used.
      (angular.element(self.dropdownMenu).find('a')) :
      (angular.element(self.$element).find('ul').eq(0).find('a'));

    switch (keyCode) {
      case (40): {
        if (!angular.isNumber(self.selectedOption)) {
          self.selectedOption = 0;
        } else {
          self.selectedOption = (self.selectedOption === elems.length -1 ?
            self.selectedOption :
            self.selectedOption + 1);
        }
        break;
      }
      case (38): {
        if (!angular.isNumber(self.selectedOption)) {
          self.selectedOption = elems.length - 1;
        } else {
          self.selectedOption = self.selectedOption === 0 ?
            0 : self.selectedOption - 1;
        }
        break;
      }
    }
    elems[self.selectedOption].focus();
  };

  scope.getDropdownElement = function() {
    return self.dropdownMenu;
  };

  scope.focusToggleElement = function() {
    if (self.toggleElement) {
      self.toggleElement[0].focus();
    }
  };

  scope.$watch('isOpen', function(isOpen, wasOpen) {
    if (appendToBody && self.dropdownMenu) {
      var pos = $position.positionElements(self.$element, self.dropdownMenu, 'bottom-left', true);
      var css = {
        top: pos.top + 'px',
        display: isOpen ? 'block' : 'none'
      };

      var rightalign = self.dropdownMenu.hasClass('dropdown-menu-right');
      if (!rightalign) {
        css.left = pos.left + 'px';
        css.right = 'auto';
      } else {
        css.left = 'auto';
        css.right = (window.innerWidth - (pos.left + self.$element.prop('offsetWidth'))) + 'px';
      }

      self.dropdownMenu.css(css);
    }

    var openContainer = appendToBody ? body : self.$element;

    $animate[isOpen ? 'addClass' : 'removeClass'](openContainer, openClass).then(function() {
      if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
        toggleInvoker($scope, { open: !!isOpen });
      }
    });

    if (isOpen) {
      if (self.dropdownMenuTemplateUrl) {
        $templateRequest(self.dropdownMenuTemplateUrl).then(function(tplContent) {
          templateScope = scope.$new();
          $compile(tplContent.trim())(templateScope, function(dropdownElement) {
            var newEl = dropdownElement;
            self.dropdownMenu.replaceWith(newEl);
            self.dropdownMenu = newEl;
          });
        });
      }

      scope.focusToggleElement();
      dropdownService.open(scope);
    } else {
      if (self.dropdownMenuTemplateUrl) {
        if (templateScope) {
          templateScope.$destroy();
        }
        var newEl = angular.element('<ul class="dropdown-menu"></ul>');
        self.dropdownMenu.replaceWith(newEl);
        self.dropdownMenu = newEl;
      }

      dropdownService.close(scope);
      self.selectedOption = null;
    }

    if (angular.isFunction(setIsOpen)) {
      setIsOpen($scope, isOpen);
    }
  });

  $scope.$on('$locationChangeSuccess', function() {
    if (scope.getAutoClose() !== 'disabled') {
      scope.isOpen = false;
    }
  });

  var offDestroy = $scope.$on('$destroy', function() {
    scope.$destroy();
  });
  scope.$on('$destroy', offDestroy);
}])

.directive('dropdown', function() {
  return {
    controller: 'DropdownController',
    link: function(scope, element, attrs, dropdownCtrl) {
      dropdownCtrl.init( element );
      element.addClass('dropdown');
    }
  };
})

.directive('dropdownMenu', function() {
  return {
    restrict: 'AC',
    require: '?^dropdown',
    link: function(scope, element, attrs, dropdownCtrl) {
      if (!dropdownCtrl) {
        return;
      }
      var tplUrl = attrs.templateUrl;
      if (tplUrl) {
        dropdownCtrl.dropdownMenuTemplateUrl = tplUrl;
      }
      if (!dropdownCtrl.dropdownMenu) {
        dropdownCtrl.dropdownMenu = element;
      }
    }
  };
})

.directive('keyboardNav', function() {
  return {
    restrict: 'A',
    require: '?^dropdown',
    link: function (scope, element, attrs, dropdownCtrl) {

      element.bind('keydown', function(e) {
        if ([38, 40].indexOf(e.which) !== -1) {
          e.preventDefault();
          e.stopPropagation();

          var elems = dropdownCtrl.dropdownMenu.find('a');

          switch (e.which) {
            case (40): { // Down
              if (!angular.isNumber(dropdownCtrl.selectedOption)) {
                dropdownCtrl.selectedOption = 0;
              } else {
                dropdownCtrl.selectedOption = dropdownCtrl.selectedOption === elems.length -1 ?
                  dropdownCtrl.selectedOption : dropdownCtrl.selectedOption + 1;
              }
              break;
            }
            case (38): { // Up
              if (!angular.isNumber(dropdownCtrl.selectedOption)) {
                dropdownCtrl.selectedOption = elems.length - 1;
              } else {
                dropdownCtrl.selectedOption = dropdownCtrl.selectedOption === 0 ?
                  0 : dropdownCtrl.selectedOption - 1;
              }
              break;
            }
          }
          elems[dropdownCtrl.selectedOption].focus();
        }
      });
    }
  };
})

.directive('dropdownToggle', function() {
  return {
    require: '?^dropdown',
    link: function(scope, element, attrs, dropdownCtrl) {
      if (!dropdownCtrl) {
        return;
      }

      element.addClass('dropdown-toggle');

      dropdownCtrl.toggleElement = element;

      var toggleDropdown = function(event) {
        event.preventDefault();

        if (!element.hasClass('disabled') && !attrs.disabled) {
          scope.$apply(function() {
            dropdownCtrl.toggle();
          });
        }
      };

      element.bind('click', toggleDropdown);

      // WAI-ARIA
      element.attr({ 'aria-haspopup': true, 'aria-expanded': false });
      scope.$watch(dropdownCtrl.isOpen, function( isOpen ) {
        element.attr('aria-expanded', !!isOpen);
      });

      scope.$on('$destroy', function() {
        element.unbind('click', toggleDropdown);
      });
    }
  };
});

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$position', ['$document', '$window', function($document, $window) {
    function getStyle(el, cssprop) {
      if (el.currentStyle) { //IE
        return el.currentStyle[cssprop];
      } else if ($window.getComputedStyle) {
        return $window.getComputedStyle(el)[cssprop];
      }
      // finally try and get inline style
      return el.style[cssprop];
    }

    /**
     * Checks if a given element is statically positioned
     * @param element - raw DOM element
     */
    function isStaticPositioned(element) {
      return (getStyle(element, 'position') || 'static' ) === 'static';
    }

    /**
     * returns the closest, non-statically positioned parentOffset of a given element
     * @param element
     */
    var parentOffsetEl = function(element) {
      var docDomEl = $document[0];
      var offsetParent = element.offsetParent || docDomEl;
      while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
        offsetParent = offsetParent.offsetParent;
      }
      return offsetParent || docDomEl;
    };

    return {
      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/
       */
      position: function(element) {
        var elBCR = this.offset(element);
        var offsetParentBCR = { top: 0, left: 0 };
        var offsetParentEl = parentOffsetEl(element[0]);
        if (offsetParentEl != $document[0]) {
          offsetParentBCR = this.offset(angular.element(offsetParentEl));
          offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
          offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
        }

        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: elBCR.top - offsetParentBCR.top,
          left: elBCR.left - offsetParentBCR.left
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/
       */
      offset: function(element) {
        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
          left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
        };
      },

      /**
       * Provides coordinates for the targetEl in relation to hostEl
       */
      positionElements: function(hostEl, targetEl, positionStr, appendToBody) {
        var positionStrParts = positionStr.split('-');
        var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

        var hostElPos,
          targetElWidth,
          targetElHeight,
          targetElPos;

        hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

        targetElWidth = targetEl.prop('offsetWidth');
        targetElHeight = targetEl.prop('offsetHeight');

        var shiftWidth = {
          center: function() {
            return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
          },
          left: function() {
            return hostElPos.left;
          },
          right: function() {
            return hostElPos.left + hostElPos.width;
          }
        };

        var shiftHeight = {
          center: function() {
            return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
          },
          top: function() {
            return hostElPos.top;
          },
          bottom: function() {
            return hostElPos.top + hostElPos.height;
          }
        };

        switch (pos0) {
          case 'right':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: shiftWidth[pos0]()
            };
            break;
          case 'left':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: hostElPos.left - targetElWidth
            };
            break;
          case 'bottom':
            targetElPos = {
              top: shiftHeight[pos0](),
              left: shiftWidth[pos1]()
            };
            break;
          default:
            targetElPos = {
              top: hostElPos.top - targetElHeight,
              left: shiftWidth[pos1]()
            };
            break;
        }

        return targetElPos;
      }
    };
  }]);

},{}],183:[function(require,module,exports){
'use strict';

// Prevent Babel inserting helper code after `@ngInject` comment below which
// breaks browserify-ngannotate.

viewFilter.$inject = ["unicode"];
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();
_slicedToArray.$inject = ["arr", "i"];

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var unused; // eslint-disable-line

// @ngInject
function viewFilter(unicode) {
  var _this = this;

  /**
   * Normalize a field value or query term for comparison.
   */
  function normalize(val) {
    if (typeof val !== 'string') {
      return val;
    }
    return unicode.fold(unicode.normalize(val)).toLowerCase();
  }

  /**
   * Filter that matches annotations against a single field & term.
   *
   * eg. "quote:foo" or "text:bar"
   */

  var TermFilter = function () {
    /**
     * @param {string} field - Name of field to match
     * @param {string} term - Query term
     * @param {Checker} checker - Functions for extracting term values from
     *   an annotation and checking whether they match a query term.
     */
    function TermFilter(field, term, checker) {
      _classCallCheck(this, TermFilter);

      this.field = field;
      this.term = term;
      this.checker = checker;
    }

    _createClass(TermFilter, [{
      key: 'matches',
      value: function matches(ann) {
        var checker = this.checker;
        if (checker.autofalse && checker.autofalse(ann)) {
          return false;
        }

        var value = checker.value(ann);
        if (Array.isArray(value)) {
          value = value.map(normalize);
        } else {
          value = normalize(value);
        }
        return checker.match(this.term, value);
      }
    }]);

    return TermFilter;
  }();

  /**
   * Filter that combines other filters using AND or OR combinators.
   */


  var BinaryOpFilter = function () {
    /**
     * @param {'and'|'or'} op - Binary operator
     * @param {Filter[]} - Array of filters to test against
     */
    function BinaryOpFilter(op, filters) {
      _classCallCheck(this, BinaryOpFilter);

      this.operator = op;
      this.filters = filters;
    }

    _createClass(BinaryOpFilter, [{
      key: 'matches',
      value: function matches(ann) {
        if (this.operator === 'and') {
          return this.filters.every(function (filter) {
            return filter.matches(ann);
          });
        } else {
          return this.filters.some(function (filter) {
            return filter.matches(ann);
          });
        }
      }
    }]);

    return BinaryOpFilter;
  }();

  /**
   * Functions for extracting field values from annotations and testing whether
   * they match a query term.
   *
   * [facet_name]:
   *   autofalse: a function for a preliminary false match result
   *   value: a function to extract to facet value for the annotation.
   *   match: a function to check if the extracted value matches the facet value
   */


  this.fields = {
    quote: {
      autofalse: function autofalse(ann) {
        return (ann.references || []).length > 0;
      },
      value: function value(annotation) {
        if (!annotation.target) {
          // FIXME: All annotations *must* have a target, so this check should
          // not be required.
          return '';
        }
        var target = annotation.target[0];
        var selectors = target.selector || [];

        return selectors.filter(function (s) {
          return s.type === 'TextQuoteSelector';
        }).map(function (s) {
          return s.exact;
        }).join('\n');
      },

      match: function match(term, value) {
        return value.indexOf(term) > -1;
      }
    },
    since: {
      autofalse: function autofalse(ann) {
        return typeof ann.updated !== 'string';
      },
      value: function value(ann) {
        return new Date(ann.updated);
      },
      match: function match(term, value) {
        var delta = (Date.now() - value) / 1000;
        return delta <= term;
      }
    },
    tag: {
      autofalse: function autofalse(ann) {
        return !Array.isArray(ann.tags);
      },
      value: function value(ann) {
        return ann.tags;
      },
      match: function match(term, value) {
        return value.includes(term);
      }
    },
    text: {
      autofalse: function autofalse(ann) {
        return typeof ann.text !== 'string';
      },
      value: function value(ann) {
        return ann.text;
      },
      match: function match(term, value) {
        return value.indexOf(term) > -1;
      }
    },
    uri: {
      autofalse: function autofalse(ann) {
        return typeof ann.uri !== 'string';
      },
      value: function value(ann) {
        return ann.uri;
      },
      match: function match(term, value) {
        return value.indexOf(term) > -1;
      }
    },
    user: {
      autofalse: function autofalse(ann) {
        return typeof ann.user !== 'string';
      },
      value: function value(ann) {
        return ann.user;
      },
      match: function match(term, value) {
        return value.indexOf(term) > -1;
      }
    }
  };

  /**
   * Filters a set of annotations.
   *
   * @param {Annotation[]} annotations
   * @param {Object} filters - Faceted filter generated by
   * `generateFacetedFilter`.
   * @return {string[]} IDs of matching annotations.
   */
  this.filter = function (annotations, filters) {
    // Convert the input filter object into a filter tree, expanding "any"
    // filters.
    var fieldFilters = Object.entries(filters).filter(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          filter = _ref2[1];

      return filter.terms.length > 0;
    }).map(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          field = _ref4[0],
          filter = _ref4[1];

      var terms = filter.terms.map(normalize);
      var termFilters;
      if (field === 'any') {
        var anyFields = ['quote', 'text', 'tag', 'user'];
        termFilters = terms.map(function (term) {
          return new BinaryOpFilter('or', anyFields.map(function (field) {
            return new TermFilter(field, term, _this.fields[field]);
          }));
        });
      } else {
        termFilters = terms.map(function (term) {
          return new TermFilter(field, term, _this.fields[field]);
        });
      }
      return new BinaryOpFilter(filter.operator, termFilters);
    });

    var rootFilter = new BinaryOpFilter('and', fieldFilters);

    return annotations.filter(function (ann) {
      return rootFilter.matches(ann);
    }).map(function (ann) {
      return ann.id;
    });
  };
}

module.exports = viewFilter;

},{}],184:[function(require,module,exports){
'use strict';

var EventEmitter = require('tiny-emitter');
var debounce = require('lodash.debounce');
var inherits = require('inherits');

/**
 * @typedef Options
 * @property {Function} [invisibleThreadFilter] - Function used to determine
 *   whether an off-screen thread should be rendered or not.  Called with a
 *   `Thread` and if it returns `true`, the thread is rendered even if offscreen.
 * @property {Element} [scrollRoot] - The scrollable Element which contains the
 *   thread list. The set of on-screen threads is determined based on the scroll
 *   position and height of this element.
 */

/**
 * VirtualThreadList is a helper for virtualizing the annotation thread list.
 *
 * 'Virtualizing' the thread list improves UI performance by only creating
 * annotation cards for annotations which are either in or near the viewport.
 *
 * Reducing the number of annotation cards that are actually created optimizes
 * the initial population of the list, since annotation cards are big components
 * that are expensive to create and consume a lot of memory. For Angular
 * applications this also helps significantly with UI responsiveness by limiting
 * the number of watchers (functions created by template expressions or
 * '$scope.$watch' calls) that have to be run on every '$scope.$digest()' cycle.
 *
 * @param {Window} container - The Window displaying the list of annotation threads.
 * @param {Thread} rootThread - The initial Thread object for the top-level
 *        threads.
 * @param {Options} options
 */
function VirtualThreadList($scope, window_, rootThread, options) {
  var self = this;

  this._rootThread = rootThread;

  this._options = Object.assign({}, options);

  // Cache of thread ID -> last-seen height
  this._heights = {};

  this.window = window_;
  this.scrollRoot = options.scrollRoot || document.body;

  var debouncedUpdate = debounce(function () {
    self._updateVisibleThreads();
    $scope.$digest();
  }, 20);
  this.scrollRoot.addEventListener('scroll', debouncedUpdate);
  this.window.addEventListener('resize', debouncedUpdate);

  this._detach = function () {
    this.scrollRoot.removeEventListener('scroll', debouncedUpdate);
    this.window.removeEventListener('resize', debouncedUpdate);
  };
}
inherits(VirtualThreadList, EventEmitter);

/**
 * Detach event listeners and clear any pending timeouts.
 *
 * This should be invoked when the UI view presenting the virtual thread list
 * is torn down.
 */
VirtualThreadList.prototype.detach = function () {
  this._detach();
};

/**
 * Sets the root thread containing all conversations matching the current
 * filters.
 *
 * This should be called with the current Thread object whenever the set of
 * matching annotations changes.
 */
VirtualThreadList.prototype.setRootThread = function (thread) {
  if (thread === this._rootThread) {
    return;
  }
  this._rootThread = thread;
  this._updateVisibleThreads();
};

/**
 * Sets the actual height for a thread.
 *
 * When calculating the amount of space required for offscreen threads,
 * the actual or 'last-seen' height is used if known. Otherwise an estimate
 * is used.
 *
 * @param {string} id - The annotation ID or $tag
 * @param {number} height - The height of the annotation thread.
 */
VirtualThreadList.prototype.setThreadHeight = function (id, height) {
  if (isNaN(height) || height <= 0) {
    throw new Error('Invalid thread height %d', height);
  }
  this._heights[id] = height;
};

VirtualThreadList.prototype._height = function (id) {
  // Default guess of the height required for a threads that have not been
  // measured
  var DEFAULT_HEIGHT = 200;
  return this._heights[id] || DEFAULT_HEIGHT;
};

/** Return the vertical offset of an annotation card from the top of the list. */
VirtualThreadList.prototype.yOffsetOf = function (id) {
  var self = this;
  var allThreads = this._rootThread.children;
  var matchIndex = allThreads.findIndex(function (thread) {
    return thread.id === id;
  });
  if (matchIndex === -1) {
    return 0;
  }
  return allThreads.slice(0, matchIndex).reduce(function (offset, thread) {
    return offset + self._height(thread.id);
  }, 0);
};

/**
 * Recalculates the set of visible threads and estimates of the amount of space
 * required for offscreen threads above and below the viewport.
 *
 * Emits a `changed` event with the recalculated set of visible threads.
 */
VirtualThreadList.prototype._updateVisibleThreads = function () {
  // Space above the viewport in pixels which should be considered 'on-screen'
  // when calculating the set of visible threads
  var MARGIN_ABOVE = 800;
  // Same as MARGIN_ABOVE but for the space below the viewport
  var MARGIN_BELOW = 800;

  // Estimated height in pixels of annotation cards which are below the
  // viewport and not actually created. This is used to create an empty spacer
  // element below visible cards in order to give the list's scrollbar the
  // correct dimensions.
  var offscreenLowerHeight = 0;
  // Same as offscreenLowerHeight but for cards above the viewport.
  var offscreenUpperHeight = 0;
  // List of annotations which are in or near the viewport and need to
  // actually be created.
  var visibleThreads = [];

  // List of annotations which are required to be rendered but we do not
  // want them visible. This is to ensure that we allow items to be rendered
  // and initialized (for saving purposes) without having them be presented
  // in out of context scenarios (i.e. in wrong order for sort)
  var invisibleThreads = [];

  var allThreads = this._rootThread.children;
  var visibleHeight = this.window.innerHeight;
  var usedHeight = 0;
  var thread;

  for (var i = 0; i < allThreads.length; i++) {
    thread = allThreads[i];
    var threadHeight = this._height(thread.id);

    var added = false;

    if (usedHeight + threadHeight < this.scrollRoot.scrollTop - MARGIN_ABOVE) {
      // Thread is above viewport
      offscreenUpperHeight += threadHeight;
    } else if (usedHeight < this.scrollRoot.scrollTop + visibleHeight + MARGIN_BELOW) {

      // Thread is either in or close to the viewport
      visibleThreads.push(thread);
      added = true;
    } else {

      // Thread is below viewport
      offscreenLowerHeight += threadHeight;
    }

    // any thread that is not going to go through the render process
    // because it is already outside of the viewport should be checked
    // to see if it needs to be added as an invisible render. So it will
    // be available to go through rendering but not visible to the user
    if (!added && this._options.invisibleThreadFilter && this._options.invisibleThreadFilter(thread)) {
      invisibleThreads.push(thread);
    }

    usedHeight += threadHeight;
  }

  this.emit('changed', {
    offscreenLowerHeight: offscreenLowerHeight,
    offscreenUpperHeight: offscreenUpperHeight,
    visibleThreads: visibleThreads,
    invisibleThreads: invisibleThreads
  });
};

module.exports = VirtualThreadList;

},{"inherits":5,"lodash.debounce":6,"tiny-emitter":40}],185:[function(require,module,exports){
'use strict';

var retry = require('retry');
var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');

// see https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
var CLOSE_NORMAL = 1000;

// Minimum delay, in ms, before reconnecting after an abnormal connection close.
var RECONNECT_MIN_DELAY = 1000;

/**
 * Socket is a minimal wrapper around WebSocket which provides:
 *
 * - Automatic reconnection in the event of an abnormal close
 * - Queuing of messages passed to send() whilst the socket is
 *   connecting
 * - Uses the standard EventEmitter API for reporting open, close, error
 *   and message events.
 */
function Socket(url) {
  var self = this;

  // queue of JSON objects which have not yet been submitted
  var messageQueue = [];

  // the current WebSocket instance
  var socket;

  // a pending operation to connect a WebSocket
  var operation;

  function sendMessages() {
    while (messageQueue.length > 0) {
      var messageString = JSON.stringify(messageQueue.shift());
      socket.send(messageString);
    }
  }

  // Connect the websocket immediately. If a connection attempt is already in
  // progress, do nothing.
  function connect() {
    if (operation) {
      return;
    }

    operation = retry.operation({
      minTimeout: RECONNECT_MIN_DELAY * 2,
      // Don't retry forever -- fail permanently after 10 retries
      retries: 10,
      // Randomize retry times to minimise the thundering herd effect
      randomize: true
    });

    operation.attempt(function () {
      socket = new WebSocket(url);
      socket.onopen = function (event) {
        onOpen();
        self.emit('open', event);
      };
      socket.onclose = function (event) {
        if (event.code === CLOSE_NORMAL) {
          self.emit('close', event);
          return;
        }
        var err = new Error('WebSocket closed abnormally, code: ' + event.code);
        console.warn(err);
        onAbnormalClose(err);
      };
      socket.onerror = function (event) {
        self.emit('error', event);
      };
      socket.onmessage = function (event) {
        self.emit('message', event);
      };
    });
  }

  // onOpen is called when a websocket connection is successfully established.
  function onOpen() {
    operation = null;
    sendMessages();
  }

  // onAbnormalClose is called when a websocket connection closes abnormally.
  // This may be the result of a failure to connect, or an abnormal close after
  // a previous successful connection.
  function onAbnormalClose(error) {
    // If we're already in a reconnection loop, trigger a retry...
    if (operation) {
      if (!operation.retry(error)) {
        console.error('reached max retries attempting to reconnect websocket');
      }
      return;
    }
    // ...otherwise reconnect the websocket after a short delay.
    var delay = RECONNECT_MIN_DELAY;
    delay += Math.floor(Math.random() * delay);
    operation = setTimeout(function () {
      operation = null;
      connect();
    }, delay);
  }

  /** Close the underlying WebSocket connection */
  this.close = function () {
    socket.close();
  };

  /**
   * Send a JSON object via the WebSocket connection, or queue it
   * for later delivery if not currently connected.
   */
  this.send = function (message) {
    messageQueue.push(message);
    if (this.isConnected()) {
      sendMessages();
    }
  };

  /** Returns true if the WebSocket is currently connected. */
  this.isConnected = function () {
    return socket.readyState === WebSocket.OPEN;
  };

  connect();
}

inherits(Socket, EventEmitter);

module.exports = Socket;

},{"inherits":5,"retry":32,"tiny-emitter":40}]},{},[106])
//# sourceMappingURL=sidebar.bundle.js.map

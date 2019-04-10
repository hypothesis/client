'use strict';

// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

// Load Angular libraries required by tests.
//
// The tests for Client currently rely on having
// a full version of jQuery available and several of
// the directive tests rely on angular.element() returning
// a full version of jQuery.
//
window.jQuery = window.$ = require('jquery');
require('angular');
require('angular-mocks');
require('angular-sanitize');

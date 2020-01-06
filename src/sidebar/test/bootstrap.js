// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

// Load Angular libraries required by tests.
//
// The tests for Client currently rely on having
// a full version of jQuery available and several of
// the directive tests rely on angular.element() returning
// a full version of jQuery.
//
const jQuery = require('jquery');
require('angular');
require('angular-mocks');

window.jQuery = window.$ = jQuery;

// Configure Enzyme for UI tests.
require('preact/debug');
const { configure } = require('enzyme');
const { Adapter } = require('enzyme-adapter-preact-pure');
configure({ adapter: new Adapter() });

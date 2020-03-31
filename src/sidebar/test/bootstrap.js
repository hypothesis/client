// Expose the sinon assertions.
sinon.assert.expose(assert, { prefix: null });

// Load Angular libraries required by tests.
//
// The tests for Client currently rely on having
// a full version of jQuery available and several of
// the directive tests rely on angular.element() returning
// a full version of jQuery.
//

import jQuery from 'jquery';

import 'angular';
import 'angular-mocks';

window.jQuery = window.$ = jQuery;

// Configure Enzyme for UI tests.
import 'preact/debug';

import { configure } from 'enzyme';
import { Adapter } from 'enzyme-adapter-preact-pure';

configure({ adapter: new Adapter() });

// Make all the icons that are available for use with `SvgIcon` in the actual
// app available in the tests. This enables validation of icon names passed to
// `SvgIcon`.
import iconSet from '../icons';
import { registerIcons } from '../components/svg-icon';
registerIcons(iconSet);

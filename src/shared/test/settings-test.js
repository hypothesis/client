'use strict';

var settings = require('../settings');

function createConfigElement(obj) {
  var el = document.createElement('script');
  el.type = 'application/json';
  el.textContent = JSON.stringify(obj);
  el.classList.add('js-hypothesis-config');
  el.classList.add('js-settings-test');
  return el;
}

function removeJSONScriptTags() {
  var elements = document.querySelectorAll('.js-settings-test');
  for (var i=0; i < elements.length; i++) {
    elements[i].parentNode.removeChild(elements[i]);
  }
}

describe('settings', function () {
  afterEach(removeJSONScriptTags);

  it('reads config from .js-hypothesis-config <script> tags', function () {
    document.body.appendChild(createConfigElement({key:'value'}));
    assert.deepEqual(settings(document), {key:'value'});
  });

  it('merges settings from all config <script> tags', function () {
    document.body.appendChild(createConfigElement({a: 1}));
    document.body.appendChild(createConfigElement({b: 2}));
    assert.deepEqual(settings(document), {a: 1, b: 2});
  });
});

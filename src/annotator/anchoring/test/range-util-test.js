import $ from 'jquery';

import {
  getTextNodes,
  getLastTextNodeUpTo,
  getFirstTextNodeNotBefore,
} from '../range-util';

describe('annotator/anchoring/range-util', function () {
  describe('#getTextNodes', () => {
    let container;
    before(function () {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('finds basic text nodes', () => {
      container.innerHTML = `<span>text 1</span><span>text 2</span>`;
      const result = getTextNodes($(container));
      assert.equal(result.length, 2);
      assert.equal(result[0].nodeValue, 'text 1');
      assert.equal(result[1].nodeValue, 'text 2');
    });

    it('finds basic text nodes and whitespace', () => {
      container.innerHTML = `<span>text 1</span>
        <span>text 2</span>`;
      const result = getTextNodes($(container));
      assert.equal(result.length, 3);
    });

    it('finds basic text nodes and whitespace but ignores comments', () => {
      container.innerHTML = `<span>text 1</span>
        <!--span>text 2</span-->`;
      const result = getTextNodes($(container));
      assert.equal(result.length, 2);
      assert.equal(result[0].nodeValue, 'text 1');
    });
  });

  describe('#getLastTextNodeUpTo', () => {
    let container;
    before(function () {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('gets the last text node', () => {
      container.innerHTML = `<span>text</span>`;
      const result = getLastTextNodeUpTo(container);
      assert.equal(result.nodeValue, 'text');
    });

    it('gets the last text node nested', () => {
      container.innerHTML = `<span>text first</span><span>text last</span>`;
      const result = getLastTextNodeUpTo(container);
      assert.equal(result.nodeValue, 'text last');
    });

    it('looks backwards to get the last text node if none are found', () => {
      container.innerHTML = `<span>text first</span><span>text last</span><div id="too-far"></div>`;
      const result = getLastTextNodeUpTo(container.querySelector('#too-far'));
      assert.equal(result.nodeValue, 'text last');
    });

    it.skip('returns null if no text node exists', () => {
      const result = getLastTextNodeUpTo(container);
      assert.isNull(result);
    });
  });

  describe('#getFirstTextNodeNotBefore', () => {
    let container;
    before(function () {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('gets the first text node', () => {
      container.innerHTML = `<span>text</span>`;
      const result = getFirstTextNodeNotBefore(container);
      assert.equal(result.nodeValue, 'text');
    });

    it('gets the last text node nested', () => {
      container.innerHTML = `<span>text first</span><span>text last</span>`;
      const result = getFirstTextNodeNotBefore(container);
      assert.equal(result.nodeValue, 'text first');
    });

    it('looks forward to get the first text node if none are found', () => {
      container.innerHTML = `<div id="too-far"></div><span>text first</span><span>text last</span>`;
      const result = getFirstTextNodeNotBefore(
        container.querySelector('#too-far')
      );
      assert.equal(result.nodeValue, 'text first');
    });

    it.skip('returns null if no text node exists', () => {
      const result = getFirstTextNodeNotBefore(container);
      assert.isNull(result);
    });
  });
});

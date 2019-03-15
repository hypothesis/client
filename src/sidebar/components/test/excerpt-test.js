'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');
const excerpt = require('../excerpt');

describe('excerpt', function() {
  // ExcerptOverflowMonitor fake instance created by the current test
  let fakeOverflowMonitor;

  const SHORT_DIV = '<div id="foo" style="height:5px;"></div>';
  const TALL_DIV = '<div id="foo" style="height:200px;">foo bar</div>';

  function excerptComponent(attrs, content) {
    const defaultAttrs = {
      enabled: true,
      contentData: 'the content',
      collapsedHeight: 40,
      inlineControls: false,
    };
    attrs = Object.assign(defaultAttrs, attrs);
    return util.createDirective(document, 'excerpt', attrs, {}, content);
  }

  before(function() {
    angular.module('app', []).component('excerpt', excerpt);
  });

  beforeEach(function() {
    function FakeOverflowMonitor(ctrl) {
      fakeOverflowMonitor = this; // eslint-disable-line consistent-this

      this.ctrl = ctrl;
      this.check = sinon.stub();
      this.contentStyle = sinon.stub().returns({});
    }

    angular.mock.module('app');
    angular.mock.module(function($provide) {
      $provide.value('ExcerptOverflowMonitor', FakeOverflowMonitor);
    });
  });

  context('when created', function() {
    it('schedules an overflow state recalculation', function() {
      excerptComponent({}, '<span id="foo"></span>');
      assert.called(fakeOverflowMonitor.check);
    });

    it('passes input properties to overflow state recalc', function() {
      const attrs = {
        animate: false,
        enabled: true,
        collapsedHeight: 40,
        inlineControls: false,
        overflowHysteresis: 20,
      };
      excerptComponent(attrs, '<span></span>');
      assert.deepEqual(fakeOverflowMonitor.ctrl.getState(), {
        animate: attrs.animate,
        enabled: attrs.enabled,
        collapsedHeight: attrs.collapsedHeight,
        collapse: true,
        overflowHysteresis: attrs.overflowHysteresis,
      });
    });

    it('reports the content height to ExcerptOverflowMonitor', function() {
      excerptComponent({}, TALL_DIV);
      assert.deepEqual(fakeOverflowMonitor.ctrl.contentHeight(), 200);
    });
  });

  context('input changes', function() {
    it('schedules an overflow state check when inputs change', function() {
      const element = excerptComponent({}, '<span></span>');
      fakeOverflowMonitor.check.reset();
      element.scope.contentData = 'new-content';
      element.scope.$digest();
      assert.calledOnce(fakeOverflowMonitor.check);
    });

    it('does not schedule a state check if inputs are unchanged', function() {
      const element = excerptComponent({}, '<span></span>');
      fakeOverflowMonitor.check.reset();
      element.scope.$digest();
      assert.notCalled(fakeOverflowMonitor.check);
    });
  });

  context('document events', function() {
    it('schedules an overflow check when media loads', function() {
      const element = excerptComponent(
        {},
        '<img src="https://example.com/foo.jpg">'
      );
      fakeOverflowMonitor.check.reset();
      util.sendEvent(element[0], 'load');
      assert.called(fakeOverflowMonitor.check);
    });

    it('schedules an overflow check when the window is resized', function() {
      const element = excerptComponent({}, '<span></span>');
      fakeOverflowMonitor.check.reset();
      util.sendEvent(element[0].ownerDocument.defaultView, 'resize');
      assert.called(fakeOverflowMonitor.check);
    });
  });

  context('visibility changes', function() {
    it('schedules an overflow check when shown', function() {
      const element = excerptComponent({}, '<span></span>');
      fakeOverflowMonitor.check.reset();

      // ng-hide is the class used by the ngShow and ngHide directives
      // to show or hide elements. For now, this is the only way of hiding
      // or showing excerpts that we need to support.
      element[0].classList.add('ng-hide');
      element.scope.$digest();
      assert.notCalled(fakeOverflowMonitor.check);

      element[0].classList.remove('ng-hide');
      element.scope.$digest();
      assert.called(fakeOverflowMonitor.check);
    });
  });

  context('excerpt content style', function() {
    it('sets the content style using ExcerptOverflowMonitor#contentStyle()', function() {
      const element = excerptComponent({}, '<span></span>');
      fakeOverflowMonitor.contentStyle.returns({ 'max-height': '52px' });
      element.scope.$digest();
      const content = element[0].querySelector('.excerpt');
      assert.equal(content.style.cssText.trim(), 'max-height: 52px;');
    });
  });

  describe('enabled state', function() {
    it('renders its contents in a .excerpt element by default', function() {
      const element = excerptComponent({}, '<span id="foo"></span>');

      assert.equal(element.find('.excerpt #foo').length, 1);
    });

    it('when enabled, renders its contents in a .excerpt element', function() {
      const element = excerptComponent(
        { enabled: true },
        '<span id="foo"></span>'
      );

      assert.equal(element.find('.excerpt #foo').length, 1);
    });

    it('when disabled, renders its contents but not in a .excerpt element', function() {
      const element = excerptComponent(
        { enabled: false },
        '<span id="foo"></span>'
      );

      assert.equal(element.find('.excerpt #foo').length, 0);
      assert.equal(element.find('#foo').length, 1);
    });
  });

  function isHidden(el) {
    return !el.offsetParent || el.classList.contains('ng-hide');
  }

  function findVisible(el, selector) {
    const elements = el.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      if (!isHidden(elements[i])) {
        return elements[i];
      }
    }
    return undefined;
  }

  describe('inline controls', function() {
    function findInlineControl(el) {
      return findVisible(el, '.excerpt__toggle-link');
    }

    it('displays inline controls if collapsed', function() {
      const element = excerptComponent({ inlineControls: true }, TALL_DIV);
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      const expandLink = findInlineControl(element[0]);
      assert.ok(expandLink);
      assert.equal(expandLink.querySelector('a').textContent, 'More');
    });

    it('does not display inline controls if not collapsed', function() {
      const element = excerptComponent({ inlineControls: true }, SHORT_DIV);
      const expandLink = findInlineControl(element[0]);
      assert.notOk(expandLink);
    });

    it('toggles the expanded state when clicked', function() {
      const element = excerptComponent({ inlineControls: true }, TALL_DIV);
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      const expandLink = findInlineControl(element[0]);
      angular.element(expandLink.querySelector('a')).click();
      element.scope.$digest();
      const collapseLink = findInlineControl(element[0]);
      assert.equal(collapseLink.querySelector('a').textContent, 'Less');
    });
  });

  describe('bottom area', function() {
    it('expands the excerpt when clicking at the bottom if collapsed', function() {
      const element = excerptComponent({ inlineControls: true }, TALL_DIV);
      element.scope.$digest();
      assert.isTrue(element.ctrl.collapse);
      const bottomArea = element[0].querySelector('.excerpt__shadow');
      angular.element(bottomArea).click();
      assert.isFalse(element.ctrl.collapse);
    });
  });

  describe('#onCollapsibleChanged', function() {
    it('is called when overflow state changes', function() {
      const callback = sinon.stub();
      excerptComponent(
        {
          onCollapsibleChanged: {
            args: ['collapsible'],
            callback: callback,
          },
        },
        '<span></span>'
      );
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      assert.calledWith(callback, true);
      fakeOverflowMonitor.ctrl.onOverflowChanged(false);
      assert.calledWith(callback, false);
    });
  });
});

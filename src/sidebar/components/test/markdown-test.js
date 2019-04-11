'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');
const markdown = require('../markdown');

describe('markdown', function() {
  function isHidden(element) {
    return element.classList.contains('ng-hide');
  }

  function inputElement(editor) {
    return editor[0].querySelector('.form-input');
  }

  function viewElement(editor) {
    return editor[0].querySelector('.markdown-body');
  }

  function toolbarButtons(editor) {
    return Array.from(editor[0].querySelectorAll('.markdown-tools-button'));
  }

  function getRenderedHTML(editor) {
    const contentElement = viewElement(editor);
    if (isHidden(contentElement)) {
      return 'rendered markdown is hidden';
    }
    return contentElement.innerHTML;
  }

  function mockFormattingCommand() {
    return {
      text: 'formatted text',
      selectionStart: 0,
      selectionEnd: 0,
    };
  }

  before(function() {
    angular.module('app', []).component('markdown', markdown);
  });

  beforeEach(function() {
    angular.mock.module('app');

    markdown.$imports.$mock({
      'lodash.debounce': function(fn) {
        // Make input change debouncing synchronous in tests
        return function() {
          fn();
        };
      },
      '../render-markdown': markdown => {
        return 'rendered:' + markdown;
      },
      '../markdown-commands': {
        convertSelectionToLink: mockFormattingCommand,
        toggleBlockStyle: mockFormattingCommand,
        toggleSpanStyle: mockFormattingCommand,
        LinkType: require('../../markdown-commands').LinkType,
      },
      '../media-embedder': {
        replaceLinksWithEmbeds: function(element) {
          // Tag the element as having been processed
          element.dataset.replacedLinksWithEmbeds = 'yes';
        },
      },
    });
  });

  afterEach(() => {
    markdown.$imports.$restore();
  });

  describe('read only state', function() {
    it('should show the rendered view when readOnly is true', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: true,
        text: 'Hello World',
      });
      assert.isTrue(isHidden(inputElement(editor)));
      assert.isFalse(isHidden(viewElement(editor)));
    });

    it('should show the editor when readOnly is false', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'Hello World',
      });
      assert.isFalse(isHidden(inputElement(editor)));
      assert.isTrue(isHidden(viewElement(editor)));
    });
  });

  describe('rendering', function() {
    it('should render input markdown', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: true,
        text: 'Hello World',
      });
      assert.equal(getRenderedHTML(editor), 'rendered:Hello World');
    });

    it('should render nothing if no text is provided', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: true,
      });
      assert.equal(getRenderedHTML(editor), 'rendered:');
    });

    it('should replace links with embeds in rendered output', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: true,
        text: 'A video: https://www.youtube.com/watch?v=yJDv-zdhzMY',
      });
      assert.equal(viewElement(editor).dataset.replacedLinksWithEmbeds, 'yes');
    });

    it('should tolerate malformed HTML', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: true,
        text: 'Hello <one two.',
      });
      assert.equal(getRenderedHTML(editor), 'rendered:Hello ');
    });
  });

  describe('toolbar buttons', function() {
    it('should apply formatting when clicking toolbar buttons', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'Hello World',
      });
      const input = inputElement(editor);
      toolbarButtons(editor).forEach(function(button) {
        input.value = 'original text';
        angular.element(button).click();
        assert.equal(input.value, mockFormattingCommand().text);
      });
    });

    it('should notify parent that the text changed', function() {
      const onEditText = sinon.stub();
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'Hello World',
        onEditText: {
          args: ['text'],
          callback: onEditText,
        },
      });
      toolbarButtons(editor).forEach(function(button) {
        onEditText.reset();
        angular.element(button).click();
        assert.calledWith(onEditText, inputElement(editor).value);
      });
    });
  });

  describe('editing', function() {
    it('should populate the input with the current text', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'initial comment',
        onEditText: function() {},
      });
      const input = inputElement(editor);
      assert.equal(input.value, 'initial comment');
    });

    it('should populate the input with empty text if no text is specified', function() {
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        onEditText: function() {},
      });
      const input = inputElement(editor);
      assert.equal(input.value, '');
    });

    it('should call onEditText() callback when text changes', function() {
      const onEditText = sinon.stub();
      const editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'Hello World',
        onEditText: {
          args: ['text'],
          callback: onEditText,
        },
      });
      const input = inputElement(editor);
      input.value = 'new text';
      util.sendEvent(input, 'input');
      assert.called(onEditText);
      assert.calledWith(onEditText, 'new text');
    });
  });

  describe('preview state', function() {
    let editor;

    function togglePreview() {
      const toggle = editor[0].querySelector('.markdown-tools-toggle');
      angular.element(toggle).click();
      editor.scope.$digest();
    }

    function isPreviewing() {
      return editor.ctrl.preview;
    }

    beforeEach(function() {
      // Create a new editor, initially in editing mode
      editor = util.createDirective(document, 'markdown', {
        readOnly: false,
        text: 'Hello World',
      });
    });

    it('enters preview mode when clicking the "Preview" toggle button', function() {
      togglePreview();
      assert.isTrue(isPreviewing());
    });

    it('should hide the input when previewing changes', function() {
      togglePreview();
      assert.isTrue(isHidden(inputElement(editor)));
    });

    it('should show the rendered markdown when previewing changes', function() {
      togglePreview();
      assert.isFalse(isHidden(viewElement(editor)));
    });

    it('exits preview mode when switching to read-only mode', function() {
      togglePreview();
      editor.scope.readOnly = true;
      editor.scope.$digest();
      assert.isFalse(isPreviewing());
    });
  });

  describe('custom text class', function() {
    it('should apply custom text class to text container', function() {
      const editor = util.createDirective(document, 'markdown', {
        customTextClass: 'fancy-effect',
        readOnly: true,
      });
      const viewEl = viewElement(editor);
      assert.include(viewEl.className, 'fancy-effect');
    });
  });
});

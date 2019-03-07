'use strict';

const debounce = require('lodash.debounce');

const commands = require('../markdown-commands');
const mediaEmbedder = require('../media-embedder');
const renderMarkdown = require('../render-markdown');
const scopeTimeout = require('../util/scope-timeout');

// @ngInject
function MarkdownController($element, $scope) {
  const input = $element[0].querySelector('.js-markdown-input');
  const output = $element[0].querySelector('.js-markdown-preview');

  const self = this;

  /**
   * Transform the editor's input field with an editor command.
   */
  function updateState(newStateFn) {
    const newState = newStateFn({
      text: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
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
    scopeTimeout(
      $scope,
      function() {
        input.focus();
      },
      0
    );
  }

  this.insertBold = function() {
    updateState(function(state) {
      return commands.toggleSpanStyle(state, '**', '**', 'Bold');
    });
  };

  this.insertItalic = function() {
    updateState(function(state) {
      return commands.toggleSpanStyle(state, '*', '*', 'Italic');
    });
  };

  this.insertMath = function() {
    updateState(function(state) {
      const before = state.text.slice(0, state.selectionStart);

      if (
        before.length === 0 ||
        before.slice(-1) === '\n' ||
        before.slice(-2) === '$$'
      ) {
        return commands.toggleSpanStyle(state, '$$', '$$', 'Insert LaTeX');
      } else {
        return commands.toggleSpanStyle(state, '\\(', '\\)', 'Insert LaTeX');
      }
    });
  };

  this.insertLink = function() {
    updateState(function(state) {
      return commands.convertSelectionToLink(state);
    });
  };

  this.insertIMG = function() {
    updateState(function(state) {
      return commands.convertSelectionToLink(
        state,
        commands.LinkType.IMAGE_LINK
      );
    });
  };

  this.insertList = function() {
    updateState(function(state) {
      return commands.toggleBlockStyle(state, '* ');
    });
  };

  this.insertNumList = function() {
    updateState(function(state) {
      return commands.toggleBlockStyle(state, '1. ');
    });
  };

  this.insertQuote = function() {
    updateState(function(state) {
      return commands.toggleBlockStyle(state, '> ');
    });
  };

  // Keyboard shortcuts for bold, italic, and link.
  $element.on('keydown', function(e) {
    const shortcuts = {
      66: self.insertBold,
      73: self.insertItalic,
      75: self.insertLink,
    };

    const shortcut = shortcuts[e.keyCode];
    if (shortcut && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      shortcut();
    }
  });

  this.preview = false;
  this.togglePreview = function() {
    self.preview = !self.preview;
  };

  const handleInputChange = debounce(function() {
    $scope.$apply(function() {
      self.onEditText({ text: input.value });
    });
  }, 100);
  input.addEventListener('input', handleInputChange);

  // Re-render the markdown when the view needs updating.
  $scope.$watch('vm.text', function() {
    output.innerHTML = renderMarkdown(self.text || '');
    mediaEmbedder.replaceLinksWithEmbeds(output);
  });

  this.showEditor = function() {
    return !self.readOnly && !self.preview;
  };

  // Exit preview mode when leaving edit mode
  $scope.$watch('vm.readOnly', function() {
    self.preview = false;
  });

  $scope.$watch('vm.showEditor()', function(show) {
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
    onEditText: '&',
  },
  template: require('../templates/markdown.html'),
};

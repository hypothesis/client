import { isEditableContext, nodeIsElement, nodeIsText } from '../node';

describe('annotator/util/node', () => {
  describe('nodeIsElement', () => {
    it('returns true for element nodes', () => {
      assert.isTrue(nodeIsElement(document.createElement('div')));
    });

    it('returns false for text nodes', () => {
      assert.isFalse(nodeIsElement(document.createTextNode('hello')));
    });
  });

  describe('nodeIsText', () => {
    it('returns true for text nodes', () => {
      assert.isTrue(nodeIsText(document.createTextNode('hello')));
    });

    it('returns false for element nodes', () => {
      assert.isFalse(nodeIsText(document.createElement('div')));
    });
  });

  describe('isEditableContext', () => {
    it('returns false for null', () => {
      assert.isFalse(isEditableContext(null));
    });

    it('returns false for non-HTMLElement EventTarget', () => {
      assert.isFalse(isEditableContext(document));
    });

    it('returns true for INPUT elements', () => {
      const input = document.createElement('input');
      assert.isTrue(isEditableContext(input));
    });

    it('returns true for TEXTAREA elements', () => {
      const textarea = document.createElement('textarea');
      assert.isTrue(isEditableContext(textarea));
    });

    it('returns true for contenteditable elements', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);
      try {
        assert.isTrue(isEditableContext(div));
      } finally {
        div.remove();
      }
    });

    it('returns true for element with role="textbox"', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'textbox');
      assert.isTrue(isEditableContext(div));
    });

    it('returns true for element inside role="textbox"', () => {
      const container = document.createElement('div');
      container.setAttribute('role', 'textbox');
      const span = document.createElement('span');
      container.appendChild(span);
      document.body.appendChild(container);
      try {
        assert.isTrue(isEditableContext(span));
      } finally {
        container.remove();
      }
    });

    it('returns false for ordinary non-editable element', () => {
      const div = document.createElement('div');
      assert.isFalse(isEditableContext(div));
    });
  });
});

export default class FragmentAnchor {
  constructor(root, id) {
    if (root === undefined) {
      throw new Error('missing required parameter "root"');
    }
    if (id === undefined) {
      throw new Error('missing required parameter "id"');
    }

    this.root = root;
    this.id = id;
  }

  static fromRange(root, range) {
    if (root === undefined) {
      throw new Error('missing required parameter "root"');
    }
    if (range === undefined) {
      throw new Error('missing required parameter "range"');
    }

    let el = range.commonAncestorContainer;
    while (el != null && !el.id) {
      if (root.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_CONTAINED_BY) {
        el = el.parentElement;
      } else {
        throw new Error('no fragment identifier found');
      }
    }

    return new FragmentAnchor(root, el.id);
  }

  static fromSelector(root, selector = {}) {
    return new FragmentAnchor(root, selector.value);
  }

  toRange() {
    let el = this.root.querySelector('#' + this.id);
    if (el == null) {
      throw new Error('no element found with id "' + this.id + '"');
    }

    let range = this.root.ownerDocument.createRange();
    range.selectNodeContents(el);

    return range;
  }

  toSelector() {
    let el = this.root.querySelector('#' + this.id);
    if (el == null) {
      throw new Error('no element found with id "' + this.id + '"');
    }

    let conformsTo = 'https://tools.ietf.org/html/rfc3236';
    if (el instanceof SVGElement) {
      conformsTo = 'http://www.w3.org/TR/SVG/';
    }

    return {
      type: 'FragmentSelector',
      value: this.id,
      conformsTo: conformsTo,
    };
  }
}

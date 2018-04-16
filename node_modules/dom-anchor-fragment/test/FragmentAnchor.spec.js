import FragmentAnchor from '../FragmentAnchor';

describe('FragmentAnchor', () => {
  before(() => {
    fixture.setBase('test/fixtures');
  });

  beforeEach(() => {
    fixture.load('test.html');
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('is a function', () => {
      assert.isFunction(FragmentAnchor);
    });

    it('requires root argument', () => {
      let construct = () => new FragmentAnchor();
      assert.throws(construct,'required parameter');
    });

    it('requires an id argument', () => {
      let construct = () => new FragmentAnchor(fixture.el);
      assert.throws(construct,'required parameter');
    });

    it('constructs a new instance with the given root and id', () => {
      let root = fixture.el;
      let instance = new FragmentAnchor(root, 'foo');
      assert.instanceOf(instance, FragmentAnchor);
      assert.equal(instance.root, fixture.el);
      assert.equal(instance.id, 'foo');
    });
  });

  describe('fromRange', () => {
    it('requires a root argument', () => {
      let construct = () => FragmentAnchor.fromRange();
      assert.throws(construct, 'required parameter');
    });

    it('requires a range argument', () => {
      let construct = () => FragmentAnchor.fromRange(document.body);
      assert.throws(construct, 'required parameter');
    });

    it('throws an error if no fragment identifier is found', () => {
      let root = fixture.el;
      let range = document.createRange();
      range.selectNode(root);
      let attempt = () => FragmentAnchor.fromRange(root, range);
      assert.throws(attempt, 'no fragment');
    });

    it('returns a FragmentAnchor if the common ancestor has an id', () => {
      let root = fixture.el;
      let range = document.createRange();
      range.selectNodeContents(root);
      let anchor = FragmentAnchor.fromRange(root, range);
      assert.equal(anchor.id, fixture.el.id);
    });

    it('returns a FragmentAnchor if any ancestor has an id', () => {
      let root = fixture.el;
      let range = document.createRange();
      range.selectNodeContents(fixture.el.children[0]);
      let anchor = FragmentAnchor.fromRange(root, range);
      assert.equal(anchor.id, fixture.el.id);
    });
  });

  describe('fromSelector', () => {
    it('requires a root argument', () => {
      let construct = () => FragmentAnchor.fromSelector();
      assert.throws(construct, 'required parameter');
    });

    it('requires a selector argument', () => {
      let construct = () => FragmentAnchor.fromSelector(fixture.el);
      assert.throws(construct, 'required parameter');
    });

    it('returns a FragmentAnchor from the value of the selector', () => {
      let selector = {
        value: 'foo',
      };
      let anchor = FragmentAnchor.fromSelector(fixture.el, selector);
      assert(anchor.root === fixture.el);
      assert(anchor.id === selector.value);
    });
  });

  describe('toRange', () => {
    it('returns a range selecting the contents of the Element', () => {
      let root = document.body;
      let anchor = new FragmentAnchor(root, fixture.el.id);
      let range = anchor.toRange();
      assert.strictEqual(range.commonAncestorContainer, fixture.el);
    });

    it('throws an error if no Element exists with the stored id', () => {
      let root = document.body;
      let anchor = new FragmentAnchor(root, 'bogus');
      let attempt = () => anchor.toRange();
      assert.throws(attempt, 'no element found');
    });
  });

  describe('toSelector', () => {
    it('returns a selector for an HTMLElement', () => {
      let anchor = new FragmentAnchor(document.body, fixture.el.id);
      let selector = anchor.toSelector();
      assert.equal(selector.type, 'FragmentSelector');
      assert.equal(selector.value, fixture.el.id);
      assert.equal(selector.conformsTo, 'https://tools.ietf.org/html/rfc3236');
    });

    it('returns a selector for an SVGElement', () => {
      let svg = document.createElementNS(
        'http://www.w3.org/2000/svg', 'svg');
      let rect = document.createElementNS(
        'http://www.w3.org/2000/svg', 'rect');
      rect.id = 'rectangle1';
      fixture.el.appendChild(svg);
      svg.appendChild(rect);
      let anchor = new FragmentAnchor(svg, rect.id);
      let selector = anchor.toSelector();
      assert.equal(selector.type, 'FragmentSelector');
      assert.equal(selector.value, rect.id);
      assert.equal(selector.conformsTo, 'http://www.w3.org/TR/SVG/');
    });

    it('throws an error if no Element exists with the stored id', () => {
      let anchor = new FragmentAnchor(fixture.el, 'bogus');
      let attempt = () => anchor.toSelector();
      assert.throws(attempt, 'no element found');
    });
  });
});

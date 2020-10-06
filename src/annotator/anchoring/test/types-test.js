import {
  RangeAnchor,
  TextPositionAnchor,
  TextQuoteAnchor,
  $imports,
} from '../types';

// These are primarily basic API tests for the anchoring classes. Tests for
// anchoring a variety of HTML and PDF content exist in `html-test` and
// `pdf-test`.
describe('annotator/anchoring/types', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = [
      'Four score and seven years ago our fathers brought forth on this continent,',
      'a new nation, conceived in Liberty, and dedicated to the proposition that',
      'all men are created equal.',
    ].join(' ');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('RangeAnchor', () => {
    let fakeSniff;
    let fakeSerializedRange;
    let fakeNormalize;
    let fakeSerialize;

    beforeEach(() => {
      fakeSerializedRange = sinon.stub();
      fakeSerialize = sinon.stub();
      fakeNormalize = sinon.stub().returns({
        serialize: fakeSerialize,
      });
      fakeSniff = sinon.stub().returns({
        normalize: fakeNormalize,
      });
      $imports.$mock({
        './range': {
          sniff: fakeSniff,
          SerializedRange: fakeSerializedRange,
        },
      });
    });

    afterEach(() => {
      $imports.$restore();
    });

    describe('#fromRange', () => {
      it('returns a RangeAnchor instance', () => {
        const anchor = RangeAnchor.fromRange(container, new Range());
        assert.calledOnce(fakeNormalize);
        assert.instanceOf(anchor, RangeAnchor);
        assert.deepEqual(anchor.range, fakeNormalize());
      });
    });

    describe('#fromSelector', () => {
      it('returns a RangeAnchor instance', () => {
        const anchor = RangeAnchor.fromSelector(container, {
          type: 'RangeSelector',
          startContainer: '/div[1]',
          startOffset: 0,
          endContainer: '/div[1]',
          endOffset: 1,
        });
        assert.calledOnce(fakeSerializedRange);
        assert.instanceOf(anchor, RangeAnchor);
      });
    });

    describe('#toRange', () => {
      it('returns a normalized range result', () => {
        fakeNormalize.returns({
          toRange: sinon.stub().returns('normalized range'),
        });
        const range = new RangeAnchor(container, new Range());
        assert.equal(range.toRange(), 'normalized range');
      });
    });

    describe('#toSelector', () => {
      beforeEach(() => {
        fakeSerialize.returns({
          start: '/div[1]',
          startOffset: 0,
          end: '/div[1]',
          endOffset: 1,
        });
      });

      function rangeSelectorResult() {
        return {
          type: 'RangeSelector',
          startContainer: '/div[1]',
          startOffset: 0,
          endContainer: '/div[1]',
          endOffset: 1,
        };
      }

      it('returns a RangeSelector', () => {
        const range = new RangeAnchor(container, new Range());
        assert.deepEqual(range.toSelector({}), rangeSelectorResult());
      });

      it('returns a RangeSelector if options are missing', () => {
        const range = new RangeAnchor(container, new Range());
        assert.deepEqual(range.toSelector(), rangeSelectorResult());
      });
    });
  });

  describe('TextPositionAnchor', () => {
    let fakePosFromRange;
    let fakePosToRange;

    beforeEach(() => {
      fakePosFromRange = sinon.stub();
      fakePosToRange = sinon.stub();
      $imports.$mock({
        'dom-anchor-text-position': {
          fromRange: fakePosFromRange,
          toRange: fakePosToRange,
        },
      });
    });

    afterEach(() => {
      $imports.$restore();
    });

    function createTextPositionAnchor() {
      return new TextPositionAnchor(container, 0, 0);
    }

    describe('#fromRange', () => {
      it('returns a TextPositionAnchor instance', () => {
        fakePosFromRange.returns({
          start: 0,
          end: 1,
        });
        const anchor = TextPositionAnchor.fromRange(container, new Range());
        assert.calledOnce(fakePosFromRange);
        assert.instanceOf(anchor, TextPositionAnchor);
      });
    });

    describe('#fromSelector', () => {
      it('returns a TextPositionAnchor instance', () => {
        const anchor = TextPositionAnchor.fromSelector(container, {
          start: 0,
          end: 0,
        });
        assert.instanceOf(anchor, TextPositionAnchor);
      });
    });

    describe('#toSelector', () => {
      it('returns a TextPositionSelector', () => {
        const anchor = createTextPositionAnchor();
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextPositionSelector',
          start: 0,
          end: 0,
        });
      });
    });

    describe('#toRange', () => {
      it('returns a range object', () => {
        const anchor = createTextPositionAnchor();
        fakePosToRange.returns('fake range');
        assert.equal(anchor.toRange(), 'fake range');
        assert.calledWith(fakePosToRange, container, { start: 0, end: 0 });
      });
    });

    describe('integration tests', () => {
      beforeEach(() => {
        // restore dom-anchor-text-position to test third party lib integration
        $imports.$restore({
          'dom-anchor-text-position': true,
        });
      });

      it('can convert a Range to TextPositionSelector and back to a Range', () => {
        const range = document.createRange();
        range.setStart(container.firstChild, 0);
        range.setEnd(container.firstChild, 4);
        const anchor = TextPositionAnchor.fromRange(container, range);
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextPositionSelector',
          start: 0,
          end: 4,
        });
        const newRange = anchor.toRange();
        assert.deepEqual(newRange, range);
        assert.equal(newRange.toString(), 'Four');
      });
    });
  });

  describe('TextQuoteAnchor', () => {
    let fakeQuoteToRange;
    let fakeQuoteFromRange;
    let fakeToTextPosition;

    beforeEach(() => {
      fakeQuoteToRange = sinon.stub();
      fakeQuoteFromRange = sinon.stub();
      fakeToTextPosition = sinon.stub();
      $imports.$mock({
        'dom-anchor-text-quote': {
          fromRange: fakeQuoteFromRange,
          toRange: fakeQuoteToRange,
          toTextPosition: fakeToTextPosition,
        },
      });
    });

    afterEach(() => {
      $imports.$restore();
    });

    function createTextQuoteAnchor() {
      return new TextQuoteAnchor(container, 'Liberty', {
        prefix: 'a new nation, conceived in ',
        suffix: ', and dedicated to the proposition that',
      });
    }

    describe('#fromRange', () => {
      it('returns a TextQuoteAnchor instance', () => {
        fakeQuoteFromRange.returns({
          prefix: 'Four score and ',
          suffix: 'brought forth on this continent',
        });
        const anchor = TextQuoteAnchor.fromRange(container, new Range());
        assert.called(fakeQuoteFromRange);
        assert.instanceOf(anchor, TextQuoteAnchor);
      });
    });

    describe('#fromSelector', () => {
      it('returns a TextQuoteAnchor instance', () => {
        const anchor = TextQuoteAnchor.fromSelector(container, {
          type: 'TextQuoteSelector',
          exact: 'Liberty',
          prefix: 'a new nation, conceived in ',
          suffix: ', and dedicated to the proposition that',
        });
        assert.instanceOf(anchor, TextQuoteAnchor);
      });
    });

    describe('#toSelector', () => {
      it('returns a TextQuoteSelector', () => {
        const anchor = createTextQuoteAnchor();
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextQuoteSelector',
          exact: 'Liberty',
          prefix: 'a new nation, conceived in ',
          suffix: ', and dedicated to the proposition that',
        });
      });
    });

    describe('#toRange', () => {
      it('returns a valid DOM Range', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toRange: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const range = quoteAnchor.toRange();
        assert.instanceOf(range, Range);
        assert.equal(range.toString(), 'Liberty');
      });

      it('throws if the quote is not found', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toRange: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'five score and nine years ago'
        );
        assert.throws(() => {
          quoteAnchor.toRange();
        });
      });
    });

    describe('#toPositionAnchor', () => {
      it('returns a TextPositionAnchor instance', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toTextPosition: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const pos = quoteAnchor.toPositionAnchor();
        assert.instanceOf(pos, TextPositionAnchor);
      });

      it('throws if the quote is not found', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toTextPosition: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'some are more equal than others'
        );
        assert.throws(() => {
          quoteAnchor.toPositionAnchor();
        });
      });
    });

    describe('integration tests', () => {
      beforeEach(() => {
        // restore dom-anchor-text-quote to test third party lib integration
        $imports.$restore({
          'dom-anchor-text-quote': true,
        });
      });

      it('can convert a Range to TextQuoteSelector and back to a Range', () => {
        const range = document.createRange();
        range.setStart(container.firstChild, 0);
        range.setEnd(container.firstChild, 4);
        const anchor = TextQuoteAnchor.fromRange(container, range);
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextQuoteSelector',
          prefix: '',
          suffix: ' score and seven years ago our f',
          exact: 'Four',
        });
        const newRange = anchor.toRange();
        assert.equal(newRange.toString(), 'Four');
      });
    });
  });
});

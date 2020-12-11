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
    let FakeTextRange;

    beforeEach(() => {
      const textRange = {
        start: { element: container, offset: 0 },
        end: { element: container, offset: 1 },

        relativeTo: sinon.stub(),
        toRange: sinon.stub(),
      };

      FakeTextRange = {
        fromOffsets: sinon.stub().returns(textRange),
        fromRange: sinon.stub().returns(textRange),
        instance: textRange,
      };

      $imports.$mock({
        './text-range': {
          TextRange: FakeTextRange,
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
        FakeTextRange.instance.relativeTo.returns(FakeTextRange.instance);
        const range = new Range();

        const anchor = TextPositionAnchor.fromRange(container, range);

        assert.calledWith(FakeTextRange.fromRange, range);
        assert.calledWith(FakeTextRange.instance.relativeTo, container);
        assert.equal(anchor.start, FakeTextRange.instance.start.offset);
        assert.equal(anchor.end, FakeTextRange.instance.end.offset);
      });
    });

    describe('#fromSelector', () => {
      it('returns a TextPositionAnchor instance', () => {
        const anchor = TextPositionAnchor.fromSelector(container, {
          start: 0,
          end: 1,
        });
        assert.equal(anchor.start, 0);
        assert.equal(anchor.end, 1);
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
        FakeTextRange.instance.toRange.returns('fake range');
        const anchor = createTextPositionAnchor();
        assert.equal(anchor.toRange(), 'fake range');
        assert.calledWith(
          FakeTextRange.fromOffsets,
          container,
          anchor.start,
          anchor.end
        );
      });
    });

    describe('integration tests', () => {
      beforeEach(() => {
        $imports.$restore({
          './text-range': true,
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
    let fakeMatchQuote;

    beforeEach(() => {
      fakeMatchQuote = sinon.stub();
      $imports.$mock({
        './match-quote': {
          matchQuote: fakeMatchQuote,
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
        const range = new Range();
        range.selectNodeContents(container);
        const anchor = TextQuoteAnchor.fromRange(container, range);

        // TODO - Check the properties of the returned anchor.
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
          './match-quote': true,
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const range = quoteAnchor.toRange();
        assert.instanceOf(range, Range);
        assert.equal(range.toString(), 'Liberty');
      });

      it('throws if the quote is not found', () => {
        fakeMatchQuote.returns(null);
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
          './match-quote': true,
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const pos = quoteAnchor.toPositionAnchor();
        assert.instanceOf(pos, TextPositionAnchor);
      });

      it('throws if the quote is not found', () => {
        $imports.$restore({
          './match-quote': true,
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
        $imports.$restore({
          './match-quote': true,
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

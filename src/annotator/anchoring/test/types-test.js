'use strict';

const types = require('../types');

const TextQuoteAnchor = types.TextQuoteAnchor;
const TextPositionAnchor = types.TextPositionAnchor;

// These are primarily basic API tests for the anchoring classes. Tests for
// anchoring a variety of HTML and PDF content exist in `html-test` and
// `pdf-test`.
describe('types', function() {
  let container;

  before(function() {
    container = document.createElement('div');
    container.innerHTML = [
      'Four score and seven years ago our fathers brought forth on this continent,',
      'a new nation, conceived in Liberty, and dedicated to the proposition that',
      'all men are created equal.',
    ].join(' ');
    document.body.appendChild(container);
  });

  after(function() {
    container.remove();
  });

  describe('TextQuoteAnchor', function() {
    describe('#toRange', function() {
      it('returns a valid DOM Range', function() {
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const range = quoteAnchor.toRange();
        assert.instanceOf(range, Range);
        assert.equal(range.toString(), 'Liberty');
      });

      it('throws if the quote is not found', function() {
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'five score and nine years ago'
        );
        assert.throws(function() {
          quoteAnchor.toRange();
        });
      });
    });

    describe('#toPositionAnchor', function() {
      it('returns a TextPositionAnchor', function() {
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const pos = quoteAnchor.toPositionAnchor();
        assert.instanceOf(pos, TextPositionAnchor);
      });

      it('throws if the quote is not found', function() {
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'some are more equal than others'
        );
        assert.throws(function() {
          quoteAnchor.toPositionAnchor();
        });
      });
    });
  });
});

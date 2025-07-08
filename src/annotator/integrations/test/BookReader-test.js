import { BookReaderIntegration, isBookReader } from '../BookReader';

describe('annotator/integrations/BookReader', () => {
  describe('isBookReader', () => {
    beforeEach(() => {
      delete window.br;
    });

    it('returns true in BookReader', () => {
      window.br = {};
      assert.isTrue(isBookReader());
    });

    it('returns false in other applications', () => {
      assert.isFalse(isBookReader());
    });
  });

  describe('BookReaderIntegration', () => {
    /** @type {HTMLDivElement} */
    let brRoot;
    /** @type {BookReaderIntegration} */
    let brIntegration;
    /** @type {import('../../../types/annotator').Annotator} */
    let fakeAnnotator;
    /** @type {import('../../../types/annotator').Anchor} */
    let fakeAnchor;

    beforeEach(() => {
      brRoot = document.createElement('div');
      fakeAnchor = {
        highlights: [],
        target: {
          selector: [
            {
              type: 'TextQuoteSelector',
              prefix: 'prefix',
              suffix: 'suffix',
              exact: 'exact',
            },
            {
              type: 'PageSelector',
              index: 14,
              label: 'x',
            },
          ],
        },
      };
      fakeAnnotator = {
        anchor: sinon.stub(),
        anchors: [],
      };

      window.br = {
        options: {
          bookTitle: 'Dummy Title',
          bookUri: 'dummy-uri',
        },
        refs: {
          $br: {
            0: brRoot,
          },
        },
        activeMode: {
          name: '1up',
        },
        on: sinon.stub(),
        off: sinon.stub(),
        jumpToIndex: sinon.stub(),
        switchMode: sinon.stub(),
        plugins: {
          textSelection: {
            options: { enabled: true },
          },
        },
      };

      brIntegration = new BookReaderIntegration(fakeAnnotator);
    });

    afterEach(() => {
      delete window.br;
    });

    it('re-anchors placeholders if page now visible', () => {
      const [placeholderHighlight, anchor] = createPlaceholderHighlight(
        brRoot,
        fakeAnchor,
        fakeAnnotator,
      );
      brIntegration._update();

      // Page is not attached, so placeholder should remain
      assert.isNotNull(placeholderHighlight.parentNode);
      assert.lengthOf(anchor.highlights, 1);
      assert.equal(anchor.highlights[0], placeholderHighlight);
      assert.notCalled(fakeAnnotator.anchor);

      // Attach the page
      createFakePage(brRoot);
      brIntegration._update();

      // Now the page is visible, so placeholder should be removed
      assert.isNull(placeholderHighlight.parentNode);
      assert.lengthOf(anchor.highlights, 0);
      assert.calledOnce(fakeAnnotator.anchor);
      assert.calledWith(fakeAnnotator.anchor, anchor.annotation);
    });

    it('re-anchors annotations if their page is removed', () => {
      const [highlight, anchor] = createNonPlaceholderHighlight(
        brRoot,
        fakeAnchor,
        fakeAnnotator,
      );

      // We haven't created the page, so this is like if the page has been removed
      brIntegration._update();

      // The highlight should have been removed
      assert.isNull(highlight.parentNode);
      assert.lengthOf(anchor.highlights, 0);
    });

    it('switches mode when anchoring in thumb mode ', async () => {
      window.br.activeMode.name = 'thumb';

      await brIntegration.scrollToAnchor(fakeAnchor);

      assert.calledOnce(window.br.switchMode);
      assert.calledOnce(window.br.jumpToIndex);
    });
  });
});

/**
 * @param {HTMLDivElement} brRoot
 */
function createFakePage(brRoot) {
  const fakePage = document.createElement('div');
  fakePage.classList.add('BRpagecontainer');
  fakePage.setAttribute('data-index', '14');
  brRoot.appendChild(fakePage);
  return fakePage;
}

/**
 * @param {HTMLDivElement} brRoot
 * @param {import('../../../types/annotator').Anchor} fakeAnchor
 * @param {import('../../../types/annotator').Annotator} fakeAnnotator
 * @returns {[HTMLDivElement, import('../../../types/annotator').Anchor]}
 */
function createPlaceholderHighlight(brRoot, fakeAnchor, fakeAnnotator) {
  const placeholderHighlight = document.createElement('div');
  placeholderHighlight.classList.add('BRhypothesisPlaceholder');
  brRoot.appendChild(placeholderHighlight);
  const anchor = {
    ...fakeAnchor,
    highlights: [placeholderHighlight],
  };
  fakeAnnotator.anchors = [anchor];
  return [placeholderHighlight, anchor];
}

/**
 * @param {HTMLDivElement} brRoot
 * @param {import('../../../types/annotator').Anchor} fakeAnchor
 * @param {import('../../../types/annotator').Annotator} fakeAnnotator
 * @returns {[HTMLDivElement, import('../../../types/annotator').Anchor]}
 */
function createNonPlaceholderHighlight(brRoot, fakeAnchor, fakeAnnotator) {
  const highlight = document.createElement('div');
  const innerText = document.createElement('div');
  highlight.appendChild(innerText);
  brRoot.appendChild(highlight);
  const anchor = {
    ...fakeAnchor,
    highlights: [highlight],
  };
  fakeAnnotator.anchors = [anchor];
  return [highlight, anchor];
}

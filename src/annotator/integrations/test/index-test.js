import { createIntegration, $imports } from '../index';

describe('createIntegration', () => {
  let FakeHTMLIntegration;
  let FakePDFIntegration;
  let fakeIsPDF;

  beforeEach(() => {
    FakeHTMLIntegration = sinon.stub();
    FakePDFIntegration = sinon.stub();
    fakeIsPDF = sinon.stub().returns(false);

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
      './pdf': { PDFIntegration: FakePDFIntegration, isPDF: fakeIsPDF },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('creates PDF integration in the PDF.js viewer', () => {
    const annotator = {};
    fakeIsPDF.returns(true);

    const integration = createIntegration(annotator);

    assert.calledWith(FakePDFIntegration, annotator);
    assert.instanceOf(integration, FakePDFIntegration);
  });

  it('creates HTML integration in web pages', () => {
    const annotator = {};

    const integration = createIntegration(annotator);

    assert.calledWith(FakeHTMLIntegration);
    assert.instanceOf(integration, FakeHTMLIntegration);
  });
});

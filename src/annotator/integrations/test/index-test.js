import { createIntegration, $imports } from '../index';

describe('createIntegration', () => {
  let FakeHTMLIntegration;
  let FakePDFIntegration;
  let FakeVitalSourceContentIntegration;
  let fakeIsPDF;
  let fakeVitalSourceFrameRole;

  beforeEach(() => {
    FakeHTMLIntegration = sinon.stub();
    FakePDFIntegration = sinon.stub();
    fakeIsPDF = sinon.stub().returns(false);

    fakeVitalSourceFrameRole = sinon.stub().returns(null);
    FakeVitalSourceContentIntegration = sinon.stub();

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
      './pdf': { PDFIntegration: FakePDFIntegration, isPDF: fakeIsPDF },
      './vitalsource': {
        VitalSourceContentIntegration: FakeVitalSourceContentIntegration,
        vitalSourceFrameRole: fakeVitalSourceFrameRole,
      },
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

  it('passes options to PDF integration', () => {
    const annotator = {};
    fakeIsPDF.returns(true);

    createIntegration(annotator, {
      contentPartner: 'jstor',
    });

    assert.calledWith(FakePDFIntegration, annotator, {
      contentPartner: 'jstor',
    });
  });

  it('creates VitalSource content integration in the VS Bookshelf reader', () => {
    const annotator = {};
    fakeVitalSourceFrameRole.returns('content');

    const integration = createIntegration(annotator);

    assert.calledWith(FakeVitalSourceContentIntegration);
    assert.instanceOf(integration, FakeVitalSourceContentIntegration);
  });

  it('creates HTML integration in web pages', () => {
    const annotator = {};

    const integration = createIntegration(annotator);

    assert.calledWith(FakeHTMLIntegration);
    assert.instanceOf(integration, FakeHTMLIntegration);
  });
});

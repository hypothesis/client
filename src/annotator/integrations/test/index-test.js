import { createIntegration, $imports } from '../index';

describe('createIntegration', () => {
  let FakeHTMLIntegration;
  let FakePDFIntegration;
  let FakeVitalSourceContainerIntegration;
  let FakeVitalSourceContentIntegration;
  let fakeIsPDF;
  let fakeVitalSourceFrameRole;

  beforeEach(() => {
    FakeHTMLIntegration = sinon.stub();
    FakePDFIntegration = sinon.stub();
    fakeIsPDF = sinon.stub().returns(false);

    fakeVitalSourceFrameRole = sinon.stub().returns(null);
    FakeVitalSourceContainerIntegration = sinon.stub();
    FakeVitalSourceContentIntegration = sinon.stub();

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
      './pdf': { PDFIntegration: FakePDFIntegration, isPDF: fakeIsPDF },
      './vitalsource': {
        VitalSourceContainerIntegration: FakeVitalSourceContainerIntegration,
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

    const [integration, frameIdentifier] = createIntegration(annotator);

    assert.calledWith(FakePDFIntegration, annotator);
    assert.instanceOf(integration, FakePDFIntegration);
    assert.equal(frameIdentifier, 'main');
  });

  it('creates VitalSource container integration in the VS Bookshelf reader', () => {
    const annotator = {};
    fakeVitalSourceFrameRole.returns('container');

    const [integration, frameIdentifier] = createIntegration(annotator);

    assert.calledWith(FakeVitalSourceContainerIntegration, annotator);
    assert.instanceOf(integration, FakeVitalSourceContainerIntegration);
    assert.match(frameIdentifier, /sub_\w{10}/);
  });

  it('creates VitalSource content integration in the VS Bookshelf reader', () => {
    const annotator = {};
    fakeVitalSourceFrameRole.returns('content');

    const [integration, frameIdentifier] = createIntegration(annotator);

    assert.calledWith(FakeVitalSourceContentIntegration);
    assert.instanceOf(integration, FakeVitalSourceContentIntegration);
    assert.equal(frameIdentifier, 'main');
  });

  it('creates HTML integration in the main frame', () => {
    const annotator = {};

    const [integration, frameIdentifier] = createIntegration(annotator);

    assert.calledWith(FakeHTMLIntegration);
    assert.instanceOf(integration, FakeHTMLIntegration);
    assert.equal(frameIdentifier, 'main');
  });

  it('creates HTML integration in the secondary iframes', () => {
    const annotator = {};

    const [integration, frameIdentifier] = createIntegration(
      annotator,
      'other annotatable iframe'
    );

    assert.calledWith(FakeHTMLIntegration);
    assert.instanceOf(integration, FakeHTMLIntegration);
    assert.match(frameIdentifier, /sub_\w{10}/);
  });
});

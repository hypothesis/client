'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const Tutorial = require('../tutorial');
const mockImportedComponents = require('./mock-imported-components');

describe('Tutorial', function() {
  let fakeIsThirdPartyService;

  function createComponent(props) {
    return mount(<Tutorial settings={{}} {...props} />);
  }

  beforeEach(() => {
    fakeIsThirdPartyService = sinon.stub().returns(false);

    Tutorial.$imports.$mock(mockImportedComponents());
    Tutorial.$imports.$mock({
      '../util/is-third-party-service': fakeIsThirdPartyService,
    });
  });

  afterEach(() => {
    Tutorial.$imports.$restore();
  });

  it('should show four "steps" of instructions to first-party users', () => {
    const wrapper = createComponent();
    const tutorialEntries = wrapper.find('li');

    assert.equal(tutorialEntries.length, 4);
  });

  it('should show three "steps" of instructions to third-party users', () => {
    fakeIsThirdPartyService.returns(true);
    const wrapper = createComponent();
    const tutorialEntries = wrapper.find('li');

    assert.equal(tutorialEntries.length, 3);
  });

  [
    { iconName: 'annotate', commandName: 'Annotate' },
    { iconName: 'highlight', commandName: 'Highlight' },
    { iconName: 'reply', commandName: 'Reply' },
  ].forEach(testCase => {
    it(`renders expected ${testCase.commandName} TutorialInstruction`, () => {
      const wrapper = createComponent();
      const instruction = wrapper.find('TutorialInstruction').filter({
        iconName: testCase.iconName,
        commandName: testCase.commandName,
      });
      assert.isTrue(instruction.exists());
    });
  });
});

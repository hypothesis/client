import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import Tutorial, { $imports } from '../Tutorial';

describe('Tutorial', () => {
  let fakeIsThirdPartyService;

  function createComponent(props) {
    return mount(<Tutorial settings={{}} {...props} />);
  }

  beforeEach(() => {
    fakeIsThirdPartyService = sinon.stub().returns(false);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../helpers/is-third-party-service': {
        isThirdPartyService: fakeIsThirdPartyService,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
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
    { iconName: 'AnnotateIcon', commandName: 'Annotate' },
    { iconName: 'HighlightIcon', commandName: 'Highlight' },
    { iconName: 'ReplyIcon', commandName: 'Reply' },
  ].forEach(testCase => {
    it(`renders expected ${testCase.commandName} Tutorial instruction`, () => {
      const wrapper = createComponent();
      const instruction = wrapper
        .find('[data-testid="instruction"]')
        .filterWhere(n => n.find(testCase.iconName).exists());

      assert.isTrue(instruction.exists());
      assert.equal(
        instruction.find('[data-testid="command-name"]').text(),
        testCase.commandName,
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});

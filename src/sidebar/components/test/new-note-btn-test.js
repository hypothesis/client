import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import NewNoteButton from '../new-note-btn';
import { $imports } from '../new-note-btn';
import uiConstants from '../../ui-constants';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('NewNoteButton', function () {
  let fakeStore;
  let fakeAnnotationsService;
  let fakeSettings;

  function createComponent() {
    return mount(
      <NewNoteButton
        annotationsService={fakeAnnotationsService}
        settings={fakeSettings}
      />
    );
  }

  beforeEach(function () {
    fakeAnnotationsService = {
      create: sinon.stub(),
    };
    fakeSettings = {
      branding: {
        ctaBackgroundColor: '#00f',
      },
    };
    fakeStore = {
      createAnnotation: sinon.stub(),
      mainFrame: sinon.stub(),
      isLoggedIn: sinon.stub(),
      openSidebarPanel: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it("sets a backgroundColor equal to the setting's ctaBackgroundColor color", () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper.find('Button').prop('style').backgroundColor,
      fakeSettings.branding.ctaBackgroundColor
    );
  });

  it('should display login prompt on click if user is not logged in', () => {
    fakeStore.isLoggedIn.returns(false);
    const wrapper = createComponent();

    act(() => {
      wrapper.find('Button').props().onClick();
    });

    assert.calledWith(
      fakeStore.openSidebarPanel,
      uiConstants.PANEL_LOGIN_PROMPT
    );
  });

  it('should not add a new annotation if mainFrame() is null', () => {
    fakeStore.mainFrame.returns(null);
    fakeStore.isLoggedIn.returns(true);
    const wrapper = createComponent();

    act(() => {
      wrapper.find('Button').props().onClick();
    });
    assert.notCalled(fakeAnnotationsService.create);
  });

  it('should add a new annotation to the store if user is logged in', () => {
    fakeStore.isLoggedIn.returns(true);
    fakeStore.mainFrame.returns({ uri: 'thisFrame' });
    const wrapper = createComponent();

    act(() => {
      wrapper.find('Button').props().onClick();
    });

    assert.calledWith(fakeAnnotationsService.create, {
      target: [],
      uri: 'thisFrame',
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});

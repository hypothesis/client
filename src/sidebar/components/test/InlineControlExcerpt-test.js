import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import InlineControlExcerpt, { $imports } from '../InlineControlExcerpt';

describe('InlineControlExcerpt', () => {
  let fakeApplyTheme;

  beforeEach(() => {
    fakeApplyTheme = sinon.stub().returns({});

    $imports.$mock({
      '../helpers/theme': {
        applyTheme: fakeApplyTheme,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('applies theme to wrapped Excerpt', () => {
    const wrapper = mount(<InlineControlExcerpt settings={{}} />);
    const excerpt = wrapper.find('Excerpt');

    assert.isTrue(excerpt.prop('inlineControls'));
    assert.isDefined(excerpt.prop('inlineControlsLinkStyle'));
    assert.calledWith(fakeApplyTheme, ['selectionFontFamily'], {});
  });
});

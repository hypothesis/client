import { mount } from 'enzyme';
import { createElement } from 'preact';
import * as fixtures from '../../test/annotation-fixtures';
import { act } from 'preact/test-utils';

import AnnotationTimestamps from '../annotation-timestamps';
import { $imports } from '../annotation-timestamps';

import { checkAccessibility } from '../../../test-util/accessibility';

describe('AnnotationTimestamps', () => {
  let clock;
  let fakeFormatDate;
  let fakeTime;
  let fakeToFuzzyString;

  const createComponent = props =>
    mount(
      <AnnotationTimestamps
        annotation={fixtures.defaultAnnotation()}
        withEditedTimestamp={false}
        {...props}
      />
    );

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    fakeToFuzzyString = sinon.stub().returns('fuzzy string');
    fakeFormatDate = sinon.stub().returns('absolute date');

    fakeTime = {
      toFuzzyString: fakeToFuzzyString,
      decayingInterval: sinon.stub(),
    };

    $imports.$mock({
      '../util/date': { format: fakeFormatDate },
      '../util/time': fakeTime,
    });
  });

  afterEach(() => {
    clock.restore();
    $imports.$restore();
  });

  it('renders a linked created timestamp if annotation has a link', () => {
    const annotation = fixtures.defaultAnnotation();
    annotation.links = { html: 'http://www.example.com' };

    const wrapper = createComponent({ annotation });

    const link = wrapper.find('a.annotation-timestamps__created');
    assert.equal(link.prop('href'), 'http://www.example.com');
    assert.equal(link.prop('title'), 'absolute date');
    assert.equal(link.text(), 'fuzzy string');
  });

  it('renders an unlinked created timestamp if annotation does not have a link', () => {
    const wrapper = createComponent();

    const link = wrapper.find('a.annotation-timestamps__created');
    const span = wrapper.find('span.annotation-timestamps__created');
    assert.isFalse(link.exists());
    assert.isTrue(span.exists());
    assert.equal(span.text(), 'fuzzy string');
  });

  it('renders edited timestamp if `withEditedTimestamp` is true', () => {
    fakeToFuzzyString.onCall(1).returns('another fuzzy string');

    const wrapper = createComponent({ withEditedTimestamp: true });

    const editedTimestamp = wrapper.find('.annotation-timestamps__edited');
    assert.isTrue(editedTimestamp.exists());
    assert.include(editedTimestamp.text(), '(edited another fuzzy string)');
  });

  it('does not render edited relative date if equivalent to created relative date', () => {
    fakeToFuzzyString.returns('equivalent fuzzy strings');

    const wrapper = createComponent({ withEditedTimestamp: true });

    const editedTimestamp = wrapper.find('.annotation-timestamps__edited');
    assert.isTrue(editedTimestamp.exists());
    assert.include(editedTimestamp.text(), '(edited)');
  });

  it('is updated after time passes', () => {
    fakeTime.decayingInterval.callsFake((date, callback) =>
      setTimeout(callback, 10)
    );
    const wrapper = createComponent();
    fakeTime.toFuzzyString.returns('60 jiffies');

    act(() => {
      clock.tick(1000);
    });
    wrapper.update();

    assert.equal(wrapper.text(), '60 jiffies');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        // Fake timers break axe-core.
        clock.restore();

        return createComponent();
      },
    })
  );
});

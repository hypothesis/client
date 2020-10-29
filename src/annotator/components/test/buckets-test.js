import { mount } from 'enzyme';
import { createElement } from 'preact';

import { checkAccessibility } from '../../../test-util/accessibility';

import Buckets from '../buckets';
import { $imports } from '../buckets';

describe('Buckets', () => {
  let fakeBucketsUtil;
  let fakeHighlighter;
  let fakeScrollIntoView;

  let fakeAbove;
  let fakeBelow;
  let fakeBuckets;

  const createComponent = props =>
    mount(
      <Buckets
        above={fakeAbove}
        below={fakeBelow}
        buckets={fakeBuckets}
        onSelectAnnotations={() => null}
        {...props}
      />
    );

  beforeEach(() => {
    fakeAbove = { anchors: ['hi', 'there'], position: 150 };
    fakeBelow = { anchors: ['ho', 'there'], position: 550 };
    fakeBuckets = [
      {
        anchors: [
          { annotation: { $tag: 't1' }, highlights: ['hi'] },
          { annotation: { $tag: 't2' }, highlights: ['yay'] },
        ],
        position: 250,
      },
      { anchors: ['you', 'also', 'are', 'welcome'], position: 350 },
    ];
    fakeBucketsUtil = {
      findClosestOffscreenAnchor: sinon.stub().returns({}),
    };
    fakeHighlighter = {
      setHighlightsFocused: sinon.stub(),
    };
    fakeScrollIntoView = sinon.stub();

    $imports.$mock({
      'scroll-into-view': fakeScrollIntoView,
      '../highlighter': fakeHighlighter,
      '../util/buckets': fakeBucketsUtil,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('up and down navigation', () => {
    it('renders an up navigation button if there are above-screen anchors', () => {
      const wrapper = createComponent();
      const upButton = wrapper.find('.bucket-button--up');
      // The list item element wrapping the button
      const bucketItem = wrapper.find('.bucket').first();

      assert.isTrue(upButton.exists());
      assert.equal(
        bucketItem.getDOMNode().style.top,
        `${fakeAbove.position}px`
      );
    });

    it('does not render an up navigation button if there are no above-screen anchors', () => {
      fakeAbove = { anchors: [], position: 150 };
      const wrapper = createComponent();
      assert.isFalse(wrapper.find('.bucket-button--up').exists());
    });

    it('renders a down navigation button if there are below-screen anchors', () => {
      const wrapper = createComponent();

      const downButton = wrapper.find('.bucket-button--down');
      // The list item element wrapping the button
      const bucketItem = wrapper.find('.bucket').last();

      assert.isTrue(downButton.exists());
      assert.equal(
        bucketItem.getDOMNode().style.top,
        `${fakeBelow.position}px`
      );
    });

    it('does not render a down navigation button if there are no below-screen anchors', () => {
      fakeBelow = { anchors: [], position: 550 };
      const wrapper = createComponent();
      assert.isFalse(wrapper.find('.bucket-button--down').exists());
    });

    it('scrolls to anchors above when up navigation button is pressed', () => {
      const fakeAnchor = { highlights: ['hi'] };
      fakeBucketsUtil.findClosestOffscreenAnchor.returns(fakeAnchor);
      const wrapper = createComponent();
      const upButton = wrapper.find('.bucket-button--up');

      upButton.simulate('click');

      assert.calledWith(
        fakeBucketsUtil.findClosestOffscreenAnchor,
        fakeAbove.anchors,
        'up'
      );
      assert.calledWith(fakeScrollIntoView, fakeAnchor.highlights[0]);
    });

    it('scrolls to anchors below when down navigation button is pressed', () => {
      const fakeAnchor = { highlights: ['hi'] };
      fakeBucketsUtil.findClosestOffscreenAnchor.returns(fakeAnchor);
      const wrapper = createComponent();
      const downButton = wrapper.find('.bucket-button--down');

      downButton.simulate('click');

      assert.calledWith(
        fakeBucketsUtil.findClosestOffscreenAnchor,
        fakeBelow.anchors,
        'down'
      );
      assert.calledWith(fakeScrollIntoView, fakeAnchor.highlights[0]);
    });
  });

  describe('on-screen buckets', () => {
    it('renders a bucket button for each bucket', () => {
      const wrapper = createComponent();

      assert.equal(wrapper.find('.bucket-button--left').length, 2);
    });

    it('focuses associated anchors when mouse enters the element', () => {
      const wrapper = createComponent();

      wrapper.find('.bucket-button--left').first().simulate('mousemove');

      assert.calledTwice(fakeHighlighter.setHighlightsFocused);
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        fakeBuckets[0].anchors[0].highlights,
        true
      );
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        fakeBuckets[0].anchors[1].highlights,
        true
      );
    });

    it('removes focus on associated anchors when element is blurred', () => {
      const wrapper = createComponent();

      wrapper.find('.bucket-button--left').first().simulate('blur');

      assert.calledTwice(fakeHighlighter.setHighlightsFocused);
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        fakeBuckets[0].anchors[0].highlights,
        false
      );
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        fakeBuckets[0].anchors[1].highlights,
        false
      );
    });

    it('removes focus on associated anchors when mouse leaves the element', () => {
      const wrapper = createComponent();

      wrapper.find('.bucket-button--left').first().simulate('mouseout');

      assert.calledTwice(fakeHighlighter.setHighlightsFocused);
      assert.calledWith(
        fakeHighlighter.setHighlightsFocused,
        fakeBuckets[0].anchors[0].highlights,
        false
      );
    });

    it('selects associated annotations when bucket button pressed', () => {
      const fakeOnSelectAnnotations = sinon.stub();
      const wrapper = createComponent({
        onSelectAnnotations: fakeOnSelectAnnotations,
      });

      wrapper
        .find('.bucket-button--left')
        .first()
        .simulate('click', { metaKey: false, ctrlKey: false });

      assert.calledOnce(fakeOnSelectAnnotations);
      const call = fakeOnSelectAnnotations.getCall(0);
      assert.deepEqual(call.args[0], [
        fakeBuckets[0].anchors[0].annotation,
        fakeBuckets[0].anchors[1].annotation,
      ]);
      assert.equal(call.args[1], false);
    });

    it('toggles annotation selection if metakey pressed', () => {
      const fakeOnSelectAnnotations = sinon.stub();
      const wrapper = createComponent({
        onSelectAnnotations: fakeOnSelectAnnotations,
      });

      wrapper
        .find('.bucket-button--left')
        .first()
        .simulate('click', { metaKey: true, ctrlKey: false });

      const call = fakeOnSelectAnnotations.getCall(0);

      assert.equal(call.args[1], true);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createComponent(),
      },
    ])
  );
});

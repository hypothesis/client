'use strict';

const { createElement } = require('preact');
const { act } = require('preact/test-utils');
const { mount } = require('enzyme');

const Timestamp = require('../timestamp');

describe('Timestamp', () => {
  let clock;
  let fakeTime;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    fakeTime = {
      toFuzzyString: sinon.stub().returns('a while ago'),
      decayingInterval: sinon.stub(),
    };

    Timestamp.$imports.$mock({
      '../util/time': fakeTime,
    });
  });

  afterEach(() => {
    clock.restore();
    Timestamp.$imports.$restore();
  });

  const createTimestamp = props => mount(<Timestamp {...props} />);

  it('displays a link if an "href" is provided', () => {
    const wrapper = createTimestamp({
      timestamp: '2016-06-10',
      href: 'https://example.com',
    });
    const link = wrapper.find('a');
    assert.equal(link.length, 1);
    assert.equal(link.prop('href'), 'https://example.com');
  });

  it('displays static text if no "href" is provided', () => {
    const wrapper = createTimestamp({ timestamp: '2016-06-10' });
    assert.equal(wrapper.find('a').length, 0);
    assert.equal(wrapper.find('span').length, 1);
  });

  describe('timestamp label', () => {
    it('displays a relative time string', () => {
      const wrapper = createTimestamp({
        timestamp: '2016-06-10T10:04:04.939Z',
      });
      assert.equal(wrapper.text(), 'a while ago');
    });

    it('is updated when the timestamp changes', () => {
      const wrapper = createTimestamp({
        timestamp: '1776-07-04T10:04:04.939Z',
      });

      fakeTime.toFuzzyString.returns('four score and seven years ago');
      wrapper.setProps({ timestamp: '1863-11-19T12:00:00.939Z' });

      assert.equal(wrapper.text(), 'four score and seven years ago');
    });

    it('is updated after time passes', () => {
      fakeTime.decayingInterval.callsFake((date, callback) =>
        setTimeout(callback, 10)
      );
      const wrapper = createTimestamp({
        timestamp: '2016-06-10T10:04:04.939Z',
      });
      fakeTime.toFuzzyString.returns('60 jiffies');

      act(() => {
        clock.tick(1000);
      });
      wrapper.update();

      assert.equal(wrapper.text(), '60 jiffies');
    });

    it('is no longer updated after the component is destroyed', () => {
      const wrapper = createTimestamp({
        timestamp: '2016-06-10T10:04:04.939Z',
      });

      wrapper.unmount();

      assert.called(fakeTime.decayingInterval);
    });
  });

  describe('timestamp tooltip', () => {
    [
      {
        variant: 'without link',
        href: null,
      },
      {
        variant: 'with link',
        href: 'https://annotate.com/a/1234',
      },
    ].forEach(({ variant, href }) => {
      it(`displays an absolute timestamp (${variant})`, () => {
        const date = new Date('2016-06-10T10:04:04.939Z');
        const format = date => `formatted:${date}`;
        Timestamp.$imports.$mock({
          '../util/date': {
            format,
          },
        });

        const wrapper = createTimestamp({
          timestamp: date.toISOString(),
          href,
        });

        assert.match(
          wrapper
            .findWhere(n => n.type() === 'a' || n.type() === 'span')
            .prop('title'),
          format(date)
        );
      });
    });
  });
});

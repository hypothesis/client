import { isMessage, isMessageEqual, isSourceWindow } from '../port-util';

describe('port-util', () => {
  describe('isMessage', () => {
    [
      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
        requestId: 'abcdef',
      },

      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
        requestId: 'bar',
        extraField: 'foo',
      },
    ].forEach(data => {
      it('returns true for objects with the expected fields', () => {
        assert.isTrue(isMessage(data));
      });
    });

    [
      null,
      undefined,
      {},
      'str',

      // Wrong type for a property
      { frame1: 'guest', frame2: false, type: 'request', requestId: 'bar' },

      // Missing properties
      { frame2: 'sidebar', type: 'request', requestId: 'r1' }, // Missing 'frame1'
      { frame1: 'guest', type: 'request', requestId: 'r1' }, // Missing 'frame2'
      { frame1: 'guest', frame2: 'sidebar', requestId: 'r1' }, // Missing 'type'
      { frame1: 'guest', frame2: 'sidebar', type: 'request' }, // Missing 'requestId'
    ].forEach(data => {
      it('returns false if data is not a valid message', () => {
        assert.isFalse(isMessage(data));
      });
    });
  });

  describe('isMessageEqual', () => {
    const frame1 = 'guest';
    const frame2 = 'sidebar';
    const type = 'offer';
    const requestId = 'abcdef';

    [
      {
        data: {
          frame1,
          frame2,
          type,
          requestId,
        },
        expectedResult: true,
        reason: 'data matches the message',
      },
      {
        data: {
          frame1,
          frame2,
          type,
          requestId,
        },
        expectedResult: true,
        reason: 'data matches the message (properties in different order)',
      },
      {
        data: null,
        expectedResult: false,
        reason: 'data is null',
      },
      {
        data: 'dummy',
        expectedResult: false,
        reason: 'data is string',
      },
      {
        data: {
          // frame1 property missing
          frame2,
          type,
          requestId,
        },
        expectedResult: false,
        reason: 'data has one property that is missing',
      },
      {
        data: {
          frame1,
          frame2: 9, // wrong type
          type,
          requestId,
        },
        expectedResult: false,
        reason: 'data has one property with a wrong type',
      },
      {
        data: {
          frame1: 'dummy', // different
          frame2,
          type,
          requestId,
        },
        expectedResult: false,
        reason: 'data has one property that is different',
      },
    ].forEach(({ data, expectedResult, reason }) => {
      it(`returns '${expectedResult}' because the ${reason}`, () => {
        const result = isMessageEqual(data, {
          frame1,
          frame2,
          type,
        });
        assert.equal(result, expectedResult);
      });
    });
  });

  describe('isSourceWindow', () => {
    [
      {
        expectedResult: true,
        reason: 'Window',
        source: window,
      },
      {
        expectedResult: false,
        reason: 'null',
        source: null,
      },
      {
        expectedResult: false,
        reason: 'MessagePort',
        source: new MessageChannel().port1,
      },
      {
        expectedResult: false,
        reason: 'ServiceWorker',
        source: Object.create(ServiceWorker.prototype),
      },
    ].forEach(({ expectedResult, reason, source }) =>
      it(`returns '${expectedResult}' because the source is ${reason}`, () => {
        assert.equal(expectedResult, isSourceWindow(source));
      })
    );
  });
});

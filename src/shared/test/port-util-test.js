import { isMessage, isMessageEqual, isSourceWindow } from '../port-util';

describe('port-util', () => {
  describe('isMessage', () => {
    [
      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
      },

      {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
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
      { frame1: 'guest', frame2: false, type: 'request' },
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

    [
      {
        data: {
          frame1,
          frame2,
          type,
        },
        expectedResult: true,
        reason: 'data matches the message',
      },
      {
        data: {
          frame1,
          frame2,
          type,
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
        },
        expectedResult: false,
        reason: 'data has one property that is missing',
      },
      {
        data: {
          frame1,
          frame2: 9, // wrong type
          type,
        },
        expectedResult: false,
        reason: 'data has one property with a wrong type',
      },
      {
        data: {
          frame1: 'dummy', // different
          frame2,
          type,
        },
        expectedResult: false,
        reason: 'data has one property that is different',
      },
      {
        data: {
          frame1: new Date(), // not JSON-serializable
          frame2,
          type,
        },
        expectedResult: false,
        reason: "data has one property that can't be serialized",
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

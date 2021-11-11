import { isMessageEqual } from '../port-util';

const source = 'hypothesis';

describe('port-util', () => {
  describe('isMessageEqual', () => {
    [
      {
        data: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: true,
        reason: 'data matches the message',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        message: {
          source,
          type: 'offer',
          channel: 'host-sidebar',
          port: 'guest',
        },
        expectedResult: true,
        reason: 'data matches the message (properties in different order)',
      },
      {
        data: null,
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: 'data is null',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 9, // wrong type
          source,
          type: 'offer',
        },
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: 'data has a property with the wrong type',
      },
      {
        data: {
          // channel property missing
          port: 'guest',
          source,
          type: 'offer',
        },
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: 'data has one property that is missing',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
          extra: 'dummy', // additional
        },
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: 'data has one additional property',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
          window, // not serializable
        },
        message: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: "data has one property that can't be serialized",
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'guest',
          source,
          type: 'offer',
        },
        message: {
          channel: 'guest-sidebar', // different
          port: 'guest',
          source,
          type: 'offer',
        },
        expectedResult: false,
        reason: 'data has one property that is different',
      },
    ].forEach(({ data, message, expectedResult, reason }) => {
      it(`returns '${expectedResult}' because the ${reason}`, () => {
        const result = isMessageEqual(data, message);
        assert.equal(result, expectedResult);
      });
    });
  });
});

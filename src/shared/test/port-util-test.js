import { isMessageEqual } from '../port-util';

describe('port-util', () => {
  describe('isMessageEqual', () => {
    const authority = 'hypothesis';
    const frame1 = 'guest';
    const frame2 = 'sidebar';
    const type = 'offer';

    [
      {
        data: {
          authority,
          frame1,
          frame2,
          type,
        },
        expectedResult: true,
        reason: 'data matches the message',
      },
      {
        data: {
          authority,
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
        data: {
          authority,
          // frame1 property missing
          frame2,
          type,
        },
        expectedResult: false,
        reason: 'data has one property that is missing',
      },
      {
        data: {
          authority,
          frame1,
          frame2: 9, // wrong type
          type,
        },
        expectedResult: false,
        reason: 'data has one property with a wrong type',
      },
      {
        data: {
          authority,
          extra: 'dummy', // additional
          frame1,
          frame2,
          type,
        },
        expectedResult: false,
        reason: 'data has one additional property',
      },
      {
        data: {
          authority,
          frame1: 'dummy', // different
          frame2,
          type,
        },
        expectedResult: false,
        reason: 'data has one property that is different',
      },
      {
        data: {
          authority,
          frame1,
          frame2,
          type,
          window, // not serializable
        },
        expectedResult: false,
        reason: "data has one property that can't be serialized",
      },
    ].forEach(({ data, expectedResult, reason }) => {
      it(`returns '${expectedResult}' because the ${reason}`, () => {
        const result = isMessageEqual(data, {
          authority,
          frame1,
          frame2,
          type,
        });
        assert.equal(result, expectedResult);
      });
    });
  });
});

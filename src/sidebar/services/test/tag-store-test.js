import tagStoreFactory from '../local-tags';

const TAGS_LIST_KEY = 'hypothesis.user.tags.list';
const TAGS_MAP_KEY = 'hypothesis.user.tags.map';

class FakeStorage {
  constructor() {
    this._storage = {};
  }

  getObject(key) {
    return this._storage[key];
  }

  setObject(key, value) {
    this._storage[key] = value;
  }
}

describe('sidebar/services/tag-store', () => {
  let fakeLocalStorage;
  let tags;

  beforeEach(() => {
    fakeLocalStorage = new FakeStorage();

    const stamp = Date.now();
    const savedTagsMap = {
      foo: {
        text: 'foo',
        count: 1,
        updated: stamp,
      },
      bar: {
        text: 'bar',
        count: 5,
        updated: stamp,
      },
      'bar argon': {
        text: 'bar argon',
        count: 2,
        updated: stamp,
      },
      banana: {
        text: 'banana',
        count: 2,
        updated: stamp,
      },
      future: {
        text: 'future',
        count: 2,
        updated: stamp,
      },
      argon: {
        text: 'argon',
        count: 1,
        updated: stamp,
      },
    };
    const savedTagsList = Object.keys(savedTagsMap);

    fakeLocalStorage.setObject(TAGS_MAP_KEY, savedTagsMap);
    fakeLocalStorage.setObject(TAGS_LIST_KEY, savedTagsList);

    tags = tagStoreFactory(fakeLocalStorage);
  });

  describe('#store', () => {
    it('saves new tags to storage', () => {
      tags.store([{ text: 'new' }]);

      const storedTagsList = fakeLocalStorage.getObject(TAGS_LIST_KEY);
      assert.include(storedTagsList, 'new');

      const storedTagsMap = fakeLocalStorage.getObject(TAGS_MAP_KEY);
      assert.match(
        storedTagsMap.new,
        sinon.match({
          count: 1,
          text: 'new',
          updated: sinon.match.number,
        })
      );
    });

    it('increases the count for a tag already stored', () => {
      tags.store([{ text: 'bar' }]);
      const storedTagsMap = fakeLocalStorage.getObject(TAGS_MAP_KEY);
      assert.equal(storedTagsMap.bar.count, 6);
    });

    it('orders list by count descending, lexical ascending', () => {
      for (let i = 0; i < 6; i++) {
        tags.store([{ text: 'foo' }]);
      }

      const storedTagsList = fakeLocalStorage.getObject(TAGS_LIST_KEY);
      assert.deepEqual(storedTagsList, [
        'foo',
        'bar',
        'banana',
        'bar argon',
        'future',
        'argon',
      ]);
    });
  });
});

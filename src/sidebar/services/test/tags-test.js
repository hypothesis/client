import tagsFactory from '../tags';
import { Injector } from '../../../shared/injector';

let fakeTagProvider;
let fakeTagStore;
let sandbox;

describe('sidebar/services/tags', () => {
  let tags;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    fakeTagProvider = {
      filter: sinon.stub()
    };

    fakeTagStore = {
      store: sinon.stub()
    };

    tags = new Injector()
      .register('tagProvider', { value: fakeTagProvider })
      .register('tagStore', { value: fakeTagStore })
      .register( 'tags', tagsFactory)
      .get('tags');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('#filter', () => {
    it('delegates query call to tag-provider', () => {
      let query = 'pourquoi';
      tags.filter(query);
      return assert.calledWith(fakeTagProvider.filter, query);
    });
  });

  describe('#store', () => {
    it('delegates store call to tag-store', () => {
      let theTags = [{ text: 'parce que' }];
      tags.store(theTags);
      return assert.calledWith(fakeTagStore.store, theTags);
    });
  });
});

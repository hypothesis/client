'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const events = require('../../events');
const TagEditor2 = require('../new-note-btn');
const mockImportedComponents = require('./mock-imported-components');

describe('TagEditor2', function() {

  let fakeTagsService;
  let fakeServiceUrl;
  let fakeOnEditTags;
  
  function createComponent() {
    return mount(
      <TagEditor2
        // props
        id={'annotation_id'}
        editMode={false}
        isThirdParty={false}
        onEditTags={fakeOnEditTags}
        tagList={['tag1', 'tag2']}
        // service props
        serviceUrl={fakeServiceUrl}
        tags={fakeTagsService}
        
      />
    );
  }

  beforeEach(function() {
    fakeOnEditTags = sinon.stub();
    fakeServiceUrl = sinon.stub();
    fakeTagsService = {
      filter: sinon.stub(),
      store: sinon.stub(),
    };
    

    TagEditor2.$imports.$mock(mockImportedComponents());
    /*TagEditor2.$imports.$mock({
      //'../store/use-store': callback => callback(fakeStore),
      './SvgIcon': sinon.stub()
    });*/
  });

  afterEach(() => {
    TagEditor2.$imports.$restore();
  });

  describe('when editMode is false', function() {
    it('creates the read only component', () => {
      const wrapper = createComponent();
      //console.log(wrapper.debug());
      //assert.include(wrapper.text(), 'New note');
    });
  });
});

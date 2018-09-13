'use strict';

const flash = require('../flash');

describe('sidebar.flash', () => {
  ['info', 'success', 'warning', 'error'].forEach(method => {
    describe(`#${method}`, () => {
      it(`calls toastr's "${method}" method`, () => {
        const fakeToastr = {
          info: sinon.stub(),
          success: sinon.stub(),
          warning: sinon.stub(),
          error: sinon.stub(),
        };

        const svc = flash(fakeToastr);
        svc[method]('message', 'title');

        assert.calledWith(fakeToastr[method], 'message', 'title');
      });
    });
  });
});

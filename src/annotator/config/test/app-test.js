import { createAppConfig } from '../app';

describe('createAppConfig', () => {
  it('copies config values', () => {
    const config = {
      showHighlights: true,
      appType: 'via',
    };

    const sidebarConfig = createAppConfig(config);

    assert.deepEqual(sidebarConfig, {
      showHighlights: true,
      appType: 'via',
    });
  });

  it('does not copy "notebookAppUrl" or "sidebarAppUrl" properties', () => {
    const config = {
      showHighlights: true,
      notebookAppUrl: 'https://hypothes.is/notebook.html',
      sidebarAppUrl: 'https://hypothes.is/app.html',
    };
    const sidebarConfig = createAppConfig(config);
    assert.deepEqual(sidebarConfig, {
      showHighlights: true,
    });
  });

  it('does not copy nullish values', () => {
    const config = {
      nullValue: null,
      undefinedValue: undefined,
      notNullValue: 'test',
    };

    const appConfig = createAppConfig(config);

    assert.deepEqual(appConfig, { notNullValue: 'test' });
  });

  it('sets boolean properties to indicate presence of callbacks', () => {
    const callbacks = [
      'onLoginRequest',
      'onLogoutRequest',
      'onSignupRequest',
      'onProfileRequest',
      'onHelpRequest',
    ];
    const service = {};
    for (let callback of callbacks) {
      service[callback] = sinon.stub();
    }

    const config = {
      services: [service],
    };
    const sidebarConfig = createAppConfig(config);
    const sidebarServiceConfig = sidebarConfig.services[0];

    for (let callback of callbacks) {
      assert.equal(sidebarServiceConfig[callback + 'Provided'], true);
    }
  });
});

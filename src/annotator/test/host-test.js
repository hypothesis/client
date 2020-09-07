import Host from '../host';

describe('Host', () => {
  const sandbox = sinon.createSandbox();
  const hostConfig = { pluginClasses: {} };

  let CrossFrame;
  let fakeCrossFrame;

  const createHost = (config = {}, element = null) => {
    config = Object.assign(
      { sidebarAppUrl: '/base/annotator/test/empty.html' },
      hostConfig,
      config
    );
    if (!element) {
      element = document.createElement('div');
    }
    return new Host(element, config);
  };

  beforeEach(() => {
    // Disable any Host logging.
    sandbox.stub(console, 'log');

    fakeCrossFrame = {};
    fakeCrossFrame.onConnect = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame);
    fakeCrossFrame.call = sandbox.spy();

    CrossFrame = sandbox.stub();
    CrossFrame.returns(fakeCrossFrame);
    hostConfig.pluginClasses.CrossFrame = CrossFrame;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('widget visibility', () => {
    it('starts hidden', () => {
      const host = createHost();
      assert.equal(host.frame.style.display, 'none');
    });

    it('becomes visible when the "panelReady" event fires', () => {
      const host = createHost();
      host.publish('panelReady');
      assert.equal(host.frame.style.display, '');
    });
  });

  describe('focus', () => {
    let element;
    let frame;
    let host;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
      host = createHost({}, element);
      frame = element.querySelector('[name=hyp_sidebar_frame]');
      sinon.spy(frame.contentWindow, 'focus');
    });

    afterEach(() => {
      frame.contentWindow.focus.restore();
      element.parentNode.removeChild(element);
    });

    it('focuses the sidebar when a new annotation is created', () => {
      host.publish('beforeAnnotationCreated', [
        {
          $highlight: false,
        },
      ]);
      assert.called(frame.contentWindow.focus);
    });

    it('does not focus the sidebar when a new highlight is created', () => {
      host.publish('beforeAnnotationCreated', [
        {
          $highlight: true,
        },
      ]);
      assert.notCalled(frame.contentWindow.focus);
    });
  });

  describe('config', () => {
    it('disables highlighting if showHighlights: false is given', done => {
      const host = createHost({ showHighlights: false });
      host.on('panelReady', () => {
        assert.isFalse(host.visibleHighlights);
        done();
      });
      host.publish('panelReady');
    });

    function getConfigString(host) {
      return host.frame.children[0].src;
    }

    function configFragment(config) {
      return '#config=' + encodeURIComponent(JSON.stringify(config));
    }

    it('passes config to the sidebar iframe', () => {
      const appURL = new URL(
        '/base/annotator/test/empty.html',
        window.location.href
      );
      const host = createHost({ annotations: '1234' });
      assert.equal(
        getConfigString(host),
        appURL + configFragment({ annotations: '1234' })
      );
    });

    it('adds drop shadow if the clean theme is enabled', () => {
      const host = createHost({ theme: 'clean' });
      assert.isTrue(
        host.frame.classList.contains('annotator-frame--drop-shadow-enabled')
      );
    });
  });
});

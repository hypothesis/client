$ = require('jquery')

{ default: events } = require('../../shared/bridge-events')

{ default: Sidebar } = require('../sidebar')
{ $imports } = require('../sidebar')

DEFAULT_WIDTH = 350
DEFAULT_HEIGHT = 600
EXTERNAL_CONTAINER_SELECTOR = 'test-external-container'

describe 'Sidebar', ->
  sandbox = sinon.createSandbox()
  CrossFrame = null
  fakeCrossFrame = null
  sidebarConfig = {pluginClasses: {}}

  FakeToolbarController = null
  fakeToolbar = null

  before ->
    sinon.stub(window, 'requestAnimationFrame').yields()

  after ->
    window.requestAnimationFrame.restore();

  createSidebar = (config={}) ->
    config = Object.assign({}, sidebarConfig, config)
    element = document.createElement('div')
    return new Sidebar(element, config)

  createExternalContainer = ->
    externalFrame = $('<div class="' + EXTERNAL_CONTAINER_SELECTOR + '"></div>')
    externalFrame.width(DEFAULT_WIDTH).height(DEFAULT_HEIGHT)
    return externalFrame[0]

  beforeEach ->
    sandbox.stub(Sidebar.prototype, '_setupGestures')

    fakeCrossFrame = {}
    fakeCrossFrame.onConnect = sandbox.stub().returns(fakeCrossFrame)
    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame)
    fakeCrossFrame.call = sandbox.spy()
    fakeCrossFrame.destroy = sandbox.stub()

    fakeToolbar = {
      getWidth: sinon.stub().returns(100)
      useMinimalControls: false,
      sidebarOpen: false,
      newAnnotationType: 'note',
      highlightsVisible: false,
      sidebarToggleButton: document.createElement('button')
    }
    FakeToolbarController = sinon.stub().returns(fakeToolbar)

    fakeBucketBar = {}
    fakeBucketBar.element = $('<div></div>')
    fakeBucketBar.destroy = sandbox.stub()

    CrossFrame = sandbox.stub()
    CrossFrame.returns(fakeCrossFrame)

    BucketBar = sandbox.stub()
    BucketBar.returns(fakeBucketBar)

    sidebarConfig.pluginClasses['CrossFrame'] = CrossFrame
    sidebarConfig.pluginClasses['BucketBar'] = BucketBar

    $imports.$mock({
      './toolbar': {
        ToolbarController: FakeToolbarController
      }
    })

  afterEach ->
    sandbox.restore()
    $imports.$restore();

  describe 'toolbar buttons', ->
    it 'shows or hides sidebar when toolbar button is clicked', ->
      sidebar = createSidebar({})
      sinon.stub(sidebar, 'show')
      sinon.stub(sidebar, 'hide')

      FakeToolbarController.args[0][1].setSidebarOpen(true)
      assert.called(sidebar.show)

      FakeToolbarController.args[0][1].setSidebarOpen(false)
      assert.called(sidebar.hide)

    it 'shows or hides highlights when toolbar button is clicked', ->
      sidebar = createSidebar({})
      sinon.stub(sidebar, 'setAllVisibleHighlights')

      FakeToolbarController.args[0][1].setHighlightsVisible(true)
      assert.calledWith(sidebar.setAllVisibleHighlights, true)
      sidebar.setAllVisibleHighlights.resetHistory()

      FakeToolbarController.args[0][1].setHighlightsVisible(false)
      assert.calledWith(sidebar.setAllVisibleHighlights, false)

    it 'creates an annotation when toolbar button is clicked', ->
      sidebar = createSidebar({})
      sinon.stub(sidebar, 'createAnnotation')

      FakeToolbarController.args[0][1].createAnnotation()

      assert.called(sidebar.createAnnotation)

  describe 'crossframe listeners', ->
    emitEvent = (event, args...) ->
      fn(args...) for [evt, fn] in fakeCrossFrame.on.args when event == evt

    describe 'on "show" event', ->
      it 'shows the frame', ->
        target = sandbox.stub(Sidebar.prototype, 'show')
        sidebar = createSidebar()
        emitEvent('showSidebar')
        assert.called(target)

    describe 'on "hide" event', ->
      it 'hides the frame', ->
        target = sandbox.stub(Sidebar.prototype, 'hide')
        sidebar = createSidebar()
        emitEvent('hideSidebar')
        assert.called(target)

    describe 'on LOGIN_REQUESTED event', ->
      it 'calls the onLoginRequest callback function if one was provided', ->
        onLoginRequest = sandbox.stub()
        sidebar = createSidebar(config={services: [{onLoginRequest: onLoginRequest}]})

        emitEvent(events.LOGIN_REQUESTED)

        assert.called(onLoginRequest)

      it 'only calls the onLoginRequest callback of the first service', ->
        # Even though config.services is an array it only calls the onLoginRequest
        # callback function of the first service. The onLoginRequests of any other
        # services are ignored.
        firstOnLogin  = sandbox.stub()
        secondOnLogin = sandbox.stub()
        thirdOnLogin  = sandbox.stub()
        sidebar = createSidebar(
          config={
            services: [
              {onLoginRequest: firstOnLogin},
              {onLoginRequest: secondOnLogin},
              {onLoginRequest: thirdOnLogin},
            ]
          }
        )

        emitEvent(events.LOGIN_REQUESTED)

        assert.called(firstOnLogin)
        assert.notCalled(secondOnLogin)
        assert.notCalled(thirdOnLogin)

      it 'never calls the onLoginRequest callbacks of further services', ->
        # Even if the first service doesn't have an onLoginRequest, it still doesn't
        # call the onLoginRequests of further services.
        secondOnLogin = sandbox.stub()
        thirdOnLogin  = sandbox.stub()
        sidebar = createSidebar(
          config={
            services: [
              {},
              {onLoginRequest: secondOnLogin},
              {onLoginRequest: thirdOnLogin},
            ]
          }
        )

        emitEvent(events.LOGIN_REQUESTED)

        assert.notCalled(secondOnLogin)
        assert.notCalled(thirdOnLogin)

      it 'does not crash if there is no services', ->
        sidebar = createSidebar(config={})  # No config.services
        emitEvent(events.LOGIN_REQUESTED)

      it 'does not crash if services is an empty array', ->
        sidebar = createSidebar(config={services: []})
        emitEvent(events.LOGIN_REQUESTED)

      it 'does not crash if the first service has no onLoginRequest', ->
        sidebar = createSidebar(config={services: [{}]})
        emitEvent(events.LOGIN_REQUESTED)

    describe 'on LOGOUT_REQUESTED event', ->
      it 'calls the onLogoutRequest callback function', ->
        onLogoutRequest = sandbox.stub()
        sidebar = createSidebar(config={services: [{onLogoutRequest: onLogoutRequest}]})

        emitEvent(events.LOGOUT_REQUESTED)

        assert.called(onLogoutRequest)

    describe 'on SIGNUP_REQUESTED event', ->
      it 'calls the onSignupRequest callback function', ->
        onSignupRequest = sandbox.stub()
        sidebar = createSidebar(config={services: [{onSignupRequest: onSignupRequest}]})

        emitEvent(events.SIGNUP_REQUESTED)

        assert.called(onSignupRequest)

    describe 'on PROFILE_REQUESTED event', ->
      it 'calls the onProfileRequest callback function', ->
        onProfileRequest = sandbox.stub()
        sidebar = createSidebar(config={services: [{onProfileRequest: onProfileRequest}]})

        emitEvent(events.PROFILE_REQUESTED)

        assert.called(onProfileRequest)

    describe 'on HELP_REQUESTED event', ->
      it 'calls the onHelpRequest callback function', ->
        onHelpRequest = sandbox.stub()
        sidebar = createSidebar(config={services: [{onHelpRequest: onHelpRequest}]})

        emitEvent(events.HELP_REQUESTED)

        assert.called(onHelpRequest)

  describe 'pan gestures', ->
    sidebar = null

    beforeEach ->
      sidebar = createSidebar({})

    describe 'panstart event', ->
      it 'disables pointer events and transitions on the widget', ->
        sidebar._onPan({type: 'panstart'})

        assert.isTrue(sidebar.frame.hasClass('annotator-no-transition'))
        assert.equal(sidebar.frame.css('pointer-events'), 'none')

      it 'captures the left margin as the gesture initial state', ->
        sandbox.stub(window, 'getComputedStyle').returns({marginLeft: '100px'})
        sidebar._onPan({type: 'panstart'})
        assert.equal(sidebar._gestureState.initial, '100')

    describe 'panend event', ->
      it 'enables pointer events and transitions on the widget', ->
        sidebar._gestureState = {final: 0}
        sidebar._onPan({type: 'panend'})
        assert.isFalse(sidebar.frame.hasClass('annotator-no-transition'))
        assert.equal(sidebar.frame.css('pointer-events'), '')

      it 'calls `show` if the widget is fully visible', ->
        sidebar._gestureState = {final: -500}
        show = sandbox.stub(sidebar, 'show')
        sidebar._onPan({type: 'panend'})
        assert.calledOnce(show)

      it 'calls `hide` if the widget is not fully visible', ->
        sidebar._gestureState = {final: -100}
        hide = sandbox.stub(sidebar, 'hide')
        sidebar._onPan({type: 'panend'})
        assert.calledOnce(hide)

    describe 'panleft and panright events', ->
      it 'shrinks or grows the widget to match the delta', ->
        sidebar._gestureState = {initial: -100}

        sidebar._onPan({type: 'panleft', deltaX: -50})
        assert.equal(sidebar._gestureState.final, -150)

        sidebar._onPan({type: 'panright', deltaX: 100})
        assert.equal(sidebar._gestureState.final, 0)

  describe 'panelReady event', ->
    it 'opens the sidebar when a direct-linked annotation is present.', ->
      sidebar = createSidebar(
        config={
          annotations: 'ann-id',
        }
      )
      show = sandbox.stub(sidebar, 'show')
      sidebar.publish('panelReady')
      assert.calledOnce(show)

    it 'opens the sidebar when a direct-linked group is present.', ->
      sidebar = createSidebar(
        config={
          group: 'group-id',
        }
      )
      show = sandbox.stub(sidebar, 'show')
      sidebar.publish('panelReady')
      assert.calledOnce(show)

    it 'opens the sidebar when a direct-linked query is present.', ->
      sidebar = createSidebar(
        config={
          query: 'tag:foo',
        }
      )
      show = sandbox.stub(sidebar, 'show')
      sidebar.publish('panelReady')
      assert.calledOnce(show)

    it 'opens the sidebar when openSidebar is set to true.', ->
      sidebar = createSidebar(
        config={
          openSidebar: true,
        }
      )
      show = sandbox.stub(sidebar, 'show')
      sidebar.publish('panelReady')
      assert.calledOnce(show)

    it 'does not show the sidebar if not configured to.', ->
      sidebar = createSidebar(
        config={
        }
      )
      show = sandbox.stub(sidebar, 'show')
      sidebar.publish('panelReady')
      assert.notCalled(show)



  describe 'swipe gestures', ->
    sidebar = null

    beforeEach ->
      sidebar = createSidebar({})

    it 'opens the sidebar on swipeleft', ->
      show = sandbox.stub(sidebar, 'show')
      sidebar._onSwipe({type: 'swipeleft'})
      assert.calledOnce(show)

    it 'closes the sidebar on swiperight', ->
      hide = sandbox.stub(sidebar, 'hide')
      sidebar._onSwipe({type: 'swiperight'})
      assert.calledOnce(hide)

  describe 'destruction', ->
    sidebar = null

    beforeEach ->
      sidebar = createSidebar({})

    it 'the sidebar is destroyed and the frame is detached', ->
      sidebar.destroy()
      assert.called(fakeCrossFrame.destroy)
      assert.equal(sidebar.frame[0].parentElement, null)

  describe '#show', ->

    it 'shows highlights if "showHighlights" is set to "whenSidebarOpen"', ->
      sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' })
      assert.isFalse sidebar.visibleHighlights
      sidebar.show()
      assert.isTrue sidebar.visibleHighlights

    it 'does not show highlights otherwise', ->
      sidebar = createSidebar({ showHighlights: 'never' })
      assert.isFalse sidebar.visibleHighlights
      sidebar.show()
      assert.isFalse sidebar.visibleHighlights

    it 'updates the `sidebarOpen` property of the toolbar', ->
      sidebar = createSidebar()
      sidebar.show()
      assert.equal(fakeToolbar.sidebarOpen, true)


  describe '#hide', ->

    it 'hides highlights if "showHighlights" is set to "whenSidebarOpen"', ->
      sidebar = createSidebar({ showHighlights: 'whenSidebarOpen' })

      sidebar.show()
      sidebar.hide()

      assert.isFalse sidebar.visibleHighlights

    it 'updates the `sidebarOpen` property of the toolbar', ->
      sidebar = createSidebar()

      sidebar.show()
      sidebar.hide()

      assert.equal(fakeToolbar.sidebarOpen, false)

  describe '#setAllVisibleHighlights', ->

    it 'sets the state through crossframe and emits', ->
      sidebar = createSidebar({})
      sidebar.setAllVisibleHighlights(true)
      assert.calledWith(fakeCrossFrame.call, 'setVisibleHighlights', true)

  it 'hides toolbar controls when using the "clean" theme', ->
    sidebar = createSidebar(config={theme: 'clean'})
    assert.equal(fakeToolbar.useMinimalControls, true)

  it 'shows toolbar controls when using the default theme', ->
    createSidebar({})
    assert.equal(fakeToolbar.useMinimalControls, false)

  describe 'layout change notifier', ->

    layoutChangeHandlerSpy = null

    assertLayoutValues = (args, expectations) ->
      expected = Object.assign {
          width: DEFAULT_WIDTH + fakeToolbar.getWidth(),
          height: DEFAULT_HEIGHT,
          expanded: true
        }, expectations

      assert.deepEqual args, expected

    describe 'with the frame set up as default', ->
      sidebar = null
      frame = null
      beforeEach ->
        layoutChangeHandlerSpy = sandbox.stub()
        sidebar = createSidebar { onLayoutChange: layoutChangeHandlerSpy, sidebarAppUrl: '/' }

        # remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset()

        frame = sidebar.frame[0]
        Object.assign frame.style, {
          display: 'block',
          width: DEFAULT_WIDTH + 'px',
          height: DEFAULT_HEIGHT + 'px',

          # width is based on left position of the window,
          # we need to apply the css that puts the frame in the
          # correct position
          position: 'fixed',
          top: 0,
          left: '100%',
        }

        document.body.appendChild frame

      afterEach ->
        frame.remove()

      it 'notifies when sidebar changes expanded state', ->
        sidebar.show()
        assert.calledOnce layoutChangeHandlerSpy
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {expanded: true}

        sidebar.hide()
        assert.calledTwice layoutChangeHandlerSpy
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: false,
          width: fakeToolbar.getWidth(),
        }

      it 'notifies when sidebar is panned left', ->
        sidebar._gestureState = { initial: -DEFAULT_WIDTH }
        sidebar._onPan({type: 'panleft', deltaX: -50})
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {
          width: DEFAULT_WIDTH + 50 + fakeToolbar.getWidth()
        }

      it 'notifies when sidebar is panned right', ->
        sidebar._gestureState = { initial: -DEFAULT_WIDTH }
        sidebar._onPan({type: 'panright', deltaX: 50})
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {
          width: DEFAULT_WIDTH - 50 + fakeToolbar.getWidth()
        }

    describe 'with the frame in an external container', ->
      sidebar = null
      externalFrame = null

      beforeEach ->
        externalFrame = createExternalContainer()
        Object.assign externalFrame.style, {
          display: 'block',
          width: DEFAULT_WIDTH + 'px',
          height: DEFAULT_HEIGHT + 'px',
          position: 'fixed',
          top: 0,
          left: 0,
        }
        document.body.appendChild externalFrame

        layoutChangeHandlerSpy = sandbox.stub()
        layoutChangeExternalConfig = {
          onLayoutChange: layoutChangeHandlerSpy,
          sidebarAppUrl: '/',
          externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR,
        }
        sidebar = createSidebar layoutChangeExternalConfig

        # remove info about call that happens on creation of sidebar
        layoutChangeHandlerSpy.reset()

      afterEach ->
        externalFrame.remove()

      it 'notifies when sidebar changes expanded state', ->
        sidebar.show()
        assert.calledOnce layoutChangeHandlerSpy
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: true
          width: DEFAULT_WIDTH
        }

        sidebar.hide()
        assert.calledTwice layoutChangeHandlerSpy
        assertLayoutValues layoutChangeHandlerSpy.lastCall.args[0], {
          expanded: false,
          width: 0,
        }

  describe 'sidebar frame in an external container', ->
    sidebar = null
    externalFrame = null

    beforeEach ->
      externalFrame = createExternalContainer()
      document.body.appendChild externalFrame

      sidebar = createSidebar { externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR }

    afterEach ->
      externalFrame.remove()

    it 'uses the configured external container as the frame', ->
      assert.equal(sidebar.frame, undefined)
      assert.isDefined(sidebar.externalFrame)
      assert.equal(sidebar.externalFrame[0], externalFrame)
      assert.equal(externalFrame.childNodes.length, 1)

  describe 'config', ->
    it 'does not have the BucketBar plugin if the clean theme is enabled', ->
      sidebar = createSidebar({ theme: 'clean' })
      assert.isUndefined(sidebar.plugins.BucketBar)

    it 'does not have the BucketBar if an external container is provided', ->
      sidebar = createSidebar({ externalContainerSelector: '.' + EXTERNAL_CONTAINER_SELECTOR })
      assert.isUndefined(sidebar.plugins.BucketBar)

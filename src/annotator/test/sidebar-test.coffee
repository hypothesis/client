Annotator = require('annotator')
events = require('../../shared/bridge-events')

proxyquire = require('proxyquire')
Sidebar = proxyquire('../sidebar', {
  'annotator': Annotator,
})

describe 'Sidebar', ->
  sandbox = sinon.sandbox.create()
  CrossFrame = null
  fakeCrossFrame = null

  createSidebar = (options={}) ->
    element = document.createElement('div')
    return new Sidebar(element, options)

  beforeEach ->
    fakeCrossFrame = {}
    fakeCrossFrame.onConnect = sandbox.stub().returns(fakeCrossFrame)
    fakeCrossFrame.on = sandbox.stub().returns(fakeCrossFrame)
    fakeCrossFrame.call = sandbox.spy()

    CrossFrame = sandbox.stub()
    CrossFrame.returns(fakeCrossFrame)
    Annotator.Plugin.CrossFrame = CrossFrame

  afterEach ->
    sandbox.restore()
    delete Annotator.Plugin.CrossFrame

  describe 'crossframe listeners', ->
    emitEvent = (event, args...) ->
      fn(args...) for [evt, fn] in fakeCrossFrame.on.args when event == evt

    describe 'on "show" event', ->
      it 'shows the frame', ->
        target = sandbox.stub(Sidebar.prototype, 'show')
        sidebar = createSidebar()
        emitEvent('show')
        assert.called(target)

    describe 'on "hide" event', ->
      it 'hides the frame', ->
        target = sandbox.stub(Sidebar.prototype, 'hide')
        sidebar = createSidebar()
        emitEvent('hide')
        assert.called(target)

    describe 'on DO_LOGIN event', ->
      it 'calls the onLoginRequest callback function if one was provided', ->
        onLoginRequest = sandbox.stub()
        sidebar = createSidebar(options={services: [{onLoginRequest: onLoginRequest}]})

        emitEvent(events.DO_LOGIN)

        assert.called(onLoginRequest)

      it 'only calls the onLoginRequest callback of the first service', ->
        # Even though options.services is an array it only calls the onLoginRequest
        # callback function of the first service. The onLoginRequests of any other
        # services are ignored.
        firstOnLogin  = sandbox.stub()
        secondOnLogin = sandbox.stub()
        thirdOnLogin  = sandbox.stub()
        sidebar = createSidebar(
          options={
            services: [
              {onLoginRequest: firstOnLogin},
              {onLoginRequest: secondOnLogin},
              {onLoginRequest: thirdOnLogin},
            ]
          }
        )

        emitEvent(events.DO_LOGIN)

        assert.called(firstOnLogin)
        assert.notCalled(secondOnLogin)
        assert.notCalled(thirdOnLogin)

      it 'never calls the onLoginRequest callbacks of further services', ->
        # Even if the first service doesn't have an onLoginRequest, it still doesn't
        # call the onLoginRequests of further services.
        secondOnLogin = sandbox.stub()
        thirdOnLogin  = sandbox.stub()
        sidebar = createSidebar(
          options={
            services: [
              {},
              {onLoginRequest: secondOnLogin},
              {onLoginRequest: thirdOnLogin},
            ]
          }
        )

        emitEvent(events.DO_LOGIN)

        assert.notCalled(secondOnLogin)
        assert.notCalled(thirdOnLogin)

      it 'does not crash if there is no services', ->
        sidebar = createSidebar(options={})  # No options.services
        emitEvent(events.DO_LOGIN)

      it 'does not crash if services is an empty array', ->
        sidebar = createSidebar(options={services: []})
        emitEvent(events.DO_LOGIN)

      it 'does not crash if the first service has no onLoginRequest', ->
        sidebar = createSidebar(options={services: [{}]})
        emitEvent(events.DO_LOGIN)

  describe 'pan gestures', ->
    sidebar = null

    beforeEach ->
      sidebar = createSidebar({})

    describe 'panstart event', ->
      beforeEach ->
        sandbox.stub(window, 'getComputedStyle').returns({marginLeft: '100px'})
        sidebar.onPan({type: 'panstart'})

      it 'disables pointer events and transitions on the widget', ->
        assert.isTrue(sidebar.frame.hasClass('annotator-no-transition'))
        assert.equal(sidebar.frame.css('pointer-events'), 'none')

      it 'captures the left margin as the gesture initial state', ->
        assert.equal(sidebar.gestureState.initial, '100')

    describe 'panend event', ->
      it 'enables pointer events and transitions on the widget', ->
        sidebar.gestureState = {final: 0}
        sidebar.onPan({type: 'panend'})
        assert.isFalse(sidebar.frame.hasClass('annotator-no-transition'))
        assert.equal(sidebar.frame.css('pointer-events'), '')

      it 'calls `show` if the widget is fully visible', ->
        sidebar.gestureState = {final: -500}
        show = sandbox.stub(sidebar, 'show')
        sidebar.onPan({type: 'panend'})
        assert.calledOnce(show)

      it 'calls `hide` if the widget is not fully visible', ->
        sidebar.gestureState = {final: -100}
        hide = sandbox.stub(sidebar, 'hide')
        sidebar.onPan({type: 'panend'})
        assert.calledOnce(hide)

    describe 'panleft and panright events', ->
      it 'shrinks or grows the widget to match the delta', ->
        sidebar.gestureState = {initial: -100}

        sidebar.onPan({type: 'panleft', deltaX: -50})
        assert.equal(sidebar.gestureState.final, -150)

        sidebar.onPan({type: 'panright', deltaX: 100})
        assert.equal(sidebar.gestureState.final, 0)

  describe 'swipe gestures', ->
    sidebar = null

    beforeEach ->
      sidebar = createSidebar({})

    it 'opens the sidebar on swipeleft', ->
      show = sandbox.stub(sidebar, 'show')
      sidebar.onSwipe({type: 'swipeleft'})
      assert.calledOnce(show)

    it 'closes the sidebar on swiperight', ->
      hide = sandbox.stub(sidebar, 'hide')
      sidebar.onSwipe({type: 'swiperight'})
      assert.calledOnce(hide)

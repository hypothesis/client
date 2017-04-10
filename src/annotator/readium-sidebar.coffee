Sidebar = require('./sidebar')


module.exports = class ReadiumSidebar extends Sidebar
  options:
    Readium: {}
    TextSelection: {}
    BucketBar:
      container: '.annotator-frame'
    Toolbar:
      container: '.annotator-frame'

  constructor: (element, options) ->
    ReadiumSDK = window.ReadiumSDK
    options.shiftNativeElements = true
    super(element, options)

    ReadiumSDK.once(ReadiumSDK.Events.READER_INITIALIZED, (readium) =>
      readium.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, ($iframe, spineItem) =>
        guestElement = $iframe[0].contentDocument.body
        this.addGuest(guestElement, spineItem.href)
        @injectCSS($iframe)
      )

      readium.on(ReadiumSDK.Events.CONTENT_DOCUMENT_UNLOADED, ($iframe, spineItem) =>
        this.destroyGuest(spineItem.href)
      )
    )

  injectCSS: (iframe) ->
    linkEl = document.createElement('link')
    # THESIS TODO: Temporarily hardcoded. Improve at some point.
    linkEl.href = "http://127.0.0.1:5000/assets/client/styles/inject.css?356cf8"
    linkEl.rel = "stylesheet"
    linkEl.type = "text/css"
    iframe[0].contentDocument.head.appendChild(linkEl)

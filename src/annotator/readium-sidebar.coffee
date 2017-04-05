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
    super(element, options)

    ReadiumSDK.once(ReadiumSDK.Events.READER_INITIALIZED, (readium) =>
      readium.on(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, ($iframe, spineItem) =>
        guestElement = $iframe[0].contentDocument.body
        this.addGuest(guestElement, spineItem.href)
      )

      readium.on(ReadiumSDK.Events.CONTENT_DOCUMENT_UNLOADED, ($iframe, spineItem) =>
        this.destroyGuest(spineItem.href)
      )
    )

    this._shiftNativeElements()

  # THESIS TODO: Placed in ReadiumSidebar to avoid breaking unknown sites
  # If the solution seems safe, then consider moving it into Sidebar
  #
  # Shift the elements native to the website, so that they don't conflict
  # with our own.
  _shiftNativeElements: ->
    annoWrapper = document.getElementsByClassName('annotator-wrapper')[0]
    offset = this.toolbar.css('width')
    annoWrapper.style.marginRight += offset

    bucketEl = this.plugins.BucketBar.element[0]
    bucketStyle = bucketEl.style
    bucketStyle.width += offset
    bucketStyle.left += "-" + offset
    bucketStyle.borderLeft = "1px solid rgba(0,0,0, 0.07)"
    bucketStyle.borderRight = "1px solid rgba(0,0,0, 0.03)"

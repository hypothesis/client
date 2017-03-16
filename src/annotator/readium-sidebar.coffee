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
    console.log 'this works right'

    ReadiumSDK = window.ReadiumSDK

    ReadiumSDK.once(ReadiumSDK.Events.READER_INITIALIZED, (readium) =>
      readium.once(ReadiumSDK.Events.CONTENT_DOCUMENT_LOADED, ($iframe, spineItem) =>
        options.guestElement = $iframe[0].contentDocument.body
        super(element, options)
      )
    )

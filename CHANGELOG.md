<!--
Entries in this change log follow the format suggested at http://keepachangelog.com/
!-->

# Change Log

## [1.3.0] - 2017-03-10

### Changed

- Add a guide to developing the Hypothesis client
  ([#265](https://github.com/hypothesis/client/pull/265)).

- Add overview of client security considerations
  ([#272](https://github.com/hypothesis/client/pull/272)).

- Rename the onLogin callback to onLoginRequest
  ([#275](https://github.com/hypothesis/client/pull/275)).

### Fixed

- Fix browser devtools error due to broken sourcemap link in boot script
  ([#271](https://github.com/hypothesis/client/pull/271)).

## [1.2.0] - 2017-03-01

### Changed

- Make boot script load settings from correct config tags
  ([#243](https://github.com/hypothesis/client/pull/243)).

- Call partner provided login callback
  ([#260](https://github.com/hypothesis/client/pull/260)).

- Add an express server which serves the package's contents during development.
  ([#229](https://github.com/hypothesis/client/pull/229)).

### Fixed

- Fix anchoring of annotations in PDFs using quote selector
  ([#261](https://github.com/hypothesis/client/pull/261),
   [#262](https://github.com/hypothesis/client/pull/262)).

## [0.59.0] - 2017-02-27

### Added

- Allow publishers to specify logo for top bar
  ([#232](https://github.com/hypothesis/client/pull/232)).

### Changed

- Load assets from cdn.hypothes.is by default.

- Update Showdown (markdown renderer) from 1.3.0 to 1.6.4
  ([#238](https://github.com/hypothesis/client/pull/238)).

### Fixed

- Don't treat annotation quotes (TextQuoteSelector.exact) as HTML
  ([#239](https://github.com/hypothesis/client/pull/239)).

## [0.58.0] - 2017-02-21

### Fixed

- Highlights not saving on pages with many highlights and annotations
  ([#234](https://github.com/hypothesis/client/pull/234)).

## [0.57.0] - 2017-02-17

### Added

- Add a boot script to the client which replaces the `/embed.js` script served
  by the Hypothesis service
  ([#215](https://github.com/hypothesis/client/pull/215)).

### Changed

- Correct CC0 terminology
  ([#222](https://github.com/hypothesis/client/pull/222)).

- Disable the link to activity pages from usernames for 3rd party accounts
  ([#228](https://github.com/hypothesis/client/pull/228)).

- Remove account settings and logout link from Account menu for 3rd party
  accounts ([#231](https://github.com/hypothesis/client/pull/231)).

## [0.56.0] - 2017-02-14

### Changed

- Improve math rendering by updating KaTeX to v0.7.1
  ([#224](https://github.com/hypothesis/client/pull/224)).

### Fixed

- Wait for annotations to be fetched before displaying annotation counts in the
  page ([#225](https://github.com/hypothesis/client/pull/225)).

- Fix quote anchoring in pages which add enumerable properties to
  Array.prototype ([#226](https://github.com/hypothesis/client/pull/226)).

## [0.55.0] - 2017-02-10

### Changed

- Refresh OAuth tokens before they expire, when using OAuth authorization
  ([#221](https://github.com/hypothesis/client/pull/221)).

## [0.54.0] - 2017-02-03

### Changed

- Enable users with third-party accounts to dismiss the sidebar tutorial
  ([#207](https://github.com/hypothesis/client/pull/207)).

### Fixed

- Fix minification of JS and CSS in production builds
  ([#210](https://github.com/hypothesis/client/pull/210)).

## [0.53.0] - 2017-02-02

- Enable the host page to configure the client to log in using a non-Hypothesis
  ('third party') account by providing the client with an OAuth grant token
  ([#199](https://github.com/hypothesis/client/pull/199)). This is an initial
  step towards supporting annotation services other than the public Hypothesis
  service in the client.

- Support authenticating to real-time API using OAuth access tokens rather than
  cookies ([#200](https://github.com/hypothesis/client/pull/200)).

- Add support for displaying the count of public annotations in elements on the
  page embedding the Hypothesis client
  ([#202](https://github.com/hypothesis/client/pull/202)).

- Track basic annotation actions (create, update, delete) via Google Analytics
  ([#206](https://github.com/hypothesis/client/pull/206)).

## [0.52.0] - 2017-01-24

### Changed

- Simplify client source code directory structure
  ([#185](https://github.com/hypothesis/client/pull/185)).

- Add support for `hypothesis-trigger` declarative attribute
  to toggle the visibility of the sidebar
  ([#190](https://github.com/hypothesis/client/pull/190)).

- Add Google Analytics to help monitor application interactions
  ([#194](https://github.com/hypothesis/client/pull/194)).

- Whitelist the settings given to the client application
  ([#196](https://github.com/hypothesis/client/pull/196)).

- Improve support for Authorization header in API requests
  ([#191](https://github.com/hypothesis/client/pull/191)).


## [0.51.0] - 2017-01-10

### Changed

- Fix client failing to load when restoring a closed tab in Chrome
  ([#184](https://github.com/hypothesis/client/pull/184)).

- Fix failure to capture quotes for certain content selections
  ([#159](https://github.com/hypothesis/client/pull/159)).

## [0.50.0] - 2017-01-05

### Changed

- Show annotations that fail to anchor within an initial timeout in the
  Annotations tab but with the quote struck through
  ([#182](https://github.com/hypothesis/client/pull/182)).

- Tags on annotation cards now link to the new Hypothesis search pages
  (`/search?tag="{tag}`) rather than the stream (`/stream?tag="{tag}"`)
  ([#183](https://github.com/hypothesis/client/pull/183)).

- Fix highlight visibility on some web pages by using a custom tag name for
  highlight spans ([#172](https://github.com/hypothesis/client/pull/172)).

- Added a set of baseline tests to guard against unexpected changes to
  selectors that are captured when anchoring annotations
  ([#179](https://github.com/hypothesis/client/pull/179)).

## [0.49.0] - 2016-11-30

### Changed

- Improve anchoring performance in PDFs
  ([#171](https://github.com/hypothesis/client/pull/171)).

- Remove `defer_realtime_updates` feature flagging
  ([#173](https://github.com/hypothesis/client/pull/173)).

## [0.48.0] - 2016-11-18

### Added

- Add links to new Hypothesis Help Center from Help panel
  ([#161](https://github.com/hypothesis/client/pull/161)).

### Fixed

- Fix bug when anchoring annotations meeting certain criteria
  ([#158](https://github.com/hypothesis/client/pull/158)).

### Changed

- Generate code coverage metrics for the client
  ([#156](https://github.com/hypothesis/client/pull/156),
  [#168](https://github.com/hypothesis/client/pull/168))

## [0.47.0] - 2016-10-24

### Fixed

- Fix formatting changes made via toolbar buttons not persisting
  ([#148](https://github.com/hypothesis/client/pull/148)).

- Fix error when creating annotations if DOM selection meets certain conditions
  ([#155](https://github.com/hypothesis/client/pull/155)).

## [0.46.0] - 2016-09-29

### Changed

- Upgrade environment to use Node v6.x
  ([#143](https://github.com/hypothesis/client/pull/143)).

### Fixed

- Support loading client into current version of PDF.js viewer
  ([#134](https://github.com/hypothesis/client/pull/134)).

- Improve adder to be more resilient against overrides of Function.prototype.bind
  ([#141](https://github.com/hypothesis/client/pull/141)).


## [0.45.0] - 2016-09-28

### Fixed

- Fix issue that could cause fetching annotations for current page to continue forever
  ([#119](https://github.com/hypothesis/client/pull/119)).

- Prevent adder from affecting website's height on load
  ([#131](https://github.com/hypothesis/client/pull/131)).

- Fix error when trying to activate Hypothesis on https://hypothes.is/stream
  ([#138](https://github.com/hypothesis/client/pull/138)).


## [0.44.0] - 2016-09-19

### Changed

- Disable deferred updates on the stream and standalone annotation pages
  ([#112](https://github.com/hypothesis/client/pull/112)).

- Update icon for applying deferred annotation updates
  ([#113](https://github.com/hypothesis/client/pull/113)).

- Count deleted annotations as pending updates
  ([#114](https://github.com/hypothesis/client/pull/114)).

### Fixed

- Fix off-screen empty, unsaved annotations not being removed when a new
  annotation is created ([#107](https://github.com/hypothesis/client/pull/107)).

- Fix off-screen unsaved annotations not being moved to new group when focused
  group is changed ([#108](https://github.com/hypothesis/client/pull/108)).

- Only count updates to annotations in the focused group as pending updates
  ([#111](https://github.com/hypothesis/client/pull/111)).

## [0.43.0] - 2016-09-15

### Added

- Behind the `defer_realtime_updates` flag, add the ability to accumulate
  "real-time" changes and display a button notifying users of new activity,
  rather than automatically applying these changes to their view. This should
  result in a less jumpy experience for users on heavily-annotated documents.
  ([#106](https://github.com/hypothesis/client/pull/106)).

## [0.42.0] - 2016-09-13

### Changed

- Only offer 'Newest' and 'Oldest' sort orders when Page Notes tab is selected
  and sort Page Notes from oldest to newest by default
  ([#99](https://github.com/hypothesis/client/pull/99)).

- Sort unsaved annotations more predictably
  ([#101](https://github.com/hypothesis/client/pull/101)).

## [0.41.0] - 2016-09-12

### Fixed

- Fix behavior when there are multiple unsaved annotations
  ([#95](https://github.com/hypothesis/client/pull/95)).

## [0.40.0] - 2016-09-09

### Changed

- When retrieving an API token, the client now sends the CSRF token in a header
  rather than in a GET request parameter
  ([#91](https://github.com/hypothesis/client/pull/91)).

## [0.39.0] - 2016-09-06

### Changed

- In browsers that support it, the adder is now isolated from the styling of the
  annotated page using Shadow DOM
  ([#49](https://github.com/hypothesis/client/pull/49)).

- The selected tab (annotations/page notes/orphans) is now preserved when
  changing groups ([#82](https://github.com/hypothesis/client/pull/82)).

### Fixed

- Fix an issue where annotations updated via the websocket would unanchor,
  causing disturbance for anyone trying to annotate on the same page
  ([#87](https://github.com/hypothesis/client/pull/87),
  [#88](https://github.com/hypothesis/client/pull/88)).

## [0.38.1] - 2016-08-09

### Fixed

- Fix display of annotations on stream with orphans flag enabled
  ([#76](https://github.com/hypothesis/client/pull/76)).

- Feature-flag orphan quote strikethrough on annotation cards
  ([#77](https://github.com/hypothesis/client/pull/77)).

## [0.38.0] - 2016-08-08

### Fixed

- If an annotation is loaded and then quickly removed before the anchoring
  timeout expires, do not attempt to modify it's orphan status
  ([#75](https://github.com/hypothesis/client/pull/75)).

## [0.37.0] - 2016-08-08

### Added

- Display annotations that cannot be anchored in the page in a separate Orphans
  tab and strike-through their quotes in annotation cards
  ([#52](https://github.com/hypothesis/client/pull/52)). Feature flag:
  "orphans_tab"

- The Hypothesis client version is now embedded in the built package, rather
  than requiring the hosting service to provide it
  ([#65](https://github.com/hypothesis/client/pull/65)).

### Changed

- Replace `firstRun` config option with more usefully named `openSidebar` and
  `openLoginForm` config options
  ([#63](https://github.com/hypothesis/client/pull/63)).

- Update the URLs in the Hypothesis service used by 'Sign up' and 'Forgot
  password' links ([#68](https://github.com/hypothesis/client/pull/68)).

- Enable the selection tabs feature for all users.
  ([#71](https://github.com/hypothesis/client/pull/71)).

- If an annotation fails to anchor within 500ms, mark it as an orphan. If it turns out
  that anchoring just took longer, it will move from the Orphans tab to the Annotations tab
  once anchoring completes.
  ([#72](https://github.com/hypothesis/client/pull/72)).

## [0.36.0] - 2016-07-27

### Fixed

- Fix annotated sections of the page being highlighted multiple times when
  activating, de-activating and re-activating the client on a page.
  ([#47](https://github.com/hypothesis/client/pull/47))

- Fix broken "create a free account" link
  ([#56](https://github.com/hypothesis/client/pull/56))

## [0.35.0] - 2016-07-22

### Changed

- Defer connecting to the Hypothesis service's WebSocket endpoint for push
  updates until the user is either logged in or explicitly interacts with the
  sidebar. This reduces load on the service
  ([#20](https://github.com/hypothesis/client/pull/20))

- Move the root UI layout for the sidebar app into the client. This makes it
  easier to serve the client from a web service or bundle it with a browser
  extension ([#37](https://github.com/hypothesis/client/pull/37))

## [0.34.0] - 2016-07-15

### Changed

- Annotation / Notes tabs copy update and style tweaks
  ([#34](https://github.com/hypothesis/client/pull/34))

### Fixed

- Remove sticky tab bar behavior for now because it has some UI issues that
  need to be resolved ([#35](https://github.com/hypothesis/client/pull/35))

- Update UI state after search API request completes with no results
  ([#36](https://github.com/hypothesis/client/pull/36))

## [0.33.0] - 2016-07-13

### Added

- Allow keyboard control of the annotations/notes tabs
  ([#29](https://github.com/hypothesis/client/pull/29))

### Changed

- "Stick" the annotation/notes tabs to the top of the sidebar when scrolling in
  supported browsers ([#28](https://github.com/hypothesis/client/pull/28))

### Fixed

- Don't display a "no annotations" message while the sidebar is still loading
  ([#24](https://github.com/hypothesis/client/pull/24))

- Fix an issue which mistakenly hid notes in the stream or on standalone
  annotation pages ([#24](https://github.com/hypothesis/client/pull/24))

## [0.32.0] - 2016-07-08

### Added

- Make document titles link to annotations in context on the /stream page
  ([#1](https://github.com/hypothesis/client/pull/1))

### Changed

- Use the phrases 'Log in', 'Log out' and 'Sign up' consistently in the UI
  ([#18](https://github.com/hypothesis/client/pull/18))

- The Hypothesis client has been separated from the Hypothesis web service and
  moved to its own repository.

### Fixed

- Fix issue where clicking a new annotation in the page that was not yet
  created on the server would display a 'You do not have permission' message
  ([#2](https://github.com/hypothesis/client/pull/2))

- Fix edits to annotations not being preserved when scrolling annotations out
  of view and back into view and not being reflected when searching after
  editing ([#7](https://github.com/hypothesis/client/pull/7),
  [#8](https://github.com/hypothesis/client/pull/8))

- Fix new annotations not being moved to current group when switching groups
  ([#7](https://github.com/hypothesis/client/pull/8))

- Fix replies being moved to newly selected group when switching groups
  ([#8](https://github.com/hypothesis/client/pull/13))

- Fix canceled annotations re-appearing after switching groups
  ([#7](https://github.com/hypothesis/client/pull/8))

- Fix 'AnnotationResource is not a constructor' error when creating annotations
  whilst the app is loading ([#4](https://github.com/hypothesis/client/pull/4))

## Earlier releases

v0.31.0 and earlier versions of the Hypothesis client were released as part of
the Hypothesis web service. Changes for those releases can be found in the
[Hypothesis Service Change
Log](https://github.com/hypothesis/h/blob/master/CHANGES).

[0.33.0]: https://github.com/hypothesis/client/compare/v0.32.0...v0.33.0
[0.32.0]: https://github.com/hypothesis/client/compare/v0.31.0...v0.32.0

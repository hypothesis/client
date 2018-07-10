<!--
Entries in this change log follow the format suggested at http://keepachangelog.com/
!-->

# Change Log

## [1.85.0] - 2018-07-10

### Changed

- Add ability to place sidebar in container element designated by host page
  ([#707](https://github.com/hypothesis/client/pull/707)).

## [1.84.0] - 2018-06-14

### Changed

- Fix "No results for {query}" message
  ([#742](https://github.com/hypothesis/client/pull/742)).

## [1.83.0] - 2018-06-08

### Changed

- Handle non percent-encoded URLs when replacing links with media embeds
  ([#738](https://github.com/hypothesis/client/pull/738)).

## [1.82.0] - 2018-05-25

### Changed

- Updated several support links in Help panel
  ([#726](https://github.com/hypothesis/client/pull/726)).

- Fix project build with Node v10
  ([#728](https://github.com/hypothesis/client/pull/728)).

- Fix error when building project on Windows
  ([#733](https://github.com/hypothesis/client/pull/733)).

- Enable IP address anonymization for Google Analytics
  ([#736](https://github.com/hypothesis/client/pull/736)).

## [1.81.0] - 2018-04-20

### Changed

- Fix regression making it impossible to create annotations in v1.80.0
  ([#724](https://github.com/hypothesis/client/pull/724)).

## [1.80.0] - 2018-04-20

### Changed

- Internal refactoring and dependency updates.

## [1.79.0] - 2018-04-17

### Changed

- Some minor internal changes.

## [1.78.0] - 2018-04-13

### Changed

- Resolve relative URLs when getting PDF URL from PDF.js
  ([#716](https://github.com/hypothesis/client/pull/716)).

- Add organization logos to groups menu
  ([#718](https://github.com/hypothesis/client/pull/718)).

## [1.77.0] - 2018-03-29

### Changed

- Some minor internal changes.

## [1.76.0] - 2018-03-27

### Changed

- Support annotation of PDFs hosted inside iframes using PDF.js
  ([#681](https://github.com/hypothesis/client/pull/681)).

## [1.75.0] - 2018-03-22

### Changed

- Rename src/sidebar/{store => services/api}
  ([#691](https://github.com/hypothesis/client/pull/691)).

- Move sidebar services to src/sidebar/services/
  ([#692](https://github.com/hypothesis/client/pull/692)).

- Move away from `public` property in application components
  ([#693](https://github.com/hypothesis/client/pull/693)).

- Update icon for restricted groups in publish-annotation-button
  ([#699](https://github.com/hypothesis/client/pull/699)).

- Remove `group.public` property from annotation component
  ([#697](https://github.com/hypothesis/client/pull/697)).

- Remove reference to `group.url`
  ([#698](https://github.com/hypothesis/client/pull/698)).

- Changed background to selected element in PDF.js to visualize the searched
  content ([#696](https://github.com/hypothesis/client/pull/696)).

- Move Redux modules and entry point to `store/` directory
  ([#694](https://github.com/hypothesis/client/pull/694)).

## [1.73.0] - 2018-03-16

### Changed

- Show the world icon only for open groups in the groups dropdown
  ([#685](https://github.com/hypothesis/client/pull/685)).

## [1.72.0] - 2018-03-08

### Changed

- Default to Notes tab when only notes are present
  ([#686](https://github.com/hypothesis/client/pull/686)).

## [1.71.0] - 2018-02-21

### Changed

- Remove activity page links for third-party open groups
  as they are not yet supported in h
  ([#675](https://github.com/hypothesis/client/pull/675)).

## [1.70.0] - 2018-02-20

### Changed

- Attempt to fix an occasional issue with the release process
  ([#677](https://github.com/hypothesis/client/pull/677)).

## [1.69.0] - 2018-02-19

### Changed

- Display correct groups when using third-party accounts if logged-out
  ([#676](https://github.com/hypothesis/client/pull/676)).

## [1.68.0] - 2018-02-19

### Changed

- Show groups dropdown list to logged out users and link to group pages for open
  groups ([#673](https://github.com/hypothesis/client/pull/673)).

## [1.67.0] - 2018-02-16

### Changed

- Fix stream and single annotation routes
  ([#674](https://github.com/hypothesis/client/pull/674)).

## [1.66.0] - 2018-02-16

### Changed

- Get the list of groups from the new endpoint and update it where applicable
  ([#665](https://github.com/hypothesis/client/pull/665)).

## [1.65.0] - 2018-02-13

### Changed

- Fix spinner animation ([#667](https://github.com/hypothesis/client/pull/667)).

- Update to Angular 1.6.9
  ([#668](https://github.com/hypothesis/client/pull/668)).

## [1.64.0] - 2018-01-30

### Changed

- Hide the direct-link call-to-action for third party accounts
  ([#658](https://github.com/hypothesis/client/pull/658)).

## [1.63.0] - 2018-01-25

### Changed

- Fix login flow triggering popup blocker in Firefox and IE
  ([#651](https://github.com/hypothesis/client/pull/651)).

## [1.62.0] - 2018-01-10

### Changed

- Allow whitelisted URL params in YouTube embeds
  ([#646](https://github.com/hypothesis/client/pull/646)).

## [1.61.0] - 2017-12-19

### Changed

- Rename the main JS bundles that make up the client
  ([#633](https://github.com/hypothesis/client/pull/633)).

- Fix broken adder toolbar styling
  ([#642](https://github.com/hypothesis/client/pull/642)).

## [1.60.0] - 2017-12-19

### Changed

- Update the docs for config options available to third party publishers.
  ([#636](https://github.com/hypothesis/client/pull/636)).

- Some internal restructuring of the client
  ([#632](https://github.com/hypothesis/client/pull/632),
   [#634](https://github.com/hypothesis/client/pull/634),
   [#635](https://github.com/hypothesis/client/pull/635))

## [1.59.0] - 2017-12-11

### Changed

- Remove create account banner
  ([#630](https://github.com/hypothesis/client/pull/630)).

## [1.58.0] - 2017-12-07

### Changed

- Don't show page share button on eLife pages
  ([#620](https://github.com/hypothesis/client/pull/620)).

- Don’t link tags to activity pages on eLife
  ([#623](https://github.com/hypothesis/client/pull/623)).

- Show the shorter version of the empty annotations/notes message when …
  ([#611](https://github.com/hypothesis/client/pull/611)).

- Bundle the clean theme related config options into the theme = 'clean…
  ([#624](https://github.com/hypothesis/client/pull/624)).

- Disable close btn when the classic theme is on. Also fix errors with …
  ([#626](https://github.com/hypothesis/client/pull/626)).

## [1.57.0] - 2017-12-04

### Changed

- Make the "New note" button "image" in the tutorial pane look & behave less
  like an actual button ([#582](https://github.com/hypothesis/client/pull/582)).

- Do not hyperlink annotation timestamps when the annotation has no href
  ([#617](https://github.com/hypothesis/client/pull/617)).

- Do not show share dialog if no incontext link
  ([#618](https://github.com/hypothesis/client/pull/618)).

## [1.56.0] - 2017-11-29

### Changed

- Remove `oauthEnabled` client config setting
  ([#604](https://github.com/hypothesis/client/pull/604)).

## [1.55.0] - 2017-11-23

### Changed

- Remove checks for `search_for_doi` feature flag
  ([#598](https://github.com/hypothesis/client/pull/598)).

- Remove checks for `flag_action` feature flag.
  ([#597](https://github.com/hypothesis/client/pull/597)).

## [1.54.0] - 2017-11-22

### Changed

- Fix issue that could lead to user being logged into normal Hypothesis account
  on websites using third-party accounts
  ([#572](https://github.com/hypothesis/client/pull/572)).

## [1.53.0] - 2017-11-16

### Changed

- Fix default values for settings not being used in the browser extension
  ([#581](https://github.com/hypothesis/client/pull/581)).

## [1.52.0] - 2017-11-16

### Changed

- Only show display names on annotation cards if the new `client_display_names`
  feature flag is on _or_ if the annotation's creator is a third-party user
  ([#579](https://github.com/hypothesis/client/pull/579)).

- Add a new config option that enables a new-style for the sidebar tutorial
  card ([#580](https://github.com/hypothesis/client/pull/580)).

- Remove no-longer-used orphans tab feature flag checks
  ([#578](https://github.com/hypothesis/client/pull/578)).

## [1.51.0] - 2017-11-14

### Changed

- Implement new customisation options for the sidebar’s display.
  ([#555](https://github.com/hypothesis/client/pull/555)).
  ([#573](https://github.com/hypothesis/client/pull/573)).

## [1.50.0] - 2017-11-08

### Changed

- Improve performance on pages with very large numbers of annotations
  ([#559](https://github.com/hypothesis/client/pull/559)).

## [1.49.0] - 2017-11-08

### Changed

- Add OAuth client registration steps to developer docs
  ([#567](https://github.com/hypothesis/client/pull/567)).

- Strip unknown query params when generating Internet Archive embed URLs
  ([#561](https://github.com/hypothesis/client/pull/561)).

- Fix a cause of unexpected anchoring failures in PDFs
  ([#563](https://github.com/hypothesis/client/pull/563)).

- Remove support for cookie-based authentication
  ([#542](https://github.com/hypothesis/client/pull/542)).

## [1.48.0] - 2017-10-23

### Changed

- Support Internet Archive video embeds
  ([#554](https://github.com/hypothesis/client/pull/554)).

## [1.47.0] - 2017-10-03

### Changed

- Send search URIs to other frames by postMessage()
  ([#550](https://github.com/hypothesis/client/pull/550)).

## [1.46.0] - 2017-09-22

### Changed

- Re-fetch annotations when logging in or out when using OAuth
  ([#552](https://github.com/hypothesis/client/pull/552)).

## [1.45.0] - 2017-09-22

### Changed

- Adjust the preferred initial size of the login window.
  ([#547](https://github.com/hypothesis/client/pull/547)).

- Stop exporting the main annotation layer object as `window.annotator`
  ([#549](https://github.com/hypothesis/client/pull/549)).

- Remove iframe size check
  ([#551](https://github.com/hypothesis/client/pull/551)).

## [1.44.0] - 2017-09-20

### Changed

- Fix timestamp tooltips in annotation cards
  ([#546](https://github.com/hypothesis/client/pull/546)).

## [1.43.0] - 2017-09-18

### Changed

- Use profile display name in account menu
  ([#544](https://github.com/hypothesis/client/pull/544)).

- Fix handling of query terms without fields specified in client-side search
  ([#505](https://github.com/hypothesis/client/pull/505)).

## [1.42.0] - 2017-09-15

### Changed

- Render display name instead of username in existing annotations
  ([#541](https://github.com/hypothesis/client/pull/541)).

- Render display name instead of username in new annotations
  ([#545](https://github.com/hypothesis/client/pull/545)).

## [1.41.0] - 2017-09-11

### Changed

- Fix OAuth popup window failing to load in IE 11
  ([#538](https://github.com/hypothesis/client/pull/538)).

- Fix OAuth popup being blocked by pop-up blocker in Firefox and IE
  ([#537](https://github.com/hypothesis/client/pull/537)).

## [1.40.0] - 2017-09-11

### Changed

- Make annotation of iframes require opt-in by adding an "enable-annotation"
  attribute ([#533](https://github.com/hypothesis/client/pull/533)).

## [1.39.0] - 2017-09-06

### Changed

- Always use OAuth if cookie storage is blocked
  ([#529](https://github.com/hypothesis/client/pull/529)).

## [1.38.0] - 2017-09-05

### Changed

- Work around Chrome bug causing sidebar to become invisible
  ([#523](https://github.com/hypothesis/client/pull/523)).

## [1.37.0] - 2017-09-04

### Changed

- Use public, documented API method to leave groups
  ([#528](https://github.com/hypothesis/client/pull/528)).

## [1.36.0] - 2017-08-21

### Changed

- Refresh OAuth tokens "on demand" when making API calls
  ([#517](https://github.com/hypothesis/client/pull/517)).

- Reload OAuth tokens and profile when tokens are changed by another client
  instance ([#518](https://github.com/hypothesis/client/pull/518)).

- Deprecate "openLoginForm" setting and make a no-op when using OAuth
  ([#524](https://github.com/hypothesis/client/pull/524)).

- Get OAuth endpoints from the service's `/api/links` endpoint
  ([#525](https://github.com/hypothesis/client/pull/525)).

## [1.35.0] - 2017-08-09

### Changed

- Implement logout when using OAuth
  ([#501](https://github.com/hypothesis/client/pull/501)).

## [1.34.0] - 2017-08-03

### Changed

- Make login work when using OAuth following recent changes to the service's
  OAuth implementation ([#514](https://github.com/hypothesis/client/pull/514)).

- Automatically convert links ending with audio extensions (mp3, ogg, wav) to
  embedded audio players ([#508](https://github.com/hypothesis/client/pull/508)).

## [1.33.0] - 2017-08-01

### Changed

- Add onLayoutChange documentation
  ([#503](https://github.com/hypothesis/client/pull/503)).

- Remove the alternate tab switcher design
  ([#513](https://github.com/hypothesis/client/pull/513)).

## [1.32.1] - 2017-07-25

### Changed

- Fix IE 10/11 regression in documents without a `<base>` element.
  ([#507](https://github.com/hypothesis/client/pull/507)).

## [1.32.0] - 2017-07-20

### Changed

- Support using `dc.relation.ispartof` and `dc.identifier` meta tags to
  generate a URN for documents which are part of a larger work (eg. a book
  chapter)
  ([#500](https://github.com/hypothesis/client/pull/500)).

## [1.31.0] - 2017-07-17

### Changed

- Add mechanism for publishers to react to changes in the width and expanded
  state of the sidebar ([#499](https://github.com/hypothesis/client/pull/499)).

## [1.30.0] - 2017-07-14

### Changed

- Enable annotating in iframes which have the same origin as the top-level page
  ([#498](https://github.com/hypothesis/client/pull/498)).

## [1.29.0] - 2017-07-14

### Changed

- Remove need to set feature flag to enable iframe support
  ([#496](https://github.com/hypothesis/client/pull/496)).

- Do not inject client into small or hidden iframes
  ([#497](https://github.com/hypothesis/client/pull/497)).

- Persist login between sessions when using OAuth
  ([#494](https://github.com/hypothesis/client/pull/494)).

## [1.28.0] - 2017-07-11

### Changed

- Use OAuth for first party login if feature flag enabled.
  ([#476](https://github.com/hypothesis/client/pull/476)).

- Fix adder position when document or body position is offset.
  ([#493](https://github.com/hypothesis/client/pull/493)).

## [1.27.0] - 2017-07-06

### Changed

- Allow integrators to customize behavior of scrolling to
  highlights by intercepting the "scrolltorange" event
  ([#484](https://github.com/hypothesis/client/pull/484)).

## [1.26.0] - 2017-07-05

### Changed

- Fix view switcher flash on iOS
  ([#482](https://github.com/hypothesis/client/pull/482)).

- Fix decoding of the query section in "#annotations" fragments
  ([#483](https://github.com/hypothesis/client/pull/483)).

- Get document URL from `<base>` tag for iframes with `blob:` URLs
  ([#474](https://github.com/hypothesis/client/pull/474)).

- Improve handling of iframe removal when multiple iframes have
  same `src` URL
  ([#478](https://github.com/hypothesis/client/pull/478)).

- Don't show view switcher until annotations received
  ([#481](https://github.com/hypothesis/client/pull/481)).

## [1.25.0] - 2017-06-30

### Changed

- Progress towards making the Hypothesis client able to annotate content inside
  iframes
  ([#457](https://github.com/hypothesis/client/pull/457),
  [#469](https://github.com/hypothesis/client/pull/469),
  [#472](https://github.com/hypothesis/client/pull/472),
  [#467](https://github.com/hypothesis/client/pull/467)).

- Progress towards using OAuth tokens, rather than cookies, to authenticate the
  Hypothesis client to the Hypothesis API - allow "oauthEnabled" setting to be
  overridden in client config
  ([#470](https://github.com/hypothesis/client/pull/470)).

- A UI enhancement: Replace "selection tabs" with "view switcher" (feature flagged)
  ([#465](https://github.com/hypothesis/client/pull/465)).

- Convert unicode service & tests to JavaScript
  ([#475](https://github.com/hypothesis/client/pull/475)).

## [1.24.1] - 2017-06-27

### Changed

- Fix failure to start when browser blocks access to localStorage
  ([#464](https://github.com/hypothesis/client/pull/464)).

## [1.24.0] - 2017-06-26

### Changed

- Enable feature flagging in the annotation layer
  ([#440](https://github.com/hypothesis/client/pull/440)).

- Fix sidebar app failing to load in Firefox extension.
  ([#460](https://github.com/hypothesis/client/pull/460)).

## [1.23.0] - 2017-06-19

### Changed

- Fixes always off highlighting issue.
  Add showHighlights() settings function.
  ([#455](https://github.com/hypothesis/client/pull/455)).

- Convert localStorage service from CoffeeScript to JS
  ([#443](https://github.com/hypothesis/client/pull/443)).

- Fix warning about loading Angular twice in tests
  ([#448](https://github.com/hypothesis/client/pull/448)).

- Convert shared Bridge class to JS
  ([#449](https://github.com/hypothesis/client/pull/449)).

- Remove assetRoot and sidebarAppUrl from annotator
  ([#452](https://github.com/hypothesis/client/pull/452)).

- Rename H_SERVICE_URL to SIDEBAR_APP_URL
  ([#454](https://github.com/hypothesis/client/pull/454)).

- Remove unused "host" service
  ([#446](https://github.com/hypothesis/client/pull/446)).

## [1.22.0] - 2017-06-16

- No changes, re-running the release script after releasing 1.21.0 partially
  succeeded.

## [1.21.0] - 2017-06-15

### Changed

- When embedded in a page read the URL of the annotation API to talk to from
  the page's `services` setting
  ([#426](https://github.com/hypothesis/client/pull/426)).

  This has also been documented
  ([#450](https://github.com/hypothesis/client/pull/450)).

  This also means that if the host page of an embedded client contains a
  `services` setting then the `services[].apiUrl` sub-setting is mandatory,
  otherwise the client will crash on load.

- Support JavaScript ES2015 code in the client
  ([#421](https://github.com/hypothesis/client/pull/421)).

- Add Symbol polyfill (needed for some ES2015 language constructs)
  ([#442](https://github.com/hypothesis/client/pull/442)).

- Multiple frame detection and injection
  ([#430](https://github.com/hypothesis/client/pull/430)).

- Config code refactoring
  ([#422](https://github.com/hypothesis/client/pull/422),
  [#423](https://github.com/hypothesis/client/pull/423),
  [#424](https://github.com/hypothesis/client/pull/424),
  [#425](https://github.com/hypothesis/client/pull/425),
  [#432](https://github.com/hypothesis/client/pull/432),
  [#435](https://github.com/hypothesis/client/pull/435),
  [#436](https://github.com/hypothesis/client/pull/436),
  [#437](https://github.com/hypothesis/client/pull/437),
  [#438](https://github.com/hypothesis/client/pull/438)).

- Convert tags service to JS
  ([#431](https://github.com/hypothesis/client/pull/431)).

### Fixed

- Don't crash if a page contains a js-hypothesis-config script containing
  invalid JSON, instead log a warning and continue ignoring the invalid JSON
  ([#427](https://github.com/hypothesis/client/pull/427)).

- Don't crash if the page contains a `window.hypothesisConfig` that isn't a
  function, instead log a warning and continue ignoring
  `window.hypothesisConfig`
  ([#428](https://github.com/hypothesis/client/pull/428)).

- Fix dev environment JavaScript error on localhost:3000 page
  ([#445](https://github.com/hypothesis/client/pull/445)).

- Re-enable reading openLoginForm and openSidebar from the host page
  (fixes the sidebar not auto-opening on the /welcome page after you install
  the Chrome extension)
  ([#447](https://github.com/hypothesis/client/pull/447)).

- Upgrade gulp-sass (fixes a build error with Node v8)
  ([#441](https://github.com/hypothesis/client/pull/441)).

## [1.20.0] - 2017-06-06

### Changed

- Prevent Adder toolbar from inheriting CSS property values from host page
  ([#396](https://github.com/hypothesis/client/pull/396)).

- Improve config naming, usage, access and tests.
  ([#400](https://github.com/hypothesis/client/pull/400)).
  ([#404](https://github.com/hypothesis/client/pull/404)).
  ([#406](https://github.com/hypothesis/client/pull/406)).
  ([#415](https://github.com/hypothesis/client/pull/415)).

- Refactored annotation query extraction
  ([#411](https://github.com/hypothesis/client/pull/411)).
  ([#412](https://github.com/hypothesis/client/pull/412)).

- Added group leave, switch, and view activity metrics
  ([#405](https://github.com/hypothesis/client/pull/405)).

- Extensions now ignore all config other than direct linked ID from host page.
  ([#410](https://github.com/hypothesis/client/pull/410)).

- Fixed ghost adder ([#419](https://github.com/hypothesis/client/pull/419)).

- Added the ability to search annotations by DOI
  ([#417](https://github.com/hypothesis/client/pull/417)).
  ([#418](https://github.com/hypothesis/client/pull/418)).

- Added console log capture to karma tests
  ([#420](https://github.com/hypothesis/client/pull/420)).

## [1.19.0] - 2017-05-23

### Changed

- Reduce client size slightly by switching to jQuery slim build
  ([#391](https://github.com/hypothesis/client/pull/391)).

- Add config option to show highlights only when sidebar is open
  ([#392](https://github.com/hypothesis/client/pull/392)).

## [1.18.0] - 2017-05-22

### Changed

- Do not let authors flag their own annotations.
  ([#387](https://github.com/hypothesis/client/pull/387)).

- Show an error message to the user when getting or refreshing an OAuth access
  token fails ([#385](https://github.com/hypothesis/client/pull/385)).

- Allow publishers to customize log out, profile and help links
  ([#389](https://github.com/hypothesis/client/pull/389)).

## [1.17.0] - 2017-05-17

### Fixed

- Fix refreshing access tokens when laptop suspends
  ([#384](https://github.com/hypothesis/client/pull/384)).

### Changed

- Switch package management from npm to Yarn
  ([#359](https://github.com/hypothesis/client/pull/359)).

- Remove Annotator.js dependency
  ([#380](https://github.com/hypothesis/client/pull/380)).

## [1.16.0] - 2017-05-16

### Changed

- Allow publishers to customize "Sign up" link handling
  ([#379](https://github.com/hypothesis/client/pull/379)).

- Changed "highlightColor" to "accentColor" in branding configuration
  ([#383](https://github.com/hypothesis/client/pull/383)).

- Clarify in tooltip what "Flag" button does
  ([#373](https://github.com/hypothesis/client/pull/373)).

## [1.15.0] - 2017-05-09

### Changed

- Do not display moderation banner unless moderation metadata is present
  ([#363](https://github.com/hypothesis/client/pull/363)).

- Do not show highlight indicator for censored annotations
  ([#365](https://github.com/hypothesis/client/pull/365)).

- Exclude vendor code from coverage metrics
  ([#366](https://github.com/hypothesis/client/pull/366)).

- Don't show duplicate toasts when API requests fail
  ([#375](https://github.com/hypothesis/client/pull/375)).

- Improve error when flagging when logged out
  ([#374](https://github.com/hypothesis/client/pull/374)).

## [1.14.0] - 2017-04-24

### Changed

- Render "censored text" for hidden annotations
  ([#362](https://github.com/hypothesis/client/pull/362)).

### Fixed

- Fix error when a thread contains deleted annotations with replies
  ([#369](https://github.com/hypothesis/client/pull/369)).

- Fix `target` error when creating new replies
  ([#370](https://github.com/hypothesis/client/pull/370)).

## [1.13.0] - 2017-04-19

### Changed

- Use the new `/api/links` resource
  ([#356](https://github.com/hypothesis/client/pull/356)).

## [1.12.1] - 2017-04-13

### Fixed

- Update flag count after moderator flags an annotation themselves
  ([#347](https://github.com/hypothesis/client/pull/347)).

## [1.12.0] - 2017-04-12

### Changed

- Only display CC 0 license for shared annotations in public groups
  ([#354](https://github.com/hypothesis/client/pull/354)).

## [1.11.0] - 2017-04-07

### Changed

- Show the flagged status for annotations that user has flagged.
  ([#340](https://github.com/hypothesis/client/pull/340)).

- Add branding config docs
  ([#322](https://github.com/hypothesis/client/pull/322)).

- Update client to use newest moderation APIs
  ([#336](https://github.com/hypothesis/client/pull/336)).

- Enable first-party users to flag annotations if `flag_action`
  feature flag is enabled
  ([#343](https://github.com/hypothesis/client/pull/343)).

## [1.10.0] - 2017-04-06

### Changed

- Add developer docs explaining how to test the client on a real mobile device
  ([#330](https://github.com/hypothesis/client/pull/330)).

- Add Slack link to README
  ([#334](https://github.com/hypothesis/client/pull/334)).

- Add cross references in developer documentation
  ([#335](https://github.com/hypothesis/client/pull/335)).

### Fixed

- Fix regression where annotations sometimes failed to appear in Firefox
  ([#342](https://github.com/hypothesis/client/pull/342)).

## [1.9.0] - 2017-04-03

### Changed

- Use new endpoint for creating an annotation flag
  ([#320](https://github.com/hypothesis/client/pull/320)).

### Fixed

- Fix annotating sites with broken Function.prototype.bind polyfills
  ([#333](https://github.com/hypothesis/client/pull/333)).

## [1.8.0] - 2017-03-31

### Fixed

- Fix sidebar not opening when tapping annotations on mobile
  ([#329](https://github.com/hypothesis/client/pull/329)).

- Fix sidebar not closing when tapping in page on mobile
  ([#328](https://github.com/hypothesis/client/pull/328)).

- Fix sidebar not scrolling when dragged on iOS
  ([#327](https://github.com/hypothesis/client/pull/327)).

## [1.7.0] - 2017-03-29

### Changed

- Strikethrough & apply greyscale/contrast effects to hidden annotations
  ([#301](https://github.com/hypothesis/client/pull/301)).

### Fixed

- Fix scrolling to new annotations
  ([#321](https://github.com/hypothesis/client/pull/321)).

## [1.6.0] - 2017-03-28

### Changed

- Enable publishers to customize the look of the sidebar
  ([#306](https://github.com/hypothesis/client/pull/306)).

- Add analytics to social share buttons
  ([#312](https://github.com/hypothesis/client/pull/312)).

- Add analytics to login, logout and sign-up actions
  ([#311](https://github.com/hypothesis/client/pull/311)).

## [1.5.0] - 2017-03-24

### Changed

- Replace references to "the Hypothesis web service" with "h" in the docs
  ([#291](https://github.com/hypothesis/client/pull/291)).

- Implement button for users to flag an inappropriate annotation
  ([#296](https://github.com/hypothesis/client/pull/296)).

- Implement moderation banner for flagged or hidden annotations
  ([#285](https://github.com/hypothesis/client/pull/285)).

- Add initial work to support styling the sidebar to better integrate with the
  look of a publisher's site
  ([#303](https://github.com/hypothesis/client/pull/303)).

## [1.4.0] - 2017-03-17

### Changed

- Reorganise Hypothesis Client docs and move them to [Read the
  docs](https://h.readthedocs.io/projects/client/en/latest/)
  ([#279](https://github.com/hypothesis/client/pull/279)).

- Fix client failing to load on pages that define `self`
  ([#278](https://github.com/hypothesis/client/pull/278)).

- Support specifying annotation search queries in direct links via
  `#annotations:query:{query}` syntax
  ([#254](https://github.com/hypothesis/client/pull/254)).

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

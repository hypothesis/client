<!--
Entries in this change log follow the format suggested at http://keepachangelog.com/
!-->

# Change Log

## [Unreleased]

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

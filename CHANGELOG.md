<!--
Entries in this change log follow the format suggested at http://keepachangelog.com/
!-->

# Change Log

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

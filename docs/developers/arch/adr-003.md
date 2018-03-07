# Sidebar application architecture

This document describes a proposed plan to clarify the structure of the Hypothesis client's sidebar application.

## Context

The Hypothesis client consists of three major pieces:

- The "boot" code which loads resources required by other parts of the client
- The "annotator" code which runs in the context of the host page
- The "sidebar" application which handles fetching, presenting and editing of
  annotations

The sidebar application is built on Angular JS [1]. Other than the [components
ADR](adr-001.md) the architecture has evolved in a slightly ad-hoc fashion.

For example, historically the app suffered from a number of problems related to
performance [2] and testability [3] which motivated the introduction of a
central state container. However it is not universally used for all the data
needed to display the UI, creating confusion about what to use for new features.

In addition to inconsistencies, the structure that exists is difficult to
discern without extensive reading of the code and new or occassional developers
have found it difficult to grok. Poor naming of some modules also complicates
understanding. For example the API client is called `store.js` (a reference to
_Annotator Store_).

## Proposal

Make explicit the implicit structure which the sidebar app's code has gradually
been evolving toward over the last 12-18 months and to finish the transition.
The sidebar app will consist of the following layers:

**Store**
- The _state container_ [4] for the app, built on Redux.
- This maintains all the state needed to "draw" the user interface in a normalized (ie. avoiding duplication) representation.
- Organised into modules which maintain different aspects of the state.

**Services**
- Classes that handle interaction with external actors such as the host page, the annotation service (via the API, real-time API and OAuth endpoints) and local storage, scheduled/periodic tasks.
- These may maintain transient state (eg. the active `WebSocket` instance), but nothing required to "draw" the UI

**Components**
- Self-contained parts of the UI, each consisting of a template, styles and logic.
- These are connected to the services and store.

**Utilities**
- Helper functions and classes which do not depend on the other layers.

These layers will have the following dependency structure:

```
Utilities --> Store
   |          | | |
   |          V | |
   |-------> Services
   |          | | | |
   |          V V | |
   |-------> Components
   |          |   | |
   |          V   V V
   |-------> [ Entry point ]
```

The directory structure will be organized along functional lines in a similar
manner to our Python apps:

```
src/sidebar/
  store/ # Redux store
    modules/ # Modules defining the logic related to a given part of the state
             # (eg. "annotations", "groups", "drafts").
  services/
  components/
  util/ # Utility classes & functions
  ...

  index.js # App entry point
```

Individual modules should be given clearer names to reflect their role in this
new structure and avoid ambiguity.

## Consequences

- The clearer directory layout should make it easier for new developers to understand the structure of the client and modify or add features, avoiding layering violations that create technical debt.

- If in future we decide to migrate away from AngularJS v1 we should be in an easier position to do so, since much of the code is independent of the UI framework and the part that does continue to use Angular (UI components) does so in a way which is conceptually compatible with most other frameworks.

## Footnotes

[1] This was a popular choice at the time the code was originally written. As a
framework it is now in maintenance mode and only receives updates for security
or browser compatibility purposes. It is serving us adequately and there is no
immediate pressure to migrate, but it is missing some of the performance and
ecosystem benefits of newer frameworks, so I think it wise that we pave the way
for this eventually.

[2] One of Angular's main tasks is to synchronize a DOM tree with a data source.
The way it does this is essentially to _poll_ the data source every time
something _might_ have changed and update every part of the DOM where the
underlying data source has changed since the last update. In order to be
efficient, the application's model needs to be set up in such a way that the
total cost of executing all of these "watcher" functions is low. Redux's use of
immutability is very helpful in this respect because it enables memoization.

[3] Various parts of the app related to updating the model were rewritten in a
more functional style to reduce the reliance on mocking and thus improve the
likelihood that a passing unit test translates into a working application.

[4] A _state container_ is a centralized data store holding all the information
needed to "draw" the UI, typically in a normalized form. Having this enables
useful tooling (such as our debug logging) but more importantly it helps
avoid bugs caused by not having a single source of truth.

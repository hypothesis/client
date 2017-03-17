ADR 1: Component Architecture for Sidebar Application
=====================================================

Context
-------

### Background

Historically front-end web frameworks, including Angular 1.x, used a variety of
MVC-based patterns for structuring the user interface part of an application
, which of course is much of the code for a web app.

More recently (especially since React in 2013), web frameworks have generally
moved to a simpler model where an application is structured as a tree of
components with several key properties:

 * Each component's internals are hidden from other components.
 * Data is explicitly passed from one component to another and in one direction.
 * Components have an explicitly declared API.
 * Communication from child to parent happens via callback inputs.
 * Components have a standard set of lifecycle hooks for creation, input changes
   and destruction.

A further pattern that emerged on top of this was to split components into those
which purely reflect their inputs ("presentational" components) and those which
are connected to services and state in the application ("container" or
"connected" components).

This pattern made it easier to reason about, re-use and change pieces of the
application in isolation, as well as enabling important optimizations and
simpler framework implementations.

In Angular JS prior to v1.5, this pattern could be achieved by using a
combination of features (element directives, isolate scope, bind-to-controller,
controllerAs). Angular JS 1.5x introduced [explicit
support](https://docs.angularjs.org/guide/component) for this architecture via
`.component()`.

### Components in the Client

The client historically used traditional Angular 1.x methods of passing data
between parts of the UI - properties on the scope inherited by child scopes and
events. As the app grew larger it became harder to reason about where data in
templates came from and who could change it ("$scope soup"). Newer parts of the
UI have used element directives with isolate scopes to implement a
component-based architecture, thus avoiding this problem. However:

- This requires a bunch of boilerplate for each directive.
- It isn't clear that we use this pattern from looking at the entry point to the
  sidebar.
- Important parts of the top level of the UI (the `*-controller.js` files and
  `viewer.html`) do not use this pattern and suffer from being hard to
  understand in isolation. Additionally they use a different mechanism
  (`ngRouter`) to control what is displayed than the rest of the UI, where we use
  `ng-if` guards.
- This lack of consistency makes it difficult to understand how the top level of
  the UI works.

Decision
--------

* We will convert all element directives in `src/sidebar/directive` to
  components (ie. change them to use `angular.component()` and any refactoring
  this implies) and move them to `src/sidebar/components`. This change will be
  simple in most cases and will require some moderate refactoring for others.

* The top-level of the application will also be converted to a set of components
  using the same pattern and the router will be removed.

Status
------

In discussion

Consequences
------------

In the short term this should make it easier to understand the sidebar app by
improving consistency.

In the medium term, this brings the architecture of the client more into
alignment with how it would be structured in other frameworks and gives us the
opportunity to incrementally migrate to a more actively developed (and
potentially smaller, faster, simpler) library for building our UI in future.

Presentational components can be potentially be extracted into their own
packages for re-use in other parts of Hypothesis, though this is not an active
priority.

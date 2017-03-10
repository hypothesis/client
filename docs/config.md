Configuring the client
======================

### Configuring the client using JSON

The Hypothesis client can be configured by providing a JSON config object in
the body of the hosting page:

```html
<script type="application/json" class="js-hypothesis-config">
  {
    "openSidebar": true
  }
</script>
<script async src="https://hypothes.is/embed.js"></script>
```

Not all configuration settings can be set in this way, some must be
[set using JavaScript](#configuring-the-client-using-javascript) (see below).

**N.B.** The body of the `.js-hypothesis-config` tag must be [valid
JSON](http://jsonlint.com/) -- invalid JSON will cause the entire config object
to be ignored.

### Configuring the client using JavaScript

Alternatively, the Hypothesis client can be configured from the hosting page by
providing a JavaScript function named `window.hypothesisConfig` that returns
a configuration object. Some configuration settings (for example settings that
register callback or event handler functions) can _only_ be set from
JavaScript:

```html
window.hypothesisConfig = function () {
  return {
    "openSidebar": true
  };
};
```

Config settings
---------------

### Client behavior

These settings configure the behavior and initial state of the client when it
loads.

#### `openLoginForm`

_Boolean_. Controls whether the login panel is automatically opened on startup,
as if the user had clicked "Log in" themselves. (Default: _false_.)

#### `openSidebar`

_Boolean_. Controls whether the sidebar opens automatically on startup.
(Default: _false_.)

#### `showHighlights`

_Boolean_. Controls whether the in-document highlights are shown by default.
(Default: _true_.)

### Annotation services

The `services` setting configures which annotation services the client
connects to (for example to login, retrieve annotations, and save annotations).
By default, if no `services` setting is given, the client connects to the
public Hypothesis service at [hypothes.is](https://hypothes.is).

#### `services`

_Array_. A list of alternative annotation services which the client should
connect to instead of connecting the the public Hypothesis service at
[hypothes.is](https://hypothes.is/).
May optionally include information (in the form of a grant token) about the
identity of the user accounts that the client is logged in to on those
services.

**N.B.** These settings are currently still experimental and may change without
warning.

**N.B.** Currently only one alternative annotation service at a time is
supported - only the first item in this `services` array is used, and any
further items in the array are ignored.

Each item in the `services` array should be an object describing an annotation
service, with the following keys:

 * `authority` _String_. The domain name which the annotation service is
   associated with.

 * `grantToken` _String|null_. An OAuth 2 grant token which the client can
   exchange for an access token in order to make authenticated requests to the
   service. If _null_, the user will be able to read but not create or modify
   annotations. (Default: _null_)

 * `icon` _String|null_. The URL to an image for the annotation service. This
   image will appear to the left of the name of the currently selected group.
   The image should be suitable for display at 16x16px and the recommended
   format is SVG.

 * `onLoginRequest` _function_. A JavaScript function that the client will
   call in order to login (for example, when the user clicks a login button in
   the Hypothesis client's sidebar).

   This setting can only be [set using window.hypothesisConfig](#configuring-the-client-using-javascript).

   If the hosting page provides an `onLoginRequest` function then the Hypothesis
   client will call this function instead of doing its usual procedure for
   logging in to the public service at [hypothes.is](https://hypothes.is/).

   No arguments are passed to the `onLoginRequest` function.

   The `onLoginRequest` function should cause a login procedure for the hosting page
   to be performed - for example by redirecting to a login page, or by opening
   a popup login window. After a successful login the hosting page should
   reload the original page with a non-null `grantToken` for the logged-in user
   in the `services` configuration setting.

### Asset and sidebar app location

These settings configure where the client's assets are loaded from.

**N.B.** These settings are currently still experimental and may change without
warning.

#### `assetRoot`

_String_. The root URL from which assets are loaded. This should be set to the
URL where the contents of the `hypothesis` package are hosted, including the
trailing slash. (Default: For production builds:
_https://cdn.hypothes.is/hypothesis/X.Y.Z/_, for development builds:
_http://localhost:3001/hypothesis/X.Y.Z/_. _X.Y.Z_ is the package version from
`package.json`)

#### `sidebarAppUrl`

_String_. The URL for the sidebar application which displays annotations
(Default: _https://hypothes.is/app.html_ . If the `H_SERVICE_URL` env var is
set, defaults to `${H_SERVICE_URL}/app.html`)

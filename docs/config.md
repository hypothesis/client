Configuring the sidebar
=======================

The Hypothesis sidebar can be configured by providing a settings object in the
body of the hosting page:

```html
<script type="application/json" class="js-hypothesis-config">
  {
    "openSidebar": true
  }
</script>
<script async src="https://hypothes.is/embed.js"></script>
```

**N.B.** The body of the `.js-hypothesis-config` tag must be [valid
JSON](http://jsonlint.com/) -- invalid JSON will cause the entire config object
to be ignored.

Config keys
-----------

## Client behavior

These keys configure the behavior and initial state of the client when it
loads.

### `openLoginForm`

_Boolean_. Controls whether the login panel is automatically opened on startup,
as if the user had clicked "Log in" themselves. (Default: _false_.)

### `openSidebar`

_Boolean_. Controls whether the sidebar opens automatically on startup.
(Default: _false_.)

### `showHighlights`

_Boolean_. Controls whether the in-document highlights are shown by default.
(Default: _true_.)

## Annotation services

These keys configure which annotation services the client connects to and where
it loads assets from. By default, the client will connect to the public
Hypothesis service at [hypothes.is](https://hypothes.is).

### `assetRoot`

_String_. The URL from which client assets are loaded.

### `sidebarAppUrl`

_String_. The URL for the sidebar application which displays annotations
(Default: _https://hypothes.is/app.html_).

### `services`

_Array_. A list of additional annotation services which the client should
retrieve annotations from, optionally including information about the identity
of the user on that service. This list is in addition to the public
[Hypothesis](https://hypothes.is/) service.

Each service description is an object with the keys:

 * `authority` _String_. The domain name which the annotation service is associated with.
 * `grantToken` _String|null_. An OAuth grant token which the client can exchange for an access token in order to make authenticated requests to the service. If _null_, the user will only be able to read rather than create or modify annotations. (Default: _null_)

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

### `openLoginForm`

_Boolean_. Controls whether the login panel is automatically opened on startup,
as if the user had clicked "Log in" themselves. (Default: _false_.)

### `openSidebar`

_Boolean_. Controls whether the sidebar opens automatically on startup.
(Default: _false_.)

### `showHighlights`

_Boolean_. Controls whether the in-document highlights are shown by default.
(Default: _true_.)

### `services`

_Array_. A list of annotation services which the client should retrieve
annotations from, optionally including information about the identity of the
user on that service. When omitted, the client will default to connecting to
the public [Hypothesis](https://hypothes.is/) service.

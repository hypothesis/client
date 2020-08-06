This directory contains documents that are served by the local
web server (via `make dev`). Files here with a `.mustache.html` extension
will be available in the browser at the path
`localhost:<port>/document/<filename-without-extension>`,
e.g. `foo.mustache.html` would be available at `localhost:<port>/document/foo`.

Mustache-templated HTML documents may use `{{{ hypothesisScript }}}` to inject
the client application as configured by `client-config.js.mustache`.

Other things here:

- `client-config.js.mustache` - configuration for the client and JS to inject
  the client into HTML pages. You can make edits here if you'd like to
  change how the application is configured in the local web pages.
- `index.template.mustache` is the main "landing page" for the local dev server.
- `preformatted.template.mustach` is a template used to render some additional content
  used by `index.template.mustache`

See `scripts/gulp/dev-server.js` for more information on how these files
are composed.

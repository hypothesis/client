This directory contains documents that are served by the local
web server (via `make dev`). Files here with an `.html` extension
will be available in the browser at the path
`localhost:<port>/document/<filename-without-extension>`,
e.g. `foo.html` would be available at `localhost:<port>/document/foo`.

HTML documents may use the token `{{{ hypothesisScript }}}` to inject
the client application as configured by `client-config.txt`.

Other things here:

- `client-config.txt` - configuration for the client and JS to inject
  the client into HTML pages. You can make edits here if you'd like to
  change how the application is configured in the local web pages.
- `client-test.txt` is the main "landing page" for the local dev server.
- `preformatted.txt` is a template used to render some additional content
  used by `client-test`

See `scripts/gulp/dev-server.js` for more information on how these files
are composed.

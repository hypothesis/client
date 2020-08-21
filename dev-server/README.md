This directory contains the Hypothesis client's development server that is
started by `make dev`. It hosts the assets that make up the Hypothesis client
from the `build/` directory as well as content for testing the Hypothesis client.

Test documents in the `documents/html` directory are available at
`localhost:<port>/document/<filename-without-extension>`,
e.g. `documents/foo.mustache` would be available at `localhost:<port>/document/foo`.

PDFs in the `documents/pdf` directory are available at
`localhost:port/pdf/<filename-without-extension>` and will be served with the
PDF JS viewer as well as the embedded client.

Mustache-templated HTML documents may use `{{{ hypothesisScript }}}` to inject
the client application as configured by `templates/client-config.js.mustache`.
PDFs may be dropped in as-is.

# Developing the client

Hypothesis is comprised of several components:

 - A browser-based web app for annotating web pages (this repository)
 - A service which stores annotations, user accounts and other data. By default
   the client uses the public service at [hypothes.is](https://hypothes.is).
 - A browser extension which can add the client to web pages.

In order to develop the client and test out changes you make locally, you will
need to use either the [browser
extension](https://github.com/hypothesis/browser-extension) or setup [a local
install of the Hypothesis
service](http://h.readthedocs.io/en/latest/developing/) to host the client.

## Prerequisites

You will need:

* [git](https://git-scm.com/)
* [Node.js](https://nodejs.org/en/) v6+

## Installation

To install the client for development:

```sh
git clone 'https://github.com/hypothesis/client.git'
cd client
sudo npm install -g gulp-cli
make
```

You now have a development client installed. To run your development client in
a browser you'll need a local copy of either the Hypothesis Chrome extension or
the Hypothesis web service. Follow either the instructions for
[Running the client from the browser extension](#running-the-client-from-the-browser-extension)
or for
[Running the client from the web service](#running-the-client-from-the-web-service)
below.
If you're only interested in making changes to the client (and not to the web
service) then running the client from the browser extension is easiest.

## Running the client from the browser extension

This is the currently easiest way to get your development client running in a
browser. It sets you up to make changes to the client and to the Chrome
extension itself, but not to the web service.

1. Check out the [browser
   extension](https://github.com/hypothesis/browser-extension) and follow the
   steps in the
   [README](https://github.com/hypothesis/browser-extension/blob/master/README.md)
   to make it use your local version of the client and the [production
   Hypothesis
   service](https://github.com/hypothesis/browser-extension/blob/master/docs/building.md).
1. Start the client's development server to rebuild the client whenever it
   changes:

    ```
    gulp watch
    ```

1. After making changes to the client, you will need to run `make` in the
   browser extension repo and reload the extension in Chrome to see changes.
   You can use [Extensions
   Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid?hl=en)
   to make this easier.

## Running the client from the web service

This takes longer to setup than
[Running the client from the browser extension](#running-the-client-from-the-browser-extension).
You should follow these steps if you want to make changes to the Hypothesis
web service as well as to the client.

Once you have a local install of the Hypothesis service set up, you can
configure it to use a local build of the client. In the client repository, run:

```sh
export H_SERVICE_URL=http://localhost:5000
gulp watch
```

The `H_SERVICE_URL` env var sets the URL of the service which hosts the HTML
entry point for the client's sidebar application.

In the `hypothesis/h` repository, set the `CLIENT_URL` env var to tell the
service where to load the client from, before running `make dev`:

```sh
export CLIENT_URL=http://localhost:3001/hypothesis
make dev
```

Once the client and service are running, you can test it out by visiting:
[http://localhost:3000](http://localhost:3000) or [the Help
page](http://localhost:5000/docs/help) in your browser.

You can also load the client into your own web pages by adding:

```html
<script async src="http://localhost:5000/embed.js"></script>
```

To the page's HTML. Note that this will only work in pages served via plain
HTTP.  If you want to test out the client on pages served via HTTPS then building
the client into a browser extension is the easiest option.

## Running tests

Hypothesis uses Karma and mocha for testing. To run all the tests once, run:

```sh
gulp test
```

To run tests and automatically re-run them whenever any source files change, run:

```sh
gulp test-watch
```

You can filter the tests which are run by passing `--grep <pattern>` as an
argument to `gulp test`. See the documentation for Mocha's
[grep](https://mochajs.org/#g---grep-pattern) option.


## Code style

### JavaScript

Hypothesis uses ESLint to help maintain style consistency. You can check your
changes for conformance using:

```
make lint
```

Many lint errors can be fixed automatically using:

```
./node_modules/.bin/eslint --fix
```

### CSS

Styling is authored in SASS. For guidance on writing CSS for Hypothesis
projects, please see our [CSS
Guide](https://github.com/hypothesis/frontend-toolkit/blob/master/docs/css-style-guide.md).

## Submitting pull requests

For general guidance on submitting pull requests to Hypothesis projects, please
see the [Contributor's Guide](https://h.readthedocs.io/en/latest/developing/).

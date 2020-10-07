Developing the Client
=====================

This section documents how to setup a development environment for the client,
how to run the client and its tests in a development environment,
client coding standards and how to contribute code to the client.

Setting up a Client Development Environment
-------------------------------------------

Prerequisites
#############

You will need:

* `git <https://git-scm.com/>`_
* `Node.js <https://nodejs.org/en/>`_ v12+
* `Yarn <https://yarnpkg.com/lang/en/>`_

Building
########

To build the client for development:

.. code-block:: sh

   git clone 'https://github.com/hypothesis/client.git'
   cd client
   make

You now have a development client built. There are three ways to run your
development client in a browser.

A. Through the Browser Extension connected to our hosted hypothesis h service.
B. Locally through the built-in express server connected to our hosted hypothesis h service.
C. Locally through the built-in express server connected to a local instance of the hypothesis h service.

If you're only interested in making changes to the client (and not to h)
then either **A** or **B** is the easiest.


.. _running-from-browser-ext:

A. Running the Client from the Browser Extension
---------------------------------------------

This is the currently easiest way to get your development client running in a
browser. It sets you up to make changes to the client and to the Chrome
extension itself, but not to h.

#. Check out the
   `browser extension <https://github.com/hypothesis/browser-extension>`_
   and follow the steps in the browser extension's documentation to build the
   extension and configure it to use your local version of the client and the
   production Hypothesis service.

#. Start the client's development server to rebuild the client whenever it
   changes:

    .. code-block:: sh

       make dev

#. After making changes to the client, you will need to run ``make`` in the
   browser extension repo and reload the extension in Chrome to see changes.
   You can use
   `Extensions Reloader <https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid?hl=en>`_
   to make this easier.

.. _running-from-hosted-h:

B. Running the Client Locally, Connected to Hosted h
---------------------------------------------

Method two is also easy and only requires some extra configuration in the client environment to
setup. You also do not need to clone the browser extension repository. Assuming you have cloned
the client repository, set the environment variable accordingly and run the local express
server as follows:

.. code-block:: sh

   export SIDEBAR_APP_URL=https://hypothes.is/app.html
   make dev

The express server will be reachable on http://localhost:3000 and should be connected to the
hosted h/ instance.

.. _running-from-h:

C. Running the Client Locally, Connected to a Local h
-------------------------

This takes longer to setup than :ref:`running-from-browser-ext`.
You should follow these steps if you want to make changes to h as well as to
the client.

First follow the `instructions for setting up a development install of h
<http://h.readthedocs.io/en/latest/developing/>`_. Then run both h and the
client at the same time in different shells. **In the client repository**, run:

.. code-block:: sh

   make dev

Then in a different shell, **in the h repository**, run:

.. code-block:: sh

   make dev

Once the client and h are running, you can test it out by visiting:
http://localhost:3000 or http://localhost:5000/docs/help in your browser.

You can also load the client into your own web pages by adding:

.. code-block:: html

   <script async src="http://localhost:5000/embed.js"></script>

to the page's HTML. Note that this will only work in pages served via plain
HTTP.  If you want to test out the client on pages served via HTTPS then building
the client into a browser extension is the easiest option.

Running the Tests
-----------------

Hypothesis uses Karma and mocha for testing. To run all the tests once, run:

.. code-block:: sh

   make test

You can filter the tests which are run by running ``make test FILTER=<pattern>``.
Only test files matching ``<pattern>`` will be executed.

To run tests and automatically re-run them whenever any source files change, run:

.. code-block:: sh

   make servetests

This command will also serve the tests on localhost (typically `http://localhost:9876`)
so that break points can be set and the browser's console can be used for interactive
debugging.


Code Style
----------

JavaScript
##########

Hypothesis uses ESLint_ (a linter) and Prettier_ (an automated code formatter)
to ensure style consistency and help prevent common mistakes. Plugins are
available for most editors for these tools. We recommend that you set these up
before making changes to the code.

To auto-format code and run lint checks locally using the CLI, run:

.. code-block:: sh

   make format
   make lint

.. _ESLint: https://eslint.org
.. _Prettier: https://prettier.io

CSS
###

Styling is authored in SASS. For guidance on writing CSS for Hypothesis
projects, please see our
`CSS Guide <https://github.com/hypothesis/frontend-toolkit/blob/master/docs/css-style-guide.md>`_.

Submitting Pull Requests
------------------------

For general guidance on submitting pull requests to Hypothesis projects, please
see the `Contributor's Guide <https://h.readthedocs.io/en/latest/developing/>`_.

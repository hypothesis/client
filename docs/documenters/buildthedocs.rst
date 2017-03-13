Building the Docs Locally
=========================

This documentation is hosted on `readthedocs <https://docs.readthedocs.io/>`_,
which is a documentation hosting site based on the
`Sphinx <http://www.sphinx-doc.org/>`_ documentation tool,
which in turn uses the `reStructuredText <http://www.sphinx-doc.org/en/stable/rest.html>`_
markup language.

This section will show you how to build and serve these docs locally, so that
you can make changes to `the documentation source files <https://github.com/hypothesis/client/tree/master/docs>`_
and preview those changes locally before sending a pull request.

You will need:

#. `Git <https://git-scm.com/>`_
#. `Python <https://www.python.org/>`_ 2.7 or 3.4+
#. `Virtualenv <https://virtualenv.pypa.io>`_
#. `Make <https://www.gnu.org/software/make/>`_

Once you've installed those, follow these steps in a terminal window to build
and serve the docs locally:

#. Checkout the https://github.com/hypothesis/client repo and ``cd`` into it:
   
   .. code-block:: sh
   
      git clone https://github.com/hypothesis/client.git
      cd client

#. Create and activate a Python virtual environment for the client
   documentation:

   .. code-block:: sh

      virtualenv .venv
      source .venv/bin/activate

#. Install the Python modules needed to build and serve the docs:
   
   .. code-block:: sh

      pip install -r requirements-dev.in

#. Build and serve the docs:
   
   .. code-block:: sh
   
      make docs

Now open http://localhost:8888 to view your local build of the docs.
As long as ``make docs`` is running the built docs will automatically update
when you save changes to the source files.

If you've closed your terminal window and then you want to build and serve the
docs again in the future, you don't need to install everything again.
You just need to ``cd`` into the ``client`` directory, activate the virtualenv
(``source .venv/bin/activate``) and then run
``make docs``.

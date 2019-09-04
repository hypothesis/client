Building the Docs Locally
=========================

The Hypothesis client's documentation is hosted at https://h.readthedocs.io/projects/client/.
The docs are built using https://readthedocs.org.
This page will show you how to build the docs locally, so you can preview
changes to the documentation locally before sending a pull request.

You Will Need
-------------

* `Git <https://git-scm.com/>`_

* `pyenv <https://github.com/pyenv/pyenv>`_

  Follow the instructions in the pyenv README to install it.
  The Homebrew method works best on macOS.

Clone the Git Repo
------------------

If you haven't already, use ``git clone`` to make a local copy of the client
repo::

    git clone https://github.com/hypothesis/client.git

This will download the code into a ``client`` directory in your current working
directory. You need to be in the ``client`` directory for the remainder of the
installation process::

    cd client

Build the Docs
--------------

::

    make docs

This will build the docs and serve them locally on port 8000.
Open http://localhost:8000/ to preview the docs.
When you make changes to the files in the ``docs/`` folder the preview will
update automatically.

The first time you run ``make docs`` it might take a while to start because it
might need to install Python, and it'll need to create a Python virtualenv and
install the Python packages needed to build the docs into it.

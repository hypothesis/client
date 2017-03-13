Building the Docs Locally
=========================

You will need:

#. Git
#. Python and Virtualenv
#. Make

To build the docs:

#. ``git clone https://github.com/hypothesis/client.git``
#. ``cd client``
#. Create and activate a Python virtual environment.
#. ``pip install -r requirements-dev.in``
#. ``make docs``

Now open http://localhost:8888 to view your local build of the docs.
The built docs will automatically update when you save changes to the source
files.

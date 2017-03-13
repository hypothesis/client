Configuring the Client
======================

This page documents the configuration settings that you can use to configure
the Hypothesis client once it's embedded in your website.

Configuring the Client Using JSON
---------------------------------

The Hypothesis client can be configured by providing a JSON config object in
the body of the hosting page:

.. code-block:: html

   <script type="application/json" class="js-hypothesis-config">
     {
       "openSidebar": true
     }
   </script>
   <script async src="https://hypothes.is/embed.js"></script>

Not all configuration settings can be set in this way, some must be
:ref:`set using JavaScript <configuring-with-js>` (see below).

.. note::

   The body of the ``.js-hypothesis-config`` tag must be
   `valid JSON <http://jsonlint.com/>`_, invalid JSON will cause the entire
   config object to be ignored.

.. _configuring-with-js:

Configuring the Client Using JavaScript
---------------------------------------

.. js:function:: window.hypothesisConfig()

   Alternatively, the Hypothesis client can be configured from the hosting page
   by providing a JavaScript function named :js:func:`window.hypothesisConfig`
   that returns a configuration object. Some configuration settings (for
   example settings that register callback or event handler functions) can
   *only* be set from JavaScript:

   .. code-block:: javascript

      window.hypothesisConfig = function () {
        return {
          "openSidebar": true
        };
      };

Config Settings
---------------

Client Behavior
###############

These settings configure the behavior and initial state of the client when it
loads.

.. option:: openLoginForm

   ``Boolean``. Controls whether the login panel is automatically opened on
   startup, as if the user had clicked "Log in" themselves.
   (Default: ``false``.)

.. option:: openSidebar

   ``Boolean``. Controls whether the sidebar opens automatically on startup.
   (Default: ``false``.)

.. option:: showHighlights

   ``Boolean``. Controls whether the in-document highlights are shown by default.
   (Default: ``true``.)

.. option:: services

   ``Array``. A list of alternative annotation services which the client should
   connect to instead of connecting to the public Hypothesis service at
   `hypothes.is <https://hypothes.is/>`_. May optionally include information
   (in the form of grant tokens) about user accounts that the client is logged
   in to on those services.

   For example:

   .. code-block:: javascript

      window.hypothesisConfig = function () {
        return {
          services: [{
            authority: 'partner.org',
            grantToken: '***',
            icon: 'https://openclipart.org/download/272629/sihouette-animaux-10.svg'
          }],
        };
      };

   By default, if no :option:`services` setting is given, the client connects
   to the public Hypothesis service at `hypothes.is <https://hypothes.is/>`_.

   .. warning::

      The :option:`services` setting is currently still experimental and may
      change in the future.

   .. note::

      Currently only one additional annotation service is supported - only the
      first item in this :option:`services` array is used, and any further
      items in the array are ignored.

   Each item in the :option:`services` array should be an object describing an
   annotation service, with the following keys:

   .. option:: authority
   
      ``String``. The domain name which the annotation service is associated with.

   .. option:: grantToken
   
      ``String|null``. An OAuth 2 grant token which the client can send to the
      service in order to get an access token for making authenticated requests
      to the service. If ``null``, the user will not be logged in and will only
      be able to read rather than create or modify annotations. (Default:
      ``null``)

      .. seealso::

         :ref:`Generating authorization grant tokens` for how to generate grant
         tokens for the `hypothes.is <https://hypothes.is/>`_ service.

   .. option:: icon
   
      ``String|null``. The URL to an image for the annotation service. This
      image will appear to the left of the name of the currently selected
      group. The image should be suitable for display at 16x16px and the
      recommended format is SVG.

   .. option:: onLoginRequest
   
     ``function``. A JavaScript function that the Hypothesis client will
     call in order to login (for example, when the user clicks a login button in
     the Hypothesis client's sidebar).

     This setting can only be set using :js:func:`window.hypothesisConfig`.

     If the hosting page provides an :option:`onLoginRequest` function then the
     Hypothesis client will call this function instead of doing its usual
     procedure for logging in to the public service at `hypothes.is
     <https://hypothes.is/>`_.

     No arguments are passed to the :option:`onLoginRequest` function.

     The :option:`onLoginRequest` function should cause a login procedure for
     the hosting page to be performed - for example by redirecting to a login
     page, or by opening a popup login window. After a successful login the
     hosting page should reload the original page with a non-null
     :option:`grantToken` for the logged-in user in the :option:`services`
     configuration setting.

Asset and Sidebar App Location
##############################

These settings configure where the client's assets are loaded from.

.. warning::

   These settings are currently still experimental and may change in the future.

.. option:: assetRoot

   ``String``. The root URL from which assets are loaded. This should be set to
   the URL where the contents of the hypothesis package are hosted, including
   the trailing slash. (Default: for production builds:
   ``"https://cdn.hypothes.is/hypothesis/X.Y.Z/"``, for development builds:
   ``"http://localhost:3001/hypothesis/X.Y.Z/""`.
   ``X.Y.Z`` is the package version from ``package.json``).

.. option:: sidebarAppUrl

   ``String``. The URL for the sidebar application which displays annotations
   (Default: ``"https://hypothes.is/app.html"``).

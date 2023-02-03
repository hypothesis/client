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

.. option:: openSidebar

   ``Boolean``. Controls whether the sidebar opens automatically on startup.
   (Default: ``false``.)

.. option:: showHighlights

   ``String|Boolean``. Controls whether the in-document highlights are shown by default.
   (Default: ``"always"``).

   ``true`` or ``"always"`` - Highlights are always shown by default.

   ``false`` or ``"never"`` - Highlights are never shown by default, the user must explicitly
   enable them.

   ``"whenSidebarOpen"`` - Highlights are only shown when the sidebar is open.

   .. warning::

      The "always", "never" and "whenSidebarOpen" values are currently still
      experimental and may change in future. ``true`` and ``false`` values
      are the stable API.

.. option:: theme

   ``String``. Controls the overall look of the sidebar.(Default: ``classic``).

   ``"classic"`` - Enables the card view for annotations, the bucket bar, the sidebar minimize
   button, the highlights button and the new note button in the toolbar. It also disables the
   close button in the toolbar. The classic theme is enabled by default.

   ``"clean"`` - Enables the clean view for annotations in the sidebar, disables the bucket bar,
   the sidebar minimize button, the highlights button and the new note button in the toolbar and enables the
   close button in the toolbar. It will also show a cleaner and more minimal onboarding tutorial.

.. option:: enableExperimentalNewNoteButton

   ``Boolean`` - Controls whether the experimental New Note button should be shown in the
   notes tab in the sidebar. (Default: ``false``).

   ``true`` - The button is shown.

   ``false`` - The button is not shown.

.. option:: usernameUrl

   ``String``. This allows you to specify a URL to direct a user to, in a new tab when they
   click on the annotation author link in the header of an annotation. The username is appended to the end
   of `usernameUrl`.

   For example:

   .. code-block:: javascript

      window.hypothesisConfig = function () {
        return {
          usernameUrl: 'https://partner.org/user/',
        };
      };

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
            apiUrl: 'https://hypothes.is/api/',
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
   annotation service.

   Required keys:

   .. option:: apiUrl

      ``String``. The base URL of the service API.

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

  Optional keys:

   .. option:: allowLeavingGroups
      
      ``boolean``. A flag indicating whether users should be able to leave groups 
      of which they are a member. When `false`, the controls for users to leave
      groups will not be provided. (Default: `true`).

   .. option:: enableShareLinks

      ``boolean``. A flag indicating whether annotation cards should show links
      that take the user to see an annotation in context. (Default: ``true``).

   .. option:: groups

      ``String[]|"$rpc:requestGroups"|null``. An array of Group IDs or the literal 
      string ``"$rpc:requestGroups"``. If provided, only these groups will be fetched 
      and displayed in the client. This is used, for example, in the Hypothesis LMS app 
      to show only the groups appropriate for a user looking at a particular assignment.

      .. note::

        The value ``"$rpc:requestGroups"`` indicates that a list of group IDs to 
        fetch should be provided to the client by an ancestor iframe. This can 
        be useful if the list of appropriate groups is not available at initial 
        load time. The client will send an asynchronous **RPC** request (``requestGroups``) 
        via postMessage to the target frame configured in :option:`requestConfigFromFrame`. 
        The listening frame should respond with an array of group IDs (or ``null``).
        :option:`requestConfigFromFrame` config object must also be present for this 
        to be enabled.

   .. option:: icon

      ``String|null``. The URL to an image for the annotation service. This
      image will appear to the left of the name of the currently selected
      group. The image should be suitable for display at 16x16px and the
      recommended format is SVG.

   .. option:: onLoginRequest

     ``function``. A JavaScript function that the Hypothesis client will
     call in order to log in (for example, when the user clicks a log in button in
     the Hypothesis client's sidebar).

     This setting can only be set using :js:func:`window.hypothesisConfig`.

     If the hosting page provides an :option:`onLoginRequest` function then the
     Hypothesis client will call this function instead of doing its usual
     procedure for logging in to the public service at `hypothes.is
     <https://hypothes.is/>`_.

     No arguments are passed to the :option:`onLoginRequest` function.

     The :option:`onLoginRequest` function should cause a log in procedure for
     the hosting page to be performed - for example by redirecting to a log in
     page, or by opening a popup log in window. After a successful log in the
     hosting page should reload the original page with a non-null
     :option:`grantToken` for the logged-in user in the :option:`services`
     configuration setting.

   .. option:: onLogoutRequest

     ``function``. A JavaScript function that the Hypothesis client will
     call in order to log out (for example, when the user clicks a log out
     button in the Hypothesis client's sidebar).

     This setting can only be set using :js:func:`window.hypothesisConfig`.

     If the hosting page provides an :option:`onLogoutRequest` function then
     the Hypothesis client will call this function instead of doing its usual
     procedure for logging out of the public service at
     `hypothes.is <https://hypothes.is/>`_.

     No arguments are passed to the :option:`onLogoutRequest` function.

     The :option:`onLogoutRequest` function should cause a log out procedure
     for the hosting page to be performed. After a successful log out the
     hosting page should reload the original page with no :option:`grantToken`
     in the :option:`services` configuration setting.

   .. option:: onSignupRequest

     ``function``. A JavaScript function that will be called when the user clicks
     the "Sign up" link in the sidebar. No arguments are passed and the return
     value is unused.

     This setting can only be set using :js:func:`window.hypothesisConfig`.

   .. option:: onProfileRequest

     ``function``. A JavaScript function that will be called when the user clicks
     the user profile (user name) link in the sidebar. No arguments are passed
     and the return value is unused.

     This setting can only be set using :js:func:`window.hypothesisConfig`.

   .. option:: onHelpRequest

     ``function``. A JavaScript function that will be called when the user clicks
     the "Help" link in the sidebar. No arguments are passed and the return
     value is unused.

     This setting can only be set using :js:func:`window.hypothesisConfig`.

.. option:: branding

  Branding lets you adjust certain aspects of the sidebar's look and feel to better fit your site's own look.

  ``Object``. The key-value pairings used to identify how the brandable elements
  in the sidebar should be presented. The allowed keys will be described below. The values
  will be directly mapped to the css styles for the elements which it affects. That means
  any valid css property for the specified type will work. For example, if the value type is a
  Color, you can specify any browser supported color value (hex, rgb, rgba, etc.).

  For example:

  .. code-block:: javascript

     window.hypothesisConfig = function () {
       return {
         branding: {
           appBackgroundColor: 'white',
           ctaBackgroundColor: 'rgba(3, 11, 16, 1)',
           ctaTextColor: '#eee',
           selectionFontFamily: 'helvetica, arial, sans serif'
         }
       };
     };


  The following keys are supported in the :option:`branding` object.
  You will also see what value type we are expecting.

  .. warning::

     The :option:`branding` setting is currently still experimental and may
     change in the future.

  .. option:: accentColor

    ``Color``. We have several areas in our client that have pops of color
    that are secondary to the primary call to action elements. Things such as
    the "more" and "less" links to expand and collapse large annotation bodies.

  .. option:: appBackgroundColor

    ``Color``. This will update the main background color of our app.

  .. option:: ctaBackgroundColor

    ``Color``. This will update the main call-to-action button backgrounds. A
    call-to-action button example would be our "Post to {Group Name}" button when making
    an annotation.

  .. option:: ctaTextColor

    ``Color``. This will update the text color inside of the call-to-action buttons.

  .. option:: selectionFontFamily

    ``Font Family``. The selection text is the part of the annotation card that reflects
    what the user highlighted when they made the annotation. This value will update
    the font-family of that text.

  .. option:: annotationFontFamily

    ``Font Family``. The annotation text is the actual annotation value that the
    user writes about the page or selection. This value will set the font-family
    of that text when it is being viewed as well as the font-family of the
    editor as the annotation is being written.

.. option:: onLayoutChange

  ``function``. This function will be a registered callback to be invoked when the sidebar
  layout changes. Changes to the layout occur on load, when the sidebar is toggled to
  show and hide, and when the user adjusts the sidebar manually.

  This setting can only be set using :js:func:`window.hypothesisConfig`.

  When a layout change happens the registered :option:`onLayoutChange` function will
  receive a single ``Object`` as it's argument. This object details the layout parameters
  after the change.

  Layout object available fields:

  .. option:: expanded

    ``Boolean``. If the sidebar is open, this value will be true.

  .. option:: height

    ``Number``. The current visible height of the sidebar.

  .. option:: width

    ``Number``. The current visible width of the sidebar.

.. option:: externalContainerSelector

  ``string``. A CSS selector specifying the containing element into which the
  sidebar iframe will be placed.

  This option provides the publisher with more control over where the sidebar
  is displayed on the screen and how and when it appears and disappears.

  When this option is not specified, Hypothesis chooses where to place the
  sidebar, typically on the right side of the page, and provides the user with
  controls to open and close it.

  When this option is specified, the sidebar will be created and placed inside
  the specified element. Hypothesis will not display its own controls for
  opening and closing the sidebar and will not display the "bucket bar" showing
  where annotations are located on the page relative to the current scroll
  position.

  .. warning::

    The :option:`externalContainerSelector` 
    setting is currently still experimental and may change in the future.

.. option:: focus

  ``Object``. A structured object that defines a focused filter set for the available 
  annotations on a page. When this object is passed to the config, the sidebar will add 
  a UI button element that the user can toggle on or off to apply the filtered set of 
  annotations defined by this ``focus`` object. This structure may define a particular 
  ``user`` to focus on. Currently, only the ``user`` type is supported, but others may 
  be added later.

  .. note::
    The focus ``user`` is not necessarily the same user viewing the sidebar.

  For example:

  .. code-block:: javascript
    
    window.hypothesisConfig = function () {
      return {
        focus: {
          user: {
            // required (username or userid)
            username: "foobar1234",
            userid: 'acct:foobar1234@domain',
            // optional
            displayName: "Foo Bar",
          }
        }
      };
    };
  .. warning::

    The :option:`focus`
    setting is currently still experimental and may change in the future.

.. option:: requestConfigFromFrame


  ``Object``. 
  An object with configuration information about an ancestor iframe that should be able 
  to receive and send **RPC** messages from/to the client.
  
  .. code-block:: javascript
    
    requestConfigFromFrame: {
      origin: `hostname:8000` // Host url and port number of receiving iframe
      ancestorLevel: '2'      // Number of nested iframes deep the client is
                              // relative from the receiving iframe.
    }

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

   ``String``. The URL for the sidebar application (Default: ``"https://hypothes.is/app.html"``).

.. option:: notebookAppUrl

   ``String``. The URL for the notebook application (Default: ``"https://hypothes.is/notebook"``).

.. option:: profileAppUrl

   ``String``. The URL for the user profile application (Default: ``"https://hypothes.is/user-profile"``).

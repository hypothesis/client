Environment Variables
=====================

This section documents all the environment variables supported by the client's
build tasks.

.. envvar:: NOTEBOOK_APP_URL

   The default value for the :option:`notebookAppUrl` config setting (the URL of
   the notebook app's iframe).
   ``https://hypothes.is/notebook`` by default.

.. envvar:: PROFILE_APP_URL

   The default value for the :option:`profileAppUrl` config setting (the URL of
   the user profile iframe), used when the host page does not contain a
   :option:`profileAppUrl` setting.
   ``https://hypothes.is/user-profile`` by default.

.. envvar:: SIDEBAR_APP_URL

   The default value for the :option:`sidebarAppUrl` config setting (the URL of
   the sidebar app's iframe), used when the host page does not contain a
   :option:`sidebarAppUrl` setting.
   ``https://hypothes.is/app.html`` by default.

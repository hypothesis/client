Mobile Development
==================

Testing the Client on a Mobile Device
-------------------------------------

If you have made changes to the client that could affect the mobile experience,
it is a good idea to test them on a real device. Such changes should ideally be
tested with at least current versions of iOS Safari and Chrome for Android.

#. Make sure your development system and mobile device are on the same local
   network.

#. Configure h to allow incoming connections from other systems
   by editing ``conf/development-app.ini`` and changing the ``host`` setting from
   ``localhost`` to ``0.0.0.0``.

#. Get the hostname of your development system (``<HOSTNAME>``
   in the steps below). You can do this using the ``hostname`` terminal command on
   macOS/Linux.

   On macOS, this will typically be something like "Bobs-MacBookPro.local".

   .. tip::

      If the output of ``hostname`` does not include a ``.home`` or ``.local``
      suffix, you may need to append ``.local`` to get a hostname that is
      accessible from other devices on the network. If you have problems using
      the hostname, try using the IP address instead.

#. Set the :envvar:`CLIENT_URL` environment variable to configure h
   to load the client from this host and start the dev server:

   .. code-block:: sh

      # In the h repository

      # Configure the URL that the client is loaded from in pages
      # that embed Hypothesis
      export CLIENT_URL=http://<HOSTNAME>:3001/hypothesis

      make dev

#. Make sure the "Redirect URL" of the OAuth client associated with your
   development client matches `<HOSTNAME>`. You can configure the OAuth clients
   registered with h at http://localhost:5000/admin/oauthclients.

   This step is necessary to make logging into the client work.

#. On your mobile device, go to a page which has the client embedded such as
   ``http://<HOSTNAME>:3000`` or ``http://<HOSTNAME>:5000/docs/help``.

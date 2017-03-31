# Mobile Development

## Testing the client on a mobile device

If you have made changes to the client that could affect the mobile experience, it is a good idea to test them on a real device. Such changes should ideally be tested with at least current versions of iOS Safari and Chrome for Android.

1. Make sure your development system and mobile device are on the same local network.
1. Get the IP address or host name of your development system (`$HOSTNAME` in the steps below). You can do this using the `hostname` terminal command on Mac/Linux.
1. Configure the "h" service to allow incoming connections from other systems by editing `conf/development-app.ini` and changing the `host` setting from `localhost` to `0.0.0.0`.
1. Configure the "h" service to load the client from this host and start the dev
   server:
   ```sh
   # In the "h" repository

   # Configure the URL that the client is loaded from in pages
   # that embed Hypothesis
   export CLIENT_URL=http://$HOSTNAME:3001/hypothesis

   make dev
   ```
1. Configure the client to load assets from this hostname and start the dev
   server:
   ```sh
   # In the "client" repository

   # Set URL which sidebar app ("app.html") is loaded from
   export H_SERVICE_URL=http://$HOSTNAME:5000
   # Set hostname used when generating client asset URLs
   export PACKAGE_SERVER_HOSTNAME=$HOSTNAME

   gulp watch
   ```
   When `gulp watch` runs, it will print out the URLs used for the "h" service and client assets. These should include `$HOSTNAME` instead of `localhost`.
1. On your mobile device, go to a page which has the client embedded such as `http://$HOSTNAME:3000` or `http://$HOSTNAME:5000/docs/help`.

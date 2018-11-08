# embedding-examples

This directory contains test pages / demos for different ways of embedding and
configuring the Hypothesis client.

The examples are designed to be used with a local instance of h at
http://localhost:5000. If you want to use them with the public Hypothesis
service, change the origin in [client.js][].

## Usage

1. Run the local client and h service, or edit [client.js][] and change the
   origin to `https://hypothes.is`.

2. Start a web server in this directory:

   ```
   python3 -m http.server 8000
   ```

   Then browse to <http://localhost:8000/>

[client.js]: client.js

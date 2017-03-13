Client Security
===============

This document is intended to give an overview of the security considerations
which must be kept in mind when working on the Hypothesis client. It outlines
the overall security goals for the client, names some risks and attack vectors,
and identifies ways in which code in the client attempts to mitigate those
risks.

.. environment-overview:

Environment Overview
--------------------

The Hypothesis client is a
`single-page web application <https://en.wikipedia.org/wiki/Single-page_application>`_
which runs in a browser. Typically, it interacts with some annotated content
(the page on which annotations are made) and an annotation service running on a
remote server.

At different times, users interact directly with the client, with the annotated
content, and with the annotation service. Data can flow in both directions: from
the annotated content to the client and vice versa. Communication with the
annotation service is also bidirectional, making use of an HTTP API and a
WebSocket connection:

.. code::

                   .─.
                  (   )
                 .─`─'─.
                ; User  :
          ┌─────:       ;──────┬────────────────────┐
          │      \     /       │                    │
          │       `───'        │                    │
          │                    │                    │
          v                    v                    v
   ┌────────────┐   *   ╔════════════╗       ┌────────────┐
   │            │   *   ║            ║       │            │
   │            │   *   ║            ║ HTTP  │            │
   │ Annotated  │──────>║   Client   ║──────>│ Annotation │
   │  content   │<──────║            ║<──────│  service   │
   │            │   *   ║            ║  WS   │            │
   │            │   *   ║            ║       │            │
   └────────────┘   *   ╚════════════╝       └────────────┘

There are two important trust boundaries in this system:

1. Between the client code, executing in a browser, and the service, executing
   on a remote server.
2. Between the annotated content (which may be an HTML page or a PDF rendered as
   an HTML page) and the client application. This boundary is marked with
   asterisks (``*``) in the ASCII art above.


Threat Model
------------

We are principally interested in ensuring that untrusted parties cannot gain
access to data that is intended to be confidential, or tamper with such data
when it is in transit. Protected data might include:

- user credentials
- annotation data or metadata which is displayed by the client
- user profile information
- group membership records
- user search history

We must assume that the user has a baseline level of trust in:

1. their browser software (and the platform it runs on)
2. our client software
3. the annotation service
4. any 3rd-party account provider mediating access to the annotation service
   (e.g. Google, Facebook, etc.)

Any other parties are considered untrusted. Untrusted actors thus include any
and all of the following:

- the publishers of arbitrary web pages (including annotated content)
- advertisers or other 3rd-party contributors to arbitrary web pages (including
  annotated content)
- other users of the annotation service who have not been explicitly designated
  as trusted (through group membership, for example)
- members of the public who don't use the annotation service
- active attackers

We aim to defend confidential user data against any possibility of unauthorised
access.

Potential Attack Vectors
------------------------

The mechanisms of directed attack we are aiming to defend against are common to
many web applications, namely:

- execution of untrusted code in a trusted context (principally by
  `XSS <https://en.wikipedia.org/wiki/Cross-site_scripting>`_)
- `clickjacking <https://en.wikipedia.org/wiki/Clickjacking>`_
- phishing/imitation attacks
- eavesdropping of unencrypted network traffic by an untrusted party
- to a limited extent,
  `cross-site request forgery <https://en.wikipedia.org/wiki/Cross-site_request_forgery>`_,
  although this is mostly a concern for the annotation service

Design Considerations and Defenses
----------------------------------

Same-Origin Policy Protections
##############################

The starting point for understanding many of the client-side security mechanisms
is the web platform's
`same-origin policy <https://en.wikipedia.org/wiki/Same-origin_policy>`_ (SOP),
which ensures that any document on origin [#f1]_ "A" has very limited access to
the execution context or DOM tree of any document on a different origin "B".

.. _security-sop:

.. figure:: security-sop.png

   Distinct origins for annotated content and client application

As shown in :numref:`security-sop`, the bulk of the Hypothesis client application
executes within an ``<iframe>`` injected into the annotated content. This
``<iframe>`` has an origin distinct from that of the hosting page, which means
that most of the protections of the SOP apply. Most importantly, code executing
in the context of the annotated page cannot inspect the DOM of the client
frame. The red border in the image is a visual representation of the trust
boundary between the inherently untrusted execution context of the annotated
page, and the trusted execution context of the client frame.

Instead, the components of the client which execute in the annotated page must
communicate with the client frame using
`cross-document messaging <https://en.wikipedia.org/wiki/Web_Messaging>`_.
It is important that such **cross-document messaging should expose only the
minimum information necessary about user data** to code executing in the
annotated page. For example: in order to draw highlights, the annotated page
needs to know the location of annotations, but it does not ever need to know
the body text of an an annotation, and so it should not be possible to expose
this over the messaging interface.

.. todo:: 2017-03-08

   Currently the client shares an origin with the annotation service when
   delivered by any mechanism other than the Chrome extension. This makes any
   XSS vulnerability in the client a problem for the service and vice versa. We
   need to move the client to its own origin to better isolate the client from
   the service and minimise the risk posed by XSS.

Input Sanitization
##################

As alluded to above, the client frame is a trusted execution context. Any code
running there has full access to everything the user has access to, which may
constitute a major security flaw if that code was provided by another user (say,
as a ``<script>`` tag in the body of an annotation).

This is an example of a cross-site scripting attack (XSS) and must be mediated
by ensuring that **any and all user content displayed in the client frame is
appropriately escaped and/or sanitised**.

Transport Layer Security
########################

We ensure that it is hard to eavesdrop on traffic between the client and the
annotation service by communicating with the annotation service over encrypted
channels (``https://`` and ``wss://``).

.. todo:: 2017-03-08

   This is not currently enforced by the client. Perhaps production builds of
   the client should refuse to communicate with annotation services over
   insecure channels?

Clickjacking Protections
########################

The most straightforward way to protect an application from most kinds of
clickjacking is the
`frame-ancestors Content-Security-Policy directive <https://w3c.github.io/webappsec-csp/#directive-frame-ancestors>`_
or the older
`X-Frame-Options HTTP Header <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options>`_.

Unfortunately, the client runs in a framed context (and on arbitrary origins) by
default, so simply applying ``X-Frame-Options: DENY`` would break the client
entirely.

.. todo:: 2017-03-08

   The Hypothesis client would appear to have very little protection against
   clickjacking attacks that allow arbitrary websites to trick Hypothesis users
   into performing actions they did not intend to perform. It's not immediately
   clear what tools we have at our disposal to solve this problem.

Phishing/Imitation
##################

At the moment there is little that would stop a website embedding a replica of
the Hypothesis client in a frame and using it to harvest Hypothesis users'
usernames and passwords.

.. todo:: 2017-03-08

   Direct credential input must move to a first-party interaction (i.e. a popup
   window) where the user has the benefit of the browser toolbar to help them
   identify phishing attacks.

.. rubric:: Footnotes

.. [#f1] An origin is the tuple of (scheme, host, port) for a given web document.

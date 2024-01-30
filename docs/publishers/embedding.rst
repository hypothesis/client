.. _embedding:

How to Add Hypothesis to Your Website
=====================================

.. If you update this page, please ensure you update the "For Publishers" page
   on the Hypothesis website, or coordinate with someone who can
   (https://hypothes.is/for-publishers/).

To add Hypothesis to your website, just add this one line to the HTML source of
each page that you want to have the Hypothesis client on:

.. code-block:: html

   <script src="https://hypothes.is/embed.js" async></script>


Enabling annotation of iframed content
--------------------------------------

The simplest way to support annotation of iframed content is to add the
above script tag to the document displayed in the iframe. This will display the
sidebar in the iframe itself.

Additionally Hypothesis has limited support for enabling annotation of iframed
content while showing the sidebar in the top-level document where Hypothesis
was initially loaded. To use this:

1. Add the above script tag to the top-level document

2. Do not add the script tag to the iframed documents themselves, the client
   will do this itself.

3. Opt iframes into annotation by adding the "enable-annotation" attribute:

.. code-block:: html

   <iframe enable-annotation>
   ...
   </iframe>

This method *only* works for iframes which are direct children of the top-level
document and have the same origin.

The client will watch for new iframes being added to the document and will
automatically enable annotation for them.


Clipboard permissions when loaded in an iframe
----------------------------------------------

There are a few places in the sidebar where the user can copy content to the
clipboard, such as exporting or copying links to annotations.

This functionality uses the browser's
`Clipboard API <https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API>`_,
which requires allowing the ``clipboard-write`` permission in Chrome (but not
Safari or Firefox).

When loading the sidebar in the top-level document, this will work automatically
but if you load Hypothesis inside an iframe, you will need to add an ``allow``
attribute with the right permissions.

.. code-block:: html

   <iframe allow="clipboard-write">
     <!-- Hypothesis is loaded here -->
   </iframe>

If these permissions are not available, the corresponding functionality in
Hypothesis will either be unavailable or will fail with an error when used.

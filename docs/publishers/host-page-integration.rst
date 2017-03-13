Interacting with the Client
===========================

This page documents the ways in which your website can interact with the
Hypothesis client, once the client is embedded in your site.

.. option:: data-hypothesis-trigger

   You can add a button to your page that opens the Hypothesis sidebar.

   If you need to have a custom trigger on your third party page to bring up
   the embedded Hypothesis sidebar, add the :option:`data-hypothesis-trigger`
   attribute to the element that you want to enable.  Clicking that element
   will cause the sidebar to open.  Note, however, subsequent clicks do not
   hide the sidebar.

   For example to add a ``<button>`` on a page to open the sidebar, simply
   add the :option:`data-hypothesis-trigger` attribute:

   .. code-block:: html

      <button data-hypothesis-trigger>
        Open sidebar
      </button>

.. option:: data-hypothesis-annotation-count

   You can add a count of the number of annotations to your page.

   If you need to show the total number of public annotations, page notes and
   orphaned annotations on your third party page where the Hypothesis client
   is embedded, add the :option:`data-hypothesis-annotation-count` attribute to
   the element that you want to enable.  The contents of the enabled element
   will be replaced with the count of public annotations and if there are no
   public annotations, with 0.

   For example to display the annotation count in a ``<div>`` element, simply
   add the :option:`data-hypothesis-annotation-count` attribute to the
   ``<div>``:

   .. code-block:: html

      <div data-hypothesis-annotation-count>
        Annotation count will appear here
      </div>

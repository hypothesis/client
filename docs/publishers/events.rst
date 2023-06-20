Events
======

The Hypothesis client emits custom DOM events at ``document.body``, to which your app can react.

They extend `CustomEvent <https://developer.mozilla.org/docs/Web/API/CustomEvent>`_, so their payload can be found inside the ``detail`` property.

.. option:: hypothesis:layoutchange

   This event is emitted when the sidebar layout changes. eg. when it is opened or closed.

Properties
----------

.. option:: sidebarLayout

  .. option:: expanded

     ``Boolean`` True if the sidebar is open

  .. option:: width

     ``Number`` The width of the sidebar in pixels

  .. option:: height

     ``Number`` The height of the sidebar in pixels

.. option:: sideBySideActive

  ``Boolean`` Indicates whether side-by-side mode is active

.. code-block:: javascript

    document.body.addEventListener('hypothesis:layoutchange', event => {
      console.log(event.detail.sidebarLayout.expanded);
      console.log(event.detail.sidebarLayout.width);
      console.log(event.detail.sidebarLayout.height);
      console.log(event.detail.sideBySideActive);
    });

.. note::

  `See also "onLayoutChange" </publishers/config/#cmdoption-arg-onLayoutChange>`_ function, for an alternative way
  to make your app programmatically react to layout changes.

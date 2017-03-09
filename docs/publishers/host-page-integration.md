# Interacting with the sidebar

## Show the sidebar:

If you need to have a custom trigger on your third party page to bring up the embedded Hypothesis
sidebar, add the `data-hypothesis-trigger` attribute to the element that you want to enable.
Clicking that element will cause the sidebar to open.
Note, however, subsequent clicks do not hide the sidebar.

Example:

To add a `button` on a page to open the sidebar, simply
add the `data-hypothesis-trigger` attribute.

```html
<button data-hypothesis-trigger>
  Open sidebar
</button>
```

## Show the public annotation count:

If you need to show the total number of public annotations, page notes and orphaned annotations
on your third party page where the Hypothesis sidebar is embedded, add the `data-hypothesis-annotation-count`
attribute to the element that you want to enable.
The contents of the enabled element will be replaced with the count of public annotations and if there are no
public annotations, with 0.

Example:

To display the annotation count in a `div` element, simply
add the `data-hypothesis-annotation-count` attribute to the `div`:

```html
<div data-hypothesis-annotation-count>
  Annotation count will appear here
</div>
```

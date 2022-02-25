# Styling components in the client application

This application is transitioning how CSS styling is applied.

- OLD: BEM-structured SASS, using mixins, partials and variables
- NEW: Utility-first styling in components using Tailwind

At present, you'll see a mix of legacy SASS and Tailwind. The task at hand is to finish converting legacy styles and assuring that new styling follows the structure outlined here.

- Reference [Tailwind documentation](https://tailwindcss.com/docs/installation).
- Components should use Tailwind utility classes in source JSX — exclusively, where possible.
- External CSS, where needed, should be put into the Tailwind `components` layer and use `@apply` directives to reference applicable utility classes. See the `Buckets` annotator component and its styles for examples.
- Tailwind is configured by this project's `tailwind.config.js`, which extends the [Tailwind preset provided by the `@hypothesis/frontend-shared` package](https://github.com/hypothesis/frontend-shared/blob/main/src/tailwind.preset.js) This configuration determines what utility classes are available. Add new needed Tailwind configuration properties as needed[^1] and consider extracting common properties to the `frontend-shared` package.
- Check for unused SASS variables and mixins — and remove them.

What we're aiming for at the end of this conversion process:

- No SASS variables or mixins
- External CSS minimal and within appropriate Tailwind layers

[^1]: You will need to restart the local dev server after making configuration changes

# Shared resources for Hypothesis front-end applications

A package of resources for Hypothesis front-end applications.

#### Requirements

- preact
- browserify

### Usage

```
$ npm install @hypothesis/frontend-shared --save
```

#### In SASS modules

```sass
@use "@hypothesis/frontend-shared/styles/mixins" as mixins;
```

#### In JS

```js
import { SvgIcon } from '@hypothesis/frontend-shared';
```

License
-------

The Hypothesis client is released under the [2-Clause BSD License][bsd2c],
sometimes referred to as the "Simplified BSD License". Some third-party
components are included. They are subject to their own licenses. All of the
license information can be found in the included [LICENSE][license] file.

[bsd2c]: http://www.opensource.org/licenses/BSD-2-Clause
[license]: https://github.com/hypothesis/client/blob/master/LICENSE

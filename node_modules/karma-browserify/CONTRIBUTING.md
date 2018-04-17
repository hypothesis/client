# How to contribute

We love you to contribute to this project by filing bugs or helping others on the [issue tracker](https://github.com/Nikku/karma-browserify/issues) or by contributing features/bug fixes through pull requests.

## Working with issues

We use our [issue tracker](https://github.com/Nikku/karma-browserify/issues) for project communication.
When using the issue tracker,

* Be descriptive when creating an issue (what, where, when and how does a problem pop up)?
* Attach steps to reproduce (if applicable)
* Attach code samples, configuration options or stack traces that may indicate a problem
* Be helpful and respect others when commenting

Create a pull request if you would like to have an in-depth discussion about some piece of code.

## Creating pull requests

We use pull requests for feature discussion and bug fixes. If you are not yet familiar on how to create a pull request, [read this great guide](https://gun.io/blog/how-to-github-fork-branch-and-pull-request).

Some things that make it easier for us to accept your pull requests

* The code adheres to our conventions
    * spaces instead of tabs
    * single-quotes
    * ...
* The code is tested
* The `grunt` build passes (executes tests + linting)
* The work is combined into a single commit
* The commit messages adhere to our [guideline](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y)


We'd be glad to assist you if you do not get these things right in the first place.

## Maintaining the project

Some notes for us maintainers only.

### Merge pull-requests

When merging, try to do it manually (rebase on current master). This avoids merge messages.

### Release the project

To release execute `grunt release(:major|:minor|:patch)`. Respect [semantic versioning](http://semver.org/) and choose correct next version based on latest changes.

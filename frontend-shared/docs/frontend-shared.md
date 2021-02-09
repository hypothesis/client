# Frontend Shared Package


The `frontend-shared` package is a library of shared utilities, components and styles common to multiple Hypothesis front-end applications.

The `frontend-shared` package source is located in `./frontend-shared` in this repository.

Note: The long-term goal is to move this package into its own repository. There are some short-term advantages to the current setup: it piggy-backs on existing tooling and gives developers the benefit of working with just one repository when making changes (which primarily benefit the `client` in the first place).

## How it works

Frontend-shared works by creating a symlink via `$ yarn link` between the working dir
`./frontend-shared/` and the installed dir `node_modules/@hypothesis/frontend-shared/`.

## Client setup

To set up `frontend-shared` in the client, run

```shell
$ make dev
```

as normal for development in the `client` application.

This will trigger the `frontend-shared` build which:
- Builds transpiled JSX into the `frontend-shared/lib` directory
- Creates a linked package in the `node_modules/@hypothesis` folder (this is linked to `frontend-shared/lib`)

When `$ make dev` is running, file changes will automatically trigger a rebuild. To rebuild manually, run:

```shell
$ gulp setup-frontend-shared
```

## Usage in other repositories

If you have modified the `frontend-shared` package locally and would like to preview changes in another Hypothesis applications that imports the package--that is, if you want to test uncommitted changes in `frontend-shared` in another local repository before publishing changes--follow these steps:

1. In this repository's directory
```shell
    $ gulp setup-frontend-shared
```

1. In the target repository
```shell
    $ yarn link @hypothesis/frontend-shared
```

_Note_: the package will need to be rebuilt after any changes are made to it before those changes can be seen in the consuming repository. This can be done by performing either of the following steps:

  - Run `$ make dev` in this repository, which will **automatically** re-build on any file changes, or
  - Run `$ gulp build-frontend-shared-js` in this repository to re-build **manually** after changes

#### Removing the link

If you wish to revert back to a published version, as opposed to a local version, you'll have to remove the local link and force the  install:

```shell
    $ yarn unlink @hypothesis/frontend-shared
	$ yarn install --force
```

## Other caveats

1. The `./frontend-shared/node_modules` should never exist locally and only needs to be installed during package releases performed by CI. The existence of that folder will cause problems for the client and it won't be able to run correctly. If you accidentally run `yarn install` from the `./frontend-shared` folder, remove the `node_modules/` dir.

2. If you have two copies of the client repository checked out, then running the link step twice is problematic in that only the first package works. In order override the link and use a the second copy, you'll need remove the link from the first copy by going into the `./frontend-shared` folder of the first copy and running `$ yarn unlink`.

# FIXME - THIS CHANGE SHOULD NOT BE MERGED.

.PHONY: default
default: all

.PHONY: all
all: build/manifest.json

## Remove build artifacts
.PHONY: clean
clean:
	rm -f node_modules/.uptodate
	rm -rf build

## Run test suite
.PHONY: test
test: node_modules/.uptodate
	yarn test

.PHONY: lint
lint: node_modules/.uptodate
	yarn run lint

.PHONY: docs
docs:
	tox -e py3-docs

.PHONY: checkdocs
checkdocs:
	tox -e py3-checkdocs

################################################################################

build/manifest.json: node_modules/.uptodate
	yarn run build

node_modules/.uptodate: package.json yarn.lock
	yarn run deps 2>/dev/null || yarn install
	@touch $@

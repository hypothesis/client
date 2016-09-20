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
	npm test

## Run the development client locally
.PHONY: dev
dev: node_modules/.uptodate
	gulp watch

.PHONY: lint
lint: node_modules/.uptodate
	npm run lint

################################################################################

build/manifest.json: node_modules/.uptodate
	npm run-script build

node_modules/.uptodate:
	npm run-script deps 2>/dev/null || npm install
	@touch $@

NPM_BIN := $(shell npm bin)

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
	$(NPM_BIN)/gulp test-app

################################################################################

build/manifest.json: node_modules/.uptodate
	$(NPM_BIN)/gulp build-app

node_modules/.uptodate: package.json
	@echo installing javascript dependencies
	@$(NPM_BIN)/check-dependencies 2>/dev/null || npm install
	@touch $@

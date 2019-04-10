.PHONY: default
default: help

.PHONY: help
help:
	@echo "make help              Show this help message"
	@echo "make dev               Run the app in the development server"
	@echo "make lint              Run the code linter(s) and print any warnings"
	@echo "make checkformatting   Check code formatting"
	@echo "make format            Automatically format code"
	@echo "make test              Run the unit tests once"
	@echo "make servetests        Start the unit test server on localhost"
	@echo "make docs              Build docs website and serve it locally"
	@echo "make checkdocs         Crash if building the docs website fails"
	@echo "make clean             Delete development artefacts (cached files, "
	@echo "                       dependencies, etc)"

.PHONY: dev
dev: build/manifest.json
	gulp watch

.PHONY: test
test: node_modules/.uptodate
ifdef FILTER
	yarn test --grep $(FILTER)
else
	yarn test
endif

.PHONY: servetests
servetests: node_modules/.uptodate
	gulp test-watch

.PHONY: lint
lint: node_modules/.uptodate
	yarn run lint

.PHONY: docs
docs:
	tox -e py3-docs

.PHONY: checkdocs
checkdocs:
	tox -e py3-checkdocs

.PHONY: clean
clean:
	rm -f node_modules/.uptodate
	rm -rf build

.PHONY: format
format:
	yarn run format

.PHONY: checkformatting
checkformatting:
	yarn run checkformatting

build/manifest.json: node_modules/.uptodate
	yarn run build

node_modules/.uptodate: package.json yarn.lock
	yarn run deps 2>/dev/null || yarn install
	@touch $@

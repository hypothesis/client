.PHONY: default
default: help

.PHONY: help
help:
	@echo "make help              Show this help message"
	@echo "make dev               Run the app in the development server"
	@echo "make build             Create a production build of the client"
	@echo "make lint              Run the code linter(s) and print any warnings"
	@echo "make checkformatting   Check code formatting"
	@echo "make format            Automatically format code"
	@echo "make test              Run the unit tests once"
	@echo "make sure              Make sure that the formatter, linter, tests, etc all pass"
	@echo "make docs              Build docs website and serve it locally"
	@echo "make checkdocs         Crash if building the docs website fails"
	@echo "make clean             Delete development artefacts (cached files, "
	@echo "                       dependencies, etc)"

.PHONY: dev
dev: node_modules/.uptodate
	node_modules/.bin/gulp watch

.PHONY: test
test: node_modules/.uptodate
ifdef ARGS
	yarn test $(ARGS)
else
	yarn test
endif

.PHONY: lint
lint: node_modules/.uptodate
	yarn run lint
	yarn run typecheck
	yarn run typecheck-no-any

.PHONY: docs
docs: python
	tox -e docs

.PHONY: checkdocs
checkdocs: python
	tox -e checkdocs

.PHONY: clean
clean:
	rm -f node_modules/.uptodate
	rm -rf build

.PHONY: format
format: node_modules/.uptodate
	yarn run format

.PHONY: checkformatting
checkformatting: node_modules/.uptodate
	yarn run checkformatting

.PHONY: sure
sure: checkformatting lint test

.PHONY: python
python:
	@./bin/install-python

.PHONY: build
build: node_modules/.uptodate
	yarn run build

node_modules/.uptodate: package.json yarn.lock
	yarn install
	@touch $@

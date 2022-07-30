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

# Tell make how to compile requirements/*.txt files.
#
# `touch` is used to pre-create an empty requirements/%.txt file if none
# exists, otherwise tox crashes.
#
# $(subst) is used because in the special case of making requirements.txt we
# actually need to touch dev.txt not requirements.txt and we need to run
# `tox -e dev ...` not `tox -e requirements ...`
#
# $(basename $(notdir $@))) gets just the environment name from the
# requirements/%.txt filename, for example requirements/foo.txt -> foo.
requirements/%.txt: requirements/%.in
	@touch -a $(subst requirements.txt,dev.txt,$@)
	@tox -qe $(subst requirements,dev,$(basename $(notdir $@))) --run-command 'pip --quiet --disable-pip-version-check install pip-tools'
	@tox -qe $(subst requirements,dev,$(basename $(notdir $@))) --run-command 'pip-compile --allow-unsafe --quiet $(args) $<'

# Inform make of the dependencies between our requirements files so that it
# knows what order to re-compile them in and knows to re-compile a file if a
# file that it depends on has been changed.
requirements/dev.txt: requirements/requirements.txt
requirements/tests.txt: requirements/requirements.txt
requirements/functests.txt: requirements/requirements.txt
requirements/bddtests.txt: requirements/requirements.txt
requirements/lint.txt: requirements/tests.txt requirements/functests.txt requirements/bddtests.txt

# Add a requirements target so you can just run `make requirements` to
# re-compile *all* the requirements files at once.
#
# This needs to be able to re-create requirements/*.txt files that don't exist
# yet or that have been deleted so it can't just depend on all the
# requirements/*.txt files that exist on disk $(wildcard requirements/*.txt).
#
# Instead we generate the list of requirements/*.txt files by getting all the
# requirements/*.in files from disk ($(wildcard requirements/*.in)) and replace
# the .in's with .txt's.
.PHONY: requirements requirements/
requirements requirements/: $(foreach file,$(wildcard requirements/*.in),$(basename $(file)).txt)

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

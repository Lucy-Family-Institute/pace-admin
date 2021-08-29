##############################################################################
# Utilities
##############################################################################

.PHONY: env
env:
env-%:
	@ if [ -z '${${*}}' ]; then echo 'Environment variable $* not set.' && exit 1; fi

.PHONY: sleep
sleep:
sleep-%: sleep
	@echo Sleeping - back momentarily...
	@sleep $*

.PHONY: help
help: # Source: https://stackoverflow.com/a/59087509
	@grep -B1 -E "^[a-zA-Z0-9_-]+\:([^\=]|$$)" Makefile \
     | grep -v -- -- \
     | sed 'N;s/\n/###/' \
     | sed -n 's/^#: \(.*\)###\(.*\):.*/\2###\1/p' \
     | column -t  -s '###'
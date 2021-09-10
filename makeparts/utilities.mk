##############################################################################
# Utilities
##############################################################################

.PHONY: env
env:
env-%:
	@ if [ -z '${${*}}' ]; then echo 'Environment variable $* not set' && exit 1; fi

.PHONY: arg
arg:
arg-%:
	@ if [ -z '${${*}}' ]; then echo 'Argument $* is required' && exit 1; fi

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

##############################################################################
# Docker helpers
##############################################################################

.PHONY: clone-volume
#: make clone-volume from=volumeName to=volumeNameBackup
clone-volume: arg-from arg-to
	@docker volume create --name $(to) \
	&& docker container run \
		--rm -it \
		-v $(from):/from \
		-v $(to):/to \
		alpine ash -c "cd /from ; cp -av . /to"

.PHONY: docker-stop-all
#: stop all running docker containers
docker-stop-all:
	@docker kill $(docker ps -q)
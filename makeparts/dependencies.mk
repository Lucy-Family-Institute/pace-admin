##############################################################################
# Install/Update Dependencies
##############################################################################

install-yarn:
ifeq (,$(shell which yarn))
	npm -g install yarn
endif

install-quasar:
ifeq (,$(shell which quasar))
	npm install -g @quasar/cli
endif

%/node_modules: %/package.json
	cd $(@D) && yarn && touch -m node_modules

.PHONY: update-js
#: Force an update of all node_modules directories; mostly unnecessary
update-js: env-NODE_DIRS $(addsuffix /node_modules, $(NODE_DIRS))

.PHONY: install
install: \
	install-yarn \
	install-quasar \
	update-js 
	@echo 'Installing...'
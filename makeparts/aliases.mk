##############################################################################
# Aliases
##############################################################################

######################################
# Updating commands but trying not to
# break old code

.PHONY: install-js
install-js: update-js

.PHONY: install_js
install_js: update-js

.PHONY: start_docker
start_docker: docker

.PHONY: stop_docker
stop_docker: stop-docker

.PHONY: update_pdfs
update_pdfs: update-pdfs

.PHONY: clear_pdfs
clear_pdfs: clear-pdfs

.PHONY: migration_console
migration_console: migration-console

######################################
# Common aliases

.PHONY: stop-docker
stop-docker: docker-stop

.PHONY: start-docker
start-docker: docker

.PHONY: restart-docker
restart-docker: docker-restart
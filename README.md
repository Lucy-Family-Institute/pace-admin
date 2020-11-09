# pace-admin
Publication Activity Collection Environment (PACE) Admin Tools and DB

A pilot project under development to investigate ways to streamline and improve the collection, reporting, and analysis of related publication information for the subsequent annual reporting process for campus centers and institutes. It is a time consuming process for each center/institute to determine scholarly productivity by polling faculty, reviewing their CVs, etc., where confidence in the data collected is crucial to ensure good investment decisions of University resources.

This pilot project will prototype a new process that automates data collection from internal and external sources and reporting, as well as integrate validation steps to increase confidence in data considered.

# Starting from scratch

    cp .env.template .env
    make install
    make cleardb
    make start_docker
    make migrate
    make newdb

Note: When running `make migrate`, you may get the following error:

    cd hasura && hasura migrate apply && cd ..
    INFO hasura cli is up to date                      version=1.3.2
    FATA[0002] version check: failed to get version from server: failed making version api call: Get http://localhost:8002/v1/version: EOF
    make: *** [migrate] Error 1

    If you get the above error, give a few minutes then try again.

# Open some terminals

    make docker
    make client
    make -B server
    make migration_console

It's worth running ``make install_js`` every now and then to make sure your packages are up-to-date.

# Production

You may need to change the following variables in your .env file

    GRAPHQL_END_POINT=http://localhost:8002/v1/graphql
    IMAGE_HOST_URL=http://localhost:8000/

To run client and server as daemon, install and run pm2:

    npm install pm2 -g

Then to setup processes to run as daemons

    pm2 start 'make client'
    pm2 start 'make -B server'

Then run check logs to see status

    pm2 logs

And check status of processes

    pm2 monit

Finally once confirmed running correctly configure startup script they restart when the machine is restarted

    pm2 startup

Run the command it specifies and if successful run the following to save the current process list to be restarted when pm2 restarts

    pm2 save
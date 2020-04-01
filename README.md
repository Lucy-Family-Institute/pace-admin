# pace-admin
Publication Activity Collection Environment (PACE) Admin Tools and DB

A pilot project under development to investigate ways to streamline and improve the collection, reporting, and analysis, of related publication information for the subsequent annual reporting process for campus centers and institutes. It is a time consuming process for each center/institute to determine scholarly productivity by polling faculty, reviewing their CVs, etc., where confidence in the data collected is crucial to ensure good investment decisions of University resources. 

This pilot project will prototype a new process that automates data collection from internal and external sources and reporting, as well as integrate validation steps to increase confidence in data considered.

# Starting from scratch

    cp .env.template .env
    make cleardb
    make start_docker
    make migrate
    make newdb

# Open some terminals

    make docker
    make client
    make server
    make migration_console

It's worth running ``make install_js`` every now and then to make sure your packages are up-to-date.

# Production

You may need to change the following variables in your .env file

    GRAPHQL_END_POINT=http://localhost:8002/v1/graphql
    IMAGE_HOST_URL=http://localhost:8000/

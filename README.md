# pace-admin
Publication Activity Collection Environment Admin Tools and DB

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

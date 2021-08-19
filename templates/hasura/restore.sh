#!/bin/sh
pg_restore --dbname=hasura --username=postgres /tmp/backup.sql
#!/bin/sh
# pg_restore --dbname={{ .Env.HASURA_DATABASE }} --username {{ .Env.POSTGRES_USER }} --data-only /tmp/backup.sql
psql --username {{ .Env.POSTGRES_USER }} {{ .Env.HASURA_DATABASE }} < /tmp/backup.sql
#!/bin/sh
pg_restore --dbname={{ .Env.HASURA_DATABASE }} --username {{ .Env.POSTGRES_USER }} --data-only /tmp/backup.sql

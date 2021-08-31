#!/bin/sh
# pg_restore --dbname={{ .Env.HASURA_DATABASE }} --username {{ .Env.POSTGRES_USER }} --data-only /tmp/backup.sql
psql -U {{ .Env.POSTGRES_USER }} {{ .Env.KEYCLOAK_DATABASE }} < /tmp/keycloak.sql
psql -U {{ .Env.POSTGRES_USER }} {{ .Env.HASURA_DATABASE }} < /tmp/hasura.sql
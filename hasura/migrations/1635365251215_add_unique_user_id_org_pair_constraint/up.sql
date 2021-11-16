ALTER TABLE users_organizations
ADD UNIQUE (user_id, organization_value);

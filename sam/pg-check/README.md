## Local Setup
* `brew install postgres` to get the `pg_config` which is required by the psycopg2.
* `pip3 install psycopg2 --target ./lib` to install the lib to the current working directory.
* the main privileges should be in the `information_schema.table_privileges` table where the grantee is the group to query.


## Queries

### Set up Queries
```sql
-- main table
create table tes (str text);
insert into tes (str) values ('test text');
-- group
create role testgroup nologin;
grant usage on schema public to testgroup;
grant select on public.tes to testgroup;
-- user
create role testuser login password 'xxxx';
grant testgroup to testuser;
-- verify privileges
select * from information_schema.table_privileges where grantee='testgroup';
```

### pg function to get permission on DB
```sql
CREATE OR REPLACE FUNCTION database_privs(text) RETURNS table(username text,dbname name,privileges  text[])
AS
$$
SELECT $1, datname, array(
	SELECT privs FROM unnest(ARRAY[
		(CASE WHEN has_database_privilege($1,c.oid,'CONNECT') THEN 'CONNECT' ELSE NULL END),
		(CASE WHEN has_database_privilege($1,c.oid,'CREATE') THEN 'CREATE' ELSE NULL END),
		(CASE WHEN has_database_privilege($1,c.oid,'TEMPORARY') THEN 'TEMPORARY' ELSE NULL END),
		(CASE WHEN has_database_privilege($1,c.oid,'TEMP') THEN 'CONNECT' ELSE NULL END)
		]) foo(privs)
		WHERE privs IS NOT NULL)
FROM pg_database c
WHERE has_database_privilege($1,c.oid,'CONNECT,CREATE,TEMPORARY,TEMP') AND datname not in ('template0');
$$ language sql;
```

* sql to get permission on Tables
```sql
CREATE OR REPLACE FUNCTION table_privs(text) RETURNS table(username text,dbname name,privileges  text[])
AS
$$
SELECT $1, datname, array(
	SELECT privs FROM unnest(ARRAY[
		(CASE WHEN has_table_privilege($1,c.oid,'CONNECT') THEN 'CONNECT' ELSE NULL END),
		(CASE WHEN has_table_privilege($1,c.oid,'CREATE') THEN 'CREATE' ELSE NULL END),
		(CASE WHEN has_table_privilege($1,c.oid,'TEMPORARY') THEN 'TEMPORARY' ELSE NULL END),
		(CASE WHEN has_table_privilege($1,c.oid,'TEMP') THEN 'CONNECT' ELSE NULL END)
		]) foo(privs)
		WHERE privs IS NOT NULL)
FROM pg_table c
WHERE has_table_privilege($1,c.oid,'CONNECT,CREATE,TEMPORARY,TEMP') AND datname not in ('template0');
$$ language sql;
```

* usage
> select * from database_privs('postgres');
> select * from table_privs('postgres');

## misc
* [rds public access](https://stackoverflow.com/a/64806329/14867420)
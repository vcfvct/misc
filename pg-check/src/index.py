import json
import psycopg2
from config.index import Sdlc


class GroupPrivileges:
    def __init__(
        self, group_name: str, privileges: str, table_name: str, schema_name: str
    ):
        self.group_name = group_name
        self.privileges = privileges
        self.table_name = table_name
        self.schema_name = schema_name

    # called when `repr()` is invoked
    def __repr__(self):
        return f"GroupPrivileges(group_name={self.group_name}, privileges={self.privileges}, table_name={self.table_name}, schema_name={self.schema_name})"


def to_group_privileges(rows: list) -> list[GroupPrivileges]:
    """
    Convert the rows of the table_privileges query to a list of dictionaries
    """
    return [
        {
            "table_catalog": row[0],
            "table_schema": row[1],
            "table_name": row[2],
            "privilege_type": row[3],
        }
        for row in rows
    ]


def lambda_handler(event, context):
    target_envs = list(
        map(
            lambda env: f"sales-{env.value}",
            filter(lambda env: env.value is not event["environment"], list(Sdlc)),
        )
    )
    # target_envs = [ env for env in list(Sdlc) if env.value is not event['environment'] ]

    f = open("src/config/local.json")
    data = json.load(f)
    connection = psycopg2.connect(
        host=data["host"],
        dbname=data["dbname"],
        user=data["user"],
        password=data["password"],
        port=data["port"],
    )
    cursor = connection.cursor()
    # cursor.execute("select table_catalog, table_schema, table_name, privilege_type from information_schema.table_privileges where grantee='testgroup'")
    cursor.execute(
        "select table_catalog, table_schema, table_name, privilege_type from information_schema.table_privileges where grantee= %s",
        ("postgres",),
    )
    # row = cursor.fetchone()
    rows: list = cursor.fetchall()
    privs = to_group_privileges(rows)
    print(len(rows))
    print(*privs, sep="\n")
    return {"statusCode": 200, "body": json.dumps("success")}


lambda_handler({"environment": "dev"}, None)

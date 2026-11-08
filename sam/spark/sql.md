# SQL Notes

## JOIN ON vs WHERE

The main difference between the JOIN ON and WHERE clauses in SQL is the stage at which they filter the data.

The JOIN ON clause is used to specify the join condition between two tables, and it filters the data before the join. This means that only the rows that satisfy the join condition are combined into the result set. For example:

```sql
SELECT *
FROM table1
JOIN table2 ON table1.key = table2.key
```
This query combines only the rows from table1 and table2 where the key column matches.

On the other hand, the WHERE clause is used to filter the data after the join. It applies a condition to the combined result set. For example:

```sql
SELECT *
FROM table1
JOIN table2 ON table1.key = table2.key
WHERE table1.column1 = 'value'
```
This query first combines the rows from table1 and table2 where the key column matches, and then filters the result set to only include rows where column1 in table1 is equal to 'value'.

In summary, the JOIN ON clause filters the data before the join, while the WHERE clause filters the data after the join. However, both clauses can be used together to combine and filter data in a SQL query.

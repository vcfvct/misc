# SPARK related

## use system variables at sparkSQL
* in spark, according to [code here](https://spark.apache.org/docs/2.1.0/api/java/org/apache/spark/sql/internal/VariableSubstitution.html), besides variables themselves, it also supports getting the data from environment variables & from the Java system properties, like this:
  - select '${env:USER}';
  - select '${env:PATH}';
  - select '${system:java.home}';
* to test, with json data saving to employee.json at spark home folder
  ```
  {"id" : "1201", "name" : "vcfvct", "age" : "25"}
  {"id" : "1202", "name" : "sam", "age" : "28"}
  {"id" : "1203", "name" : "han", "age" : "39"}
  {"id" : "1204", "name" : "sean", "age" : "23"}
  {"id" : "1205", "name" : "james", "age" : "23"}
  ```
  we can then load a json to a temp view and execute sql
  ```
    spark.read.json("employee.json").createOrReplaceTempView("em")
    spark.sql("select * from em where name='${env:USER}'").show()
  ```

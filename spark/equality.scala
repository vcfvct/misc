import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.Column

case class Zillow(index: String, livingSpace: Float, beds: Int, baths: Float, zip: String, year: Int, price: Float)

val z1Rdd = sc.textFile("/Users/vcfvct/GIT/misc/spark/z1.csv")
val z2Rdd = sc.textFile("/Users/vcfvct/GIT/misc/spark/z2.csv")

val z1RddObj = z1Rdd.map(_.split(",")).map(r => Zillow(r(0), r(1).toFloat, r(2).toInt, r(3).toFloat, r(4), r(5).toInt, r(6).toFloat))
val z2RddObj = z2Rdd.map(_.split(",")).map(r => Zillow(r(0), r(1).toFloat, r(2).toInt, r(3).toFloat, r(4), r(5).toInt, r(6).toFloat))

var z1 = z1RddObj.toDF
var z2 = z2RddObj.toDF

// Option 1: do except directly
val inZ1NotInZ2 = z1.except(z2).toDF()
val inZ2NotInZ1 = z2.except(z1).toDF()

def isEqual(left: DataFrame, right: DataFrame): Boolean = {
   if(left.columns.length != right.columns.length) return false // column lengths don't match
   if(left.count != right.count) return false // record count don't match
   return left.except(right).isEmpty && right.except(left).isEmpty
}

// input is spark sql query
def isEqual(sql1: String, sql2: String): Boolean = {
   val left = spark.sql(sql1)
   val right = spark.sql(sql2)
   if(left.columns.length != right.columns.length) return false // column lengths don't match
   if(left.count != right.count) return false // record count don't match
   return left.except(right).isEmpty && right.except(left).isEmpty
}

inZ1NotInZ2.show
inZ2NotInZ1.show

z1.createOrReplaceTempView("zillow")
val cheap = spark.sql("select * from zillow where price < 200000")
cheap.explain(mode="extended")

// Option 2: generate row hash by columns
def createHashColumn(df: DataFrame) : Column = {
   val colArr = df.columns
   md5(concat_ws("", (colArr.map(col(_))) : _*))
}

val z1SigDF = z1.select(col("index"), createHashColumn(z1).as("signature_z1"))
val z2SigDF = z2.select(col("index"), createHashColumn(z2).as("signature_z2"))
val joinDF = z1SigDF.join(z2SigDF, z1SigDF("index") === z2SigDF("index")).where($"signature_z1" =!= $"signature_z2").cache

joinDF.count


// Option 3: use GroupBy(for DataFrame with duplicate rows)
val z1Grouped = z1.groupBy(z1.columns.map(c => z1(c)).toSeq : _*).count().withColumnRenamed("count", "recordRepeatCount")
val z2Grouped = z2.groupBy(z2.columns.map(c => z2(c)).toSeq : _*).count().withColumnRenamed("count", "recordRepeatCount")

val inZ1NotInZ2 = z1Grouped.except(z2Grouped).toDF()
val inZ2NotInZ1 = z2Grouped.except(z1Grouped).toDF()
inZ1NotInZ2.show
inZ2NotInZ1.show


// Option 4, use exceptAll, which should also work for data with duplicate rows
// Source Code: https://github.com/apache/spark/blob/50538600ec/sql/core/src/main/scala/org/apache/spark/sql/Dataset.scala#L2029
val inZ1NotInZ2 = z1.exceptAll(z2).toDF()
val inZ2NotInZ1 = z2.exceptAll(z1).toDF()
inZ1NotInZ2.show
inZ2NotInZ1.show


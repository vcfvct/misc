## Terraform infrastructure code for cccg web in AWS.

* go to IAM create a IAM user with ec2/s3/cfn/iam access and get the access id/secret to the ~/.aws/credentials file
* then `terraform init/plan/apply`

## mysql
This old drupal does not work with mysql 8.0 which is the default on ubuntu 20. Have to [follow this](https://www.fosstechnix.com/how-to-install-mysql-5-7-on-ubuntu-20-04-lts/) to install mysql 5.7 server.
And use [this to pin to the old version for api](https://askubuntu.com/questions/1232558/install-mysql-5-7-on-ubuntu-20-04)

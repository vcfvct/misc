## church IT related stuff
* nginx + drupal: need to add `try_files $uri /index.php?$query_string;` for `'/`, otherwise clean url will not work. As a result, drupal will try to add `?q` to the urls, which will break our s3 proxy.

## Steps
1. create new AWS Account and create IAM user with ec2/s3/cfn/iam access and get the access id/secret to the ~/.aws/credentials file.
2. run Terraform or CDK to provision the new Instance/Vpc/EBS/EIP etc
3. Mysql 5.7 installation
  * This old drupal does not work with mysql 8.0 which is the default on ubuntu 20. Have to [follow this](https://www.fosstechnix.com/how-to-install-mysql-5-7-on-ubuntu-20-04-lts/) to install mysql 5.7 server.
  * (Optional?) And use [this to pin to the old version for api](https://askubuntu.com/questions/1232558/install-mysql-5-7-on-ubuntu-20-04)
  * export the mysql from previous server and scp to new server and them import to the new mysql
4. File System: scp the `/var/www/html` from old server to new
  * make sure the DB username/password under `/var/www/html/sites/default/settings.php` is correct.
5. Nginx
  * copy the config to `conf.d/`.
  * in the change the `server` to the ip temporarily to verify the site on port `80`. (may need to comment out the ssl redirect part);
6. DNS, go to godaddy and change the ip for the `A` record to the new one.
7. SSL Cert
  * install CertBot and setup new cert for the domain/server. go back to nginx config and change the `server` back to `cccgermantown.org`.
  * setup cron job to check and renew cert.
8. clean up resources on old account.

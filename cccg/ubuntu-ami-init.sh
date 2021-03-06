#!/usr/bin/env bash
# fish shell
sudo add-apt-repository ppa:fish-shell/nightly-master -y
sudo apt-get update -y
sudo apt-get install fish -y
chsh -s `which fish`

# aws cli
curl -O https://bootstrap.pypa.io/get-pip.py
pip install awscli --upgrade --user

# sync Drupal FS, check status with 'jobs'
nohup scp -r cccgadm@cccgermantown.org:/var/www/html /var/www/html/ &
jobs

# Nginx https://www.linuxbabe.com/linux-server/install-nginx-mariadb-php7-lemp-stack-ubuntu-16-04-lts
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
systemctl status nginx
# vi /etc/nginx/nginx.conf   and change the 'client_max_body_size 100M;' to the end of the 'http' section
sudo rm /etc/nginx/sites-enabled/default
sudo vi /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo systemctl reload nginx

# php7
sudo add-apt-repository ppa:ondrej/php -y
sudo apt install php7.0-fpm php7.0-mbstring php7.0-xml php7.0-mysql php7.0-common php7.0-gd php7.0-json php7.0-cli php7.0-curl
sudo systemctl start php7.0-fpm
systemctl status php7.0-fpm
php --version
# <?php phpinfo(); ?>
# vi /etc/php/7.0/fpm/php.ini      and change the config for 'mbstring.http_input = pass;' and 'mbstring.http_output = pass;','max_execution_time = 360', 'memory_limit = 512M', 'upload_max_filesize = 100M'
sudo systemctl restart php7.0-fpm
# get a `Fatal error: Call to undefined function field_attach_load() in entity.inc`, have to drop the database in RDS and re-create one. Not sure why. https://www.drupal.org/node/2845175 
# Theme is under `sites/all/themes`, then go to `appearance` menu to enable .https://www.templatemonster.com/help/how-to-install-drupal-7-theme.html

# The nginx user is usually nginx or www-data. You can check it in /etc/nginx/nginx.conf file.
sudo chown nginx:nginx  /var/www/html/ -R  
### OR:
sudo chown www-data:www-data /var/www/html/ -R


# Mysql client
sudo apt-get install mysql-client
# Mysql Server(if host in EC2)
sudo apt install mysql-server
# Mysql export
mysqldump -h 127.0.0.1 -u root -p cccgerm --compress > 20180808.sql
# Mysql connect/import
mysql -h RDS-HOST -P 3306 -u cccgadm -p
mysql -h mysql-drupal.c7lqc6fawrjq.us-east-1.rds.amazonaws.com -P 3306 -u cccgadm -p DB_NAME < cccgerm.sql 
# drupal mysql connection info, if user lock error, create a new mysql user with all rights and replace in below file
# CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
# GRANT ALL PRIVILEGES ON * . * TO 'admin'@'localhost';
# FLUSH PRIVILEGES;
vi /var/www/html/sites/default/settings.php

# keep EBS when ec2 terminated.
aws ec2 modify-instance-attribute --instance-id i-xxxxxxx --block-device-mappings "[{\"DeviceName\": \"/dev/sda1\",\"Ebs\":{\"DeleteOnTermination\":false}}]" --region us-east-1

# drupal files in S3
## source
tar -czvf site.tgz /var/www/html
## dest
aws s3 cp s3://cccg-drupal-fs/site.tgz site.tgz
tar -xzvf site.tgz --directory /var/www/html
## or scp directly
scp -r /var/www/html ubuntu@DestIPAdress /var/www

# add cccgadm to nginx 'www-data' group and modify the 'file_attach' directory to have 'w' for the group
sudo adduser cccgadm
usermod -a -G www-data cccgadm
usermod -aG sudo cccgadm
chmod 755 /var/www/html/sites/default/files/file_attach
# sudo vi /etc/sudoers and add 'cccgadm ALL=(ALL) NOPASSWD:ALL' below the line `%sudo  ALL=(ALL:ALL) ALL`
# To add public key, add the key to '/home/cccgadm/.ssh/authorized_keys', double check the key-string should be one line
chown -R cccgadm:cccgadm /home/cccgadm/.ssh
chmod 600 /home/cccgadm/.ssh/authorized_keys


### SSL part [HERE](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04)
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
# install certbot
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install python-certbot-nginx
# get cert
certbot --nginx -d cccgermantown.org -d www.cccgermantown.org
# auto renew
sudo crontab -e
15 3 * * * /usr/bin/certbot renew --quiet

## backup to glacier, to retrieve use 'initial-job' to create a job and download when job is done
aws glacier upload-archive --account-id - --vault-name cccg-file-backup --body cccgerm.sql --region us-east-1
aws glacier upload-archive --account-id - --vault-name cccg-file-backup --body site.tgz --region us-east0

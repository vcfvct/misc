#!/usr/bin/env bash
sudo add-apt-repository ppa:fish-shell/nightly-master -y
sudo apt update -y
sudo apt install fish -y

# Nginx https://www.linuxbabe.com/linux-server/install-nginx-mariadb-php7-lemp-stack-ubuntu-16-04-lts
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
systemctl status nginx

# php7
sudo add-apt-repository ppa:ondrej/php -y
sudo apt install php7.0-fpm php7.0-mbstring php7.0-xml php7.0-mysql php7.0-common php7.0-gd php7.0-json php7.0-cli php7.0-curl -y
sudo systemctl start php7.0-fpm
systemctl status php7.0-fpm

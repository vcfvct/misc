##  Failed to parse PID from file /run/nginx.pid: Invalid argument 
```
 mkdir -p /etc/systemd/system/nginx.service.d
 printf "[Service]\nExecStartPost=/bin/sleep 0.1\n" >/etc/systemd/system/nginx.service.d/override.conf
 systemctl daemon-reload
 systemctl restart nginx.service
```


## certbot
* `certbot --nginx -d joannali.eu.org -d www.joannali.`eu.org

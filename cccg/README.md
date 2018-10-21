## church IT related stuff
* nginx + drupal: need to add `try_files $uri /index.php?$query_string;` for `'/`, otherwise clean url will not work. As a result, drupal will try to add `?q` to the urls, which will break our s3 proxy.

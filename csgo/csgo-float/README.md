# CSGO Float

upstream: [csgo inspect](https://github.com/csgofloat/inspect)

## 安装(Ubuntu)

### Postgre数据库安装

* 安装postgres数据库: `sudo apt -y install postgresql postgresql-contrib`
* 启动postgres: `sudo service postgresql start`
* 确认数据库运行状态: `sudo service postgresql status` or `sudo lsof -i :5432`

### postgres用户和权限

* 用默认用户 *postgres* 登录命令行: `sudo -u postgres psql`
* 创建用户: `CREATE USER csgo WITH PASSWORD '123456';`
* 授予用户读写权限: `GRANT pg_read_all_data, pg_write_all_data TO csgo;`  OR 
  ```sql
  GRANT CONNECT ON DATABASE postgres TO csgo;
  GRANT USAGE ON ALL SCHEMAS IN DATABASE postgres TO csgo;
  GRANT USAGE ON SCHEMA public TO csgo;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO csgo;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO csgo;
  ```
* `ctrl+D` 退出postgres命令行

### App安装/设置/运行

* 安装依赖包: `npm install`
* 在 *config.js* 里填入用户名/密码. 默认端口是`8888`, 如果需要可以修改.
* 启动本地服务器: `node index.js`
* 测试地址: `http://localhost:8888/?url=steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M4333068266054512558A29797567034D5630914595248693658`

## 其他postgres命令

* list Tables: `\l+` or `SELECT datname FROM pg_database;`
* List Users: `\du+`
* List Roles: `SELECT rolname AS role_name FROM pg_catalog.pg_roles;`

## log output sample

```
debug: GC connection established
info: csgolqy CSGO Client Ready!
debug: Got unhandled GC message 9173
debug: csgolqy Fetching for 29797567034
debug: Sending GC message Client2GCEconPreviewDataBlockRequest
debug: Got handled GC message Client2GCEconPreviewDataBlockResponse
debug: Received itemData for 29797567034
debug: Inserted/updated 1 items
```

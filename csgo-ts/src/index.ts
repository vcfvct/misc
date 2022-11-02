import 'reflect-metadata';
import Container from 'typedi';
import { EmailProfileInjectionToken } from './common/constants';
import { TencentEmail1 } from './config/email.config';
import { ItemOrderHistoryService } from './service/item-order-history.service';
const globalTunnel = require('global-tunnel-ng');
import * as yargs from 'yargs';

const args = yargs
  .option('config', {
    alias: 'c',
    description: 'specify config file number',
  })
  .option('proxy', {
    alias: 'p',
    description: 'specify use proxy or not',
  })
  .argv;
if (args.proxy) {
  console.info(`Setting up global proxy!`);
  globalTunnel.initialize({
    host: '127.0.0.1',
    port: 10800,
  });
}

(async () => {
  Container.set(EmailProfileInjectionToken, TencentEmail1);
  const configFile = await import(`./config/config${args.config ?? 1}`);
  const itemOrderHistoryService: ItemOrderHistoryService = Container.get(ItemOrderHistoryService);
  itemOrderHistoryService.appConfig = configFile.appConfig;
  itemOrderHistoryService.scanAll();
})();


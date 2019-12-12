import 'reflect-metadata';
import Container from 'typedi';
import { EmailProfileInjectionToken } from './common/constants';
import { TencentEmail1 } from './config/email.config';
import { ItemOrderHistoryService, ItemToScan } from './service/item-order-history.service';
const globalTunnel = require('global-tunnel-ng');
import * as yargs from 'yargs';
import * as fs from 'fs';

const args = yargs.argv;
if (args.proxy) {
  console.info(`Setting up global proxy!`);
  globalTunnel.initialize({
    host: '127.0.0.1',
    port: 10800,
  });
}

(async () => {
  Container.set(EmailProfileInjectionToken, TencentEmail1);
  const configFile = `./src/config/item.config${args.config}.json`;
  console.info(`Using config file: '${configFile}'`);
  const itemsToScan: Array<ItemToScan> = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const itemOrderHistoryService: ItemOrderHistoryService = Container.get(ItemOrderHistoryService);
  itemOrderHistoryService.itemsToScan = itemsToScan.map((i) => {
    // assign init value to count
    i.count = -1;
    return i;
  });
  itemOrderHistoryService.scanItems(0);

})();


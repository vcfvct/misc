import 'reflect-metadata';
import Container from 'typedi';
import { EmailProfileInjectionToken } from './common/constants';
import { TencentEmail1 } from './config/email.config';
import { itemsToScan } from './config/item.config';
import { ItemOrderHistoryService } from './service/item-order-history.service';
const globalTunnel = require('global-tunnel-ng');

const args = process.argv.slice(2);
if (args[0] === 'proxy') {
  console.info(`Setting up global proxy!`);
  globalTunnel.initialize({
    host: '127.0.0.1',
    port: 10800,
  });
}

(async () => {
  Container.set(EmailProfileInjectionToken, TencentEmail1);

  // assign init value to count
  itemsToScan.forEach(i => i.count = -1);
  const itemOrderHistoryService: ItemOrderHistoryService = Container.get(ItemOrderHistoryService);
  itemOrderHistoryService.scanItems(0);

})();


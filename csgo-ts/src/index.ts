import 'reflect-metadata';
import Container from 'typedi';
import { EmailProfileInjectionToken } from './common/constants';
import { TencentEmail1 } from './config/email.config';
import { itemsToScan, ItemToScan } from './config/item.config';
import { ScanInterval } from './config/runtime.config';
import { ItemOrderHistoryService, ItemOrderHistory } from './service/item-order-history.service';
import { EmailService } from './service/email.service';

(async () => {
  Container.set(EmailProfileInjectionToken, TencentEmail1);

  // assign init value to count
  itemsToScan.forEach(i => i.count = -1);
  const itemOrderHistoryService: ItemOrderHistoryService = Container.get(ItemOrderHistoryService);
  itemOrderHistoryService.scanItems(0);

})();


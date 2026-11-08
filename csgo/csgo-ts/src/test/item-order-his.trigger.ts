import { ItemOrderHistoryService } from '../service/item-order-history.service';

(async () => {
  const handler: ItemOrderHistoryService = new ItemOrderHistoryService();
  await handler.getItemById(175999971);
})();
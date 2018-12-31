import { Service, Inject } from 'typedi';
import got, { Response } from 'got';
import { ApiTimeout, ScanInterval } from '../config/runtime.config';
import { ItemToScan, itemsToScan } from '../config/item.config';
import { EmailService } from './email.service';
import { base64Encode } from '../common/utils';

@Service()
export class ItemOrderHistoryService {

  @Inject()
  emailService: EmailService;

  baseUrl = 'https://steamcommunity.com/market/itemordershistogram?norender=1&country=HK&language=schinese&currency=23&item_nameid=';
  apiUrl = 'http://47.75.97.6:9012/api/server/dotnet/itemChange';

  async getItemById(itemNameId: number): Promise<ItemOrderHistory> {
    const url = `${this.baseUrl}${itemNameId}`;
    const res: Response<ItemOrderHistory> = await got.get(url, { json: true, timeout: ApiTimeout * 1000 });
    return res.body;
  }

  async scanItems(itemIndex: number) {
    try {
      const currentItem: ItemToScan = itemsToScan[itemIndex % itemsToScan.length];
      const itemOrderHistory: ItemOrderHistory = await this.getItemById(currentItem.nameId);
      const newItemCount = parseInt(itemOrderHistory.sell_order_count.replace(/,/g, ''));
      console.info(`'${newItemCount}': ${currentItem.description.padEnd(40, '.')}`);
      if (currentItem.count! > 0 && currentItem.count! < newItemCount) {
        const parseTime: string = new Date().toLocaleString();
        const msg = `${parseTime} 数量变化:${currentItem.count}->${newItemCount}-${currentItem.description} 最低求购价: ${itemOrderHistory.buy_order_price}`;
        this.emailService.sendEmail(msg, `<a href="${currentItem.url}">购买链接</a> <br/> ${msg}`);
        // notify server on item change
        this.callItemChangeApi(currentItem, newItemCount, parseTime);
      }
      newItemCount > 0 && (currentItem.count = newItemCount);
    } catch (e) {
      console.error(e.message);
    }
    setTimeout(() => this.scanItems(++itemIndex), ScanInterval * 1000);
  }

  callItemChangeApi(currentItem: ItemToScan, newItemCount: number, parseTime: string) {
    // extract standard English name from url
    const itemName = decodeURIComponent(currentItem.url.substring('https://steamcommunity.com/market/listings/730/'.length));
    const apiItem: ApiItem = {
      appId: 730,
      name: itemName,
      hashName: itemName,
      count: newItemCount,
      parseTime,
      hostId: 888,
      countChnange: `${currentItem.count}-\\u003e${newItemCount}`,
      reciveTime: parseTime,
      isIncrease: true,
      showlink: currentItem.url
    };
    const apiItemEncoded: string = base64Encode(JSON.stringify({ itemList: [apiItem] }));
    const query = new URLSearchParams([['content', apiItemEncoded]]);
    console.info(`calling API '${this.apiUrl}' with param: '${query.toString()}'`);
    got.get(this.apiUrl, { query });
  }
}

export interface SellOrderTable {
  price: string;
  price_with_fee: string;
  quantity: string;
}

export interface BuyOrderTable {
  price: string;
  quantity: string;
}

export interface ItemOrderHistory {
  success: number;
  sell_order_count: string;
  sell_order_price: string;
  sell_order_table: SellOrderTable[];
  buy_order_count: string;
  buy_order_price: string;
  buy_order_table: BuyOrderTable[];
  highest_buy_order: string;
  lowest_sell_order: string;
  buy_order_graph: any[][];
  sell_order_graph: any[][];
  graph_max_y: number;
  graph_min_x: number;
  graph_max_x: number;
  price_prefix: string;
  price_suffix: string;
}

export interface ApiItem {
  appId: number;
  name: string;
  hashName: string;
  count: number;
  parseTime: string;
  hostId?: number;
  version?: number;
  countChnange: string;
  reciveTime: string;
  isIncrease: boolean;
  showlink: string;
}
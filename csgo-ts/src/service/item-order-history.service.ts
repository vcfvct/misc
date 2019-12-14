import { Service, Inject } from 'typedi';
import got, { Response } from 'got';
import { EmailService } from './email.service';
import { base64Encode } from '../common/utils';
import { URLSearchParams } from 'url';
import { Retryable } from 'typescript-retry-decorator';
import { AppConfig, ItemToScan } from '../types';

@Service()
export class ItemOrderHistoryService {
  appConfig: AppConfig;

  @Inject()
  emailService: EmailService;

  baseUrl = 'https://steamcommunity.com/market/itemordershistogram?norender=1&country=HK&language=schinese&currency=23&item_nameid=';

  @Retryable({ maxAttempts: 1, backOff: 1 })
  async getItemById(itemNameId: number): Promise<ItemOrderHistory> {
    const url = `${this.baseUrl}${itemNameId}`;
    const res: Response<ItemOrderHistory> = await got.get(url, { json: true, timeout: this.appConfig.apiTimeout * 1000, rejectUnauthorized: false });
    return res.body;
  }

  async scanItems(itemIndex: number): Promise<void> {
    const currentItem: ItemToScan = this.appConfig.items[itemIndex % this.appConfig.items.length];
    try {
      const itemOrderHistory: ItemOrderHistory = await this.getItemById(currentItem.nameId);
      const newItemCount: number = itemOrderHistory.sell_order_count === 0 ? 0 : parseInt(itemOrderHistory.sell_order_count.replace(/,/g, ''));
      console.info(`###'${newItemCount}': ${currentItem.description.padEnd(40, '.')}`);
      if (currentItem.count !== undefined && currentItem.count! >= 0 && currentItem.count! < newItemCount) {
        const parseTime: string = new Date().toLocaleString();
        const msg = `${parseTime} 数量变化:${currentItem.count}->${newItemCount}-${currentItem.description} 最低求购价: ${itemOrderHistory.buy_order_price}`;
        this.emailService.sendEmail(msg, `
          <a href="${currentItem.url}">购买链接</a>
          <br/> ${msg}
          <br/> <a href="https://steamcommunity-a.akamaihd.net/market/itemordershistogram?norender=1&country=HK&language=schinese&currency=23&item_nameid=${currentItem.nameId}">API链接</a>
          <br/>`,
        );
        // notify server on item change
        this.callItemChangeApi(currentItem, newItemCount, parseTime, itemOrderHistory.buy_order_price);
      }
      currentItem.count = newItemCount;
    } catch (e) {
      console.error(`刷新物品'${currentItem.description}'错误: ${e.message}`);
    }
    setTimeout(() => this.scanItems(++itemIndex), this.appConfig.scanInterval * 1000);
  }

  callItemChangeApi(currentItem: ItemToScan, newItemCount: number, parseTime: string, price: string): void {
    // extract standard English name from url
    const itemName = decodeURIComponent(currentItem.url.substring('https://steamcommunity.com/market/listings/730/'.length));
    const apiItem: ApiItem = {
      appId: 730,
      name: itemName,
      hashName: itemName,
      count: newItemCount,
      parseTime,
      hostId: this.appConfig.serverConfig.hostId,
      countChnange: `${currentItem.count}->${newItemCount}`,
      reciveTime: parseTime,
      isIncrease: true,
      showlink: currentItem.url,
      apiUrl: `${this.baseUrl}${currentItem.nameId}`,
      price,
    };
    const apiItemEncoded: string = base64Encode(JSON.stringify({ itemList: [apiItem] }));
    const query = new URLSearchParams([['content', apiItemEncoded]]);
    const serverApiUrl = `${this.appConfig.serverConfig.serverUrl}/api/server/dotnet/itemChange`;
    console.info(`calling API '${serverApiUrl}' with param: '${query.toString()}'`);
    got.get(serverApiUrl, { query });
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
  sell_order_count: string | 0;
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
  price: string;
  apiUrl: string;
}


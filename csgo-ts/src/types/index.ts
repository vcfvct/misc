export interface ItemToScan {
  nameId: number;
  description: string;
  url: string;
  count?: number;
}

export interface NotifyServerConfig {
  serverUrl: string;
  hostId: number;
}

export interface AppConfig {
  items: Array<ItemToScan>;
  serverConfig: NotifyServerConfig;
  scanInterval: number;
  apiTimeout: number;
}

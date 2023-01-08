export interface ItemToScan {
  nameId: number;
  description: string;
  url: string;
  count?: number;
  sellPrice?: string;
}

export interface NotifyServerConfig {
  serverUrl: string;
  errorServerUrl: string;
  hostId: number;
}

export interface AppConfig {
  items: Array<ItemToScan>;
  serverConfig: NotifyServerConfig;
  scanInterval: number;
  apiTimeout: number;
}

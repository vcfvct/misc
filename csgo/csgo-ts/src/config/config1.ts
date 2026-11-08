import { AppConfig } from '../types';

export const appConfig: AppConfig = {
  scanInterval: 0.3,
  apiTimeout: 2,
  serverConfig: {
    serverUrl: 'http://47.75.97.6:9012',
    errorServerUrl: 'http://192.168.0.205',
    hostId: 888,
  },
  items: [
    {
      nameId: 7178002,
      description: 'AK-47 | 红线 (久经沙场)',
      url: 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20%28Field-Tested%29',
    },
    {
      nameId: 175854488,
      description: '摩托手套（★） | 日蚀 (久经沙场)',
      url: 'https://steamcommunity.com/market/listings/730/%E2%98%85%20Moto%20Gloves%20%7C%20Eclipse%20%28Field-Tested%29',
    },
  ],
};


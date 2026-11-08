import { AppConfig } from '../types';

export const appConfig: AppConfig = {
  scanInterval: 0.3,
  apiTimeout: 3,
  serverConfig: {
    serverUrl: 'http://47.75.97.6:9012',
    errorServerUrl: 'http://192.168.0.205',
    hostId: 888,
  },
  items: [
    {
      nameId: 175967236,
      description: '裹手（★） | 套印 (久经沙场)',
      url: 'https://steamcommunity.com/market/listings/730/%E2%98%85%20Hand%20Wraps%20%7C%20Overprint%20%28Field-Tested%29',
    },
    {
      nameId: 14966472,
      description: '格洛克 18 型（StatTrak™） | 水灵 (崭新出厂)',
      url: 'https://steamcommunity.com/market/listings/730/StatTrak%E2%84%A2%20Glock-18%20%7C%20Water%20Elemental%20%28Factory%20New%29',
    },
    {
      nameId: 3455552,
      description: 'M4A4（StatTrak™） | 二西莫夫 (久经沙场)',
      url: 'https://steamcommunity.com/market/listings/730/StatTrak%E2%84%A2%20M4A4%20%7C%20Asiimov%20%28Field-Tested%29',
    },
    {
      nameId: 165128938,
      description: 'MP9（StatTrak™） | 气密 (崭新出厂)',
      url: 'https://steamcommunity.com/market/listings/730/StatTrak%E2%84%A2%20MP9%20%7C%20Airlock%20%28Factory%20New%29',
    },
  ],
};


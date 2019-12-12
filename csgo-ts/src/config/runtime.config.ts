// 扫描间隔, 单位:秒
export const ScanInterval = 2;

// Steam API超时时间, 单位:秒
export const ApiTimeout = 4;

// 自己的api通知服务器配置
export const ServerConfig: NotifyServerConfig = {
  serverUrl: 'http://47.75.97.6:9012',
  hostId: 888,
};

export interface NotifyServerConfig {
  serverUrl: string;
  hostId: number;

}
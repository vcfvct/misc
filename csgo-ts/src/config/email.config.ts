export interface SmtpAuth {
  user: string;
  pass: string;
}

export interface Smtp {
  host: string;
  port: number;
  secure?: boolean;
  pw?: string;
  auth?: SmtpAuth;
}

export interface EmailProfile {
  from: string;
  to: string;
  cc?: string;
  smtp: Smtp;
}


export const TencentEmail1: EmailProfile = {
  from: '1@csgola.xyz',
  to: '2@csgola.xyz',
  smtp: {
    host: 'hwsmtp.exmail.qq.com',
    port: 465,
    secure: true,
    pw: 'YUExMjM0NTY=',
  },
};
#!/usr/bin/env node

const EmailService = require('../src/email');

const emailService = new EmailService('163');
emailService.sendEmail('有新物品了！请及时查看！', '磨损值： 0.151412345， 价格： 1225.  <a href="https://steamcommunity.com/market/listings/730/%E2%98%85%20M9%20Bayonet">Counter-Strike: Global Offensive > M9 刺刀（★）</a>');




#!/usr/bin/env node

const EmailService = require('../src/email');

const emailService = new EmailService('163');
emailService.sendEmail('有新物品了！', '磨损值： 0.151412345， 价格： 1225.');




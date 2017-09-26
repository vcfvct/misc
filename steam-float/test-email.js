#!/usr/bin/env node

const sendmail = require('sendmail')();

sendmail({
  from: 'han.li@finra.org',
  to: 'vcfvct@gmail.com',
  // to: '70924784@qq.com',
  subject: 'MailComposer sendmail',
  html: 'Mail of test sendmail '
}, function (err, reply) {
  console.log(err && err.stack)
  console.dir(reply)
})
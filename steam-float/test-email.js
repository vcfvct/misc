#!/usr/bin/env node

const sendmail = require('sendmail')();

sendmail({
  from: 'han.li@finra.com',
  // from: 'test@example.com',
  to: 'vcfvct@gmail.com',
  subject: 'MailComposer sendmail',
  html: 'Mail of test sendmail '
}, function (err, reply) {
  console.log(err && err.stack)
  console.dir(reply)
})
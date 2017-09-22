#!/usr/bin/env node

// var sendmail = require('../sendmail')({silent: true})
const sendmail = require('sendmail');

// sendmail({
//   from: 'han.li@finra.org',
//   to: 'vcfvct@gmail.com',
//   subject: 'MailComposer sendmail',
//   html: 'Mail of test sendmail '
// }, function (err, reply) {
//   console.log(err && err.stack)
//   console.dir(reply)
// })

sendmail({
  from: 'test@capitalone.com',
  to: 'vcfvct@gmail.com',
  replyTo: 'jason@yourdomain.com',
  subject: 'MailComposer sendmail',
  html: 'Mail of test sendmail '
}, function (err, reply) {
  console.log(err && err.stack)
  console.dir(reply)
})
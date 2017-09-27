#!/usr/bin/env node

var  nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
var wellknown = require("nodemailer-wellknown");
var config = {host: 'smtp.sohu.com', port: 25};

config.auth = {
    user:'a21223550@sohu.com',
    pass:'aA123456'
}


var transporter = nodemailer.createTransport(smtpTransport(config));
const targetUrl = `https://steamcommunity.com/market/listings/730/%E2%98%85%20M9%20Bayone`;

var mailOptions = {
    from:"a21223550@sohu.com",
    to:"70924784@qq.com",
    // to:"vcfvct@gmail.com",
    // cc:"21223550@qq.com",
    subject:"有新物品了！",
    text:"helloe",
    html:`...点击<a href="${targetUrl}" target="_blank">这里前往</a><br/> this is a test email`
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    console.log('Message sent: ' + info.response);

});
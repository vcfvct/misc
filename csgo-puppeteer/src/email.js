const config = require('./config');
const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');

class EmailService {
    constructor(providerName) {
        switch (providerName) {
            case '163':
                this.emailProfile = config.email163Profile;
                break;
            case 'sohu':
                this.emailProfile = config.emailSohuProfile;
                break;
            default:
                throw new Error(`Unknow Email Provider: ${providerName}`);
        }
        this.transporter = nodemailer.createTransport(smtpTransport(this.emailProfile.smtp));
    }

    sendEmail(subject, body) {
        const mailOptions = {
            from: this.emailProfile.from,
            to: this.emailProfile.to,
            subject: subject,
            html: body
        };
        if(this.emailProfile.cc){
            mailOptions.cc =this.emailProfile.cc 
        }
        console.info(`Sending email from ${this.emailProfile.from} to ${this.emailProfile.to} with subject: ${subject}. content: \n ${body}`); 
        this.transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);

        });
    }
}

module.exports = EmailService;
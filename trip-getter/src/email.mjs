import { email163Profile, emailGmailProfile  } from './config';
import { createTransport } from 'nodemailer';

class EmailService {
    constructor() {
				this.emailProfile = emailGmailProfile;
        this.transporter = createTransport(this.emailProfile.smtp);
    }

    sendEmail(subject, body) {
        const mailOptions = {
            from: this.emailProfile.from,
            to: this.emailProfile.to,
            subject: subject,
            html: body
        };
        if (this.emailProfile.cc) {
            mailOptions.cc = this.emailProfile.cc;
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

export default EmailService;

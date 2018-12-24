import { EmailProfile } from '../config/email.config';
import { Service, Inject } from 'typedi';
import { EmailProfileInjectionToken } from '../common/constants';
import nodemailer, { SentMessageInfo, TransportOptions } from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Options } from 'nodemailer/lib/smtp-transport';
import { base64Decode } from '../common/utils';

@Service()
export class EmailService {

  @Inject(EmailProfileInjectionToken)
  emailProfile: EmailProfile;

  private _transporter: Transporter;

  get transporter(): Transporter {
    if (!this._transporter) {
      const smtpOptions: any = { ...this.emailProfile.smtp };
      smtpOptions.auth = { user: this.emailProfile.from, pass: base64Decode(smtpOptions.pw) };
      this._transporter = nodemailer.createTransport(smtpOptions);
    }
    return this._transporter;
  }

  async sendEmail(subject: string, body: string) {
    const mailOptions: Options = {
      from: this.emailProfile.from,
      to: this.emailProfile.to,
      subject: subject,
      html: body
    };
    this.emailProfile.cc && (mailOptions.cc = this.emailProfile.cc);
    console.info(`Sending email from ${this.emailProfile.from} to ${this.emailProfile.to} with subject: ${subject}. content: \n ${body}`);
    try {
      const res: SentMessageInfo = await this.transporter.sendMail(mailOptions);
      console.log(`Message sent: ${res.response}`);
    } catch (e) {
      console.error(e);
    }
  }

}
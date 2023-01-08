import { EmailService } from '../service/email.service';
import { TencentEmail1 } from '../config/email.config';

(async () => {
  const emailService: EmailService = new EmailService();
  emailService.emailProfile = TencentEmail1;
  emailService.sendEmail('hello world', 'Email Content!');
})();
// const nodemailer = require("nodemailer");
// const pug = require("pug");
// const htmlToText = require("html-to-text");

// module.exports = class Email {
//   constructor(user, url, emailToSend, grpName) {
//     this.to = emailToSend;
//     this.firstName = user.name.split(" ")[0];
//     this.url = url;
//     this.from = '"Version24" <noreply@innovac23.tech>';
//   }

//   newTransport() {
//     return nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT,
//       secureConnection: false,
//       auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//       tls: {
//         ciphers: "SSLv3",
//       },
//     });
//   }

//   // Send the email
//   async send(template, subject) {
//     //1) Render HTML based on Pug
//     const html = pug.renderFile(`${__dirname}./pug/${template}.pug`, {
//       firstName: this.firstName,
//       url: this.url,
//       grpName: this.grpName,
//       subject,
//     });
//     //2) Email options
//     const mailOptions = {
//       from: this.from,
//       to: this.to,
//       subject,
//       html,
//       text: htmlToText.convert(html),
//     };

//     // Create transport and sent email
//     await this.newTransport().sendMail(mailOptions);
//   }

//   async sendAccountConfirmation() {
//     await this.send("accountConfirmation", "Email Confirmation");
//   }

//   async sendResetToken() {
//     await this.send("resetPassword", "Reset Your Password");
//   }
// };

import nodemailer, { Transporter } from "nodemailer";
import pug from "pug";
import htmlToText from "html-to-text";

interface User {
  name: string;
}

export default class Email {
  private to: string;
  private firstName: string;
  private url: string;
  private from: string;
  private transporter: Transporter;

  constructor(user: User, url: string, emailToSend: string, grpName: string) {
    this.to = emailToSend;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = '"Version24" <noreply@innovac23.tech>';
    this.transporter = this.newTransport();
  }

  private newTransport(): Transporter {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST!,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME!,
        pass: process.env.EMAIL_PASSWORD!,
      },
      tls: {
        ciphers: "SSLv3",
      },
    });
  }

  // Send the email
  async send(template: string, subject: string): Promise<void> {
    //1) Render HTML based on Pug
    const html = pug.renderFile(`${__dirname}/pug/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2) Email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html),
    };

    // Create transport and send email
    await this.transporter.sendMail(mailOptions);
  }

  async sendAccountConfirmation(): Promise<void> {
    await this.send("accountConfirmation", "Email Confirmation");
  }

  async sendResetToken(): Promise<void> {
    await this.send("resetPassword", "Reset Your Password");
  }
}

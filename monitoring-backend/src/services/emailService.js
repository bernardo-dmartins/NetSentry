const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    try {
      if (
        !process.env.EMAIL_SERVICE ||
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASSWORD
      ) {
        logger.warn("Email configurations not found. Emails disabled.");
        return;
      }
      const config = {};

      if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
        // Uso explícito de Host/Porta
        config.host = process.env.EMAIL_HOST;
        config.port = parseInt(process.env.EMAIL_PORT, 10);
        // Define 'secure' com base na porta (465 = SSL/true; 587 = TLS/false)
        config.secure = config.port === 465;
      } else if (process.env.EMAIL_SERVICE) {
        // Fallback: Usa apenas o service (ex: 'gmail')
        config.service = process.env.EMAIL_SERVICE;
      } else {
        logger.warn(
          "Email service or host/port configurations not found. Emails disabled."
        );
        return;
      }

      // Adiciona autenticação para ambas as configurações
      config.auth = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      };

      this.transporter = nodemailer.createTransport(config);

      this.initialized = true;
      logger.info(
        "Email service initialized using explicit Host/Port or Service name."
      );
    } catch (error) {
      logger.error("Error initializing email service:", error);
      this.initialized = false;
    }
  }
  /**
   * Enviar email de boas-vindas ao registrar
   */
  async sendWelcomeEmail(user) {
    if (!this.initialized) {
      logger.warn("Email service not initialized. Skipping welcome email.");
      return false;
    }

    try {
      const subject = "🎉 Welcome to NetSentry Monitoring System!";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .header h1 { margin: 0; font-size: 32px; }
            .content { padding: 40px 30px; background: #f9f9f9; }
            .info-box { 
              background: #ffffff; 
              border-left: 4px solid #667eea; 
              padding: 20px; 
              margin: 20px 0;
              border-radius: 4px;
            }
            .feature-list { 
              background: #ffffff; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .feature-list li { 
              margin: 10px 0; 
              padding-left: 10px;
            }
            .button { 
              display: inline-block; 
              padding: 15px 40px; 
              background: #667eea; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              padding: 30px; 
              color: #666; 
              font-size: 12px; 
              background: #f0f0f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to NetSentry!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Real-time Network Monitoring</p>
            </div>
            
            <div class="content">
              <h2 style="color: #333;">Hello ${user.username}!</h2>
              <p>Thank you for registering with <strong>NetSentry Monitoring System</strong>.</p>
              <p>Your account has been successfully created and you can now start monitoring your network devices in real-time with powerful alerts and analytics.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">📋 Account Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Username:</td>
                    <td style="padding: 8px 0;">${user.username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                    <td style="padding: 8px 0;">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Role:</td>
                    <td style="padding: 8px 0; text-transform: capitalize;">${
                      user.role || "user"
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Registration Date:</td>
                    <td style="padding: 8px 0;">${new Date().toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}</td>
                  </tr>
                </table>
              </div>

              <div class="feature-list">
                <h3 style="margin-top: 0; color: #667eea;">✨ What you can do now:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>✅ <strong>Add and monitor devices</strong> - Servers, routers, switches, and more</li>
                  <li>✅ <strong>Real-time status updates</strong> - Know instantly when something goes down</li>
                  <li>✅ <strong>Receive instant alerts</strong> - Email notifications for critical events</li>
                  <li>✅ <strong>View detailed statistics</strong> - Response times, uptime, and trends</li>
                  <li>✅ <strong>Configure monitoring settings</strong> - Customize checks and intervals</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }" class="button">
                  🚀 Access Your Dashboard
                </a>
              </div>

              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1976D2;">
                  <strong>💡 Pro Tip:</strong> Start by adding your first device to monitor. You'll receive instant notifications about its status!
                </p>
              </div>

              <p style="margin-top: 30px;">If you have any questions or need assistance, feel free to contact our support team.</p>
              
              <p style="margin-top: 20px;">Best regards,<br><strong style="color: #667eea;">The NetSentry Team</strong></p>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
              <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} NetSentry Monitoring System. All rights reserved.</p>
              <p style="margin: 15px 0 5px 0;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }" style="color: #667eea; text-decoration: none;">Dashboard</a> | 
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/docs" style="color: #667eea; text-decoration: none;">Documentation</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"NetSentry Monitoring" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: user.email,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${user.email}`);

      return true;
    } catch (error) {
      logger.error("Error sending welcome email:", error);
      return false;
    }
  }

  /**
   * Enviar alerta por email
   */
  async sendAlertEmail(alert, device) {
    if (!this.initialized) {
      logger.warn("Email service not initialized. Skipping send.");
      return false;
    }

    try {
      const subject = `🚨 [${alert.level.toUpperCase()}] ${device.name} - ${
        alert.message
      }`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { 
              background: ${this.getLevelColor(alert.level)}; 
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
            .content { padding: 30px; background: #f9f9f9; }
            .alert-box { 
              background: ${this.getLevelColor(alert.level)}22; 
              border-left: 4px solid ${this.getLevelColor(alert.level)}; 
              padding: 20px; 
              margin: 20px 0;
              border-radius: 4px;
            }
            .device-info { 
              background: #ffffff; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            td:first-child { font-weight: bold; width: 40%; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: ${this.getLevelColor(alert.level)}; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #666; 
              font-size: 12px; 
              background: #f0f0f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚨 ALERT</h1>
              <h2 style="margin: 10px 0 0 0;">${device.name}</h2>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <h2 style="margin-top: 0; color: ${this.getLevelColor(
                  alert.level
                )};">Alert Details</h2>
                <table>
                  <tr>
                    <td>Level:</td>
                    <td><strong style="color: ${this.getLevelColor(
                      alert.level
                    )};">${alert.level.toUpperCase()}</strong></td>
                  </tr>
                  <tr>
                    <td>Message:</td>
                    <td>${alert.message}</td>
                  </tr>
                  <tr>
                    <td>Time:</td>
                    <td>${new Date(alert.timestamp).toLocaleString("en-US", {
                      dateStyle: "full",
                      timeStyle: "long",
                    })}</td>
                  </tr>
                </table>
              </div>

              <div class="device-info">
                <h3 style="margin-top: 0; color: #333;">📡 Device Information</h3>
                <table>
                  <tr>
                    <td>Name:</td>
                    <td>${device.name}</td>
                  </tr>
                  <tr>
                    <td>IP Address:</td>
                    <td><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${
                      device.ip
                    }</code></td>
                  </tr>
                  <tr>
                    <td>Type:</td>
                    <td style="text-transform: capitalize;">${device.type}</td>
                  </tr>
                  <tr>
                    <td>Status:</td>
                    <td><strong style="color: ${this.getStatusColor(
                      device.status
                    )};">${device.status.toUpperCase()}</strong></td>
                  </tr>
                  ${
                    device.responseTime
                      ? `
                  <tr>
                    <td>Response Time:</td>
                    <td>${Math.round(device.responseTime)}ms</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Action Required:</strong> Please check the device immediately and take necessary actions to resolve the issue.
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }" class="button">
                  View Dashboard
                </a>
              </div>

              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                This alert was generated automatically by NetSentry Monitoring System.
              </p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} NetSentry Monitoring System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"NetSentry Alert" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: process.env.ALERT_EMAIL_TO,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Alert email sent to ${process.env.ALERT_EMAIL_TO}`);

      if (alert.update) {
        await alert.update({ emailSent: true });
      }

      return true;
    } catch (error) {
      logger.error("Error sending alert email:", error);
      return false;
    }
  }

  /**
   * Enviar email de teste
   */
  async sendTestEmail(to) {
    if (!this.initialized) {
      throw new Error("Email service not initialized");
    }

    try {
      const mailOptions = {
        from: `"NetSentry Monitoring" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to,
        subject: "✅ Test Email - NetSentry Monitoring System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
            <div style="background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 8px;">
              <h1 style="margin: 0;">✅ Email Configured Successfully!</h1>
            </div>
            <div style="background: white; padding: 30px; margin-top: 20px; border-radius: 8px;">
              <p style="font-size: 16px;">This is a test email from <strong>NetSentry Monitoring System</strong>.</p>
              <p>If you received this email, it means the email service is working correctly! 🎉</p>
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>✓</strong> SMTP Configuration: OK</p>
                <p style="margin: 10px 0 0 0;"><strong>✓</strong> Email Delivery: OK</p>
              </div>
              <p style="color: #666; margin-top: 30px; font-size: 12px;">
                Test time: ${new Date().toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "long",
                })}
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Test email sent to ${to}`);

      return true;
    } catch (error) {
      logger.error("Error sending test email:", error);
      throw error;
    }
  }

  /**
   * Enviar relatório diário
   */
  async sendDailyReport(stats, devices, alerts) {
    if (!this.initialized) {
      return false;
    }

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: #2196F3; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">📊 Daily Monitoring Report</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">
              ${new Date().toLocaleDateString("en-US", { dateStyle: "full" })}
            </p>
          </div>

          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #333;">General Summary</h2>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
              <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px;">
                <h3 style="margin: 0; font-size: 36px;">${
                  stats.devices.online
                }</h3>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Online</p>
              </div>
              <div style="background: #F44336; color: white; padding: 20px; text-align: center; border-radius: 8px;">
                <h3 style="margin: 0; font-size: 36px;">${
                  stats.devices.offline
                }</h3>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Offline</p>
              </div>
              <div style="background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px;">
                <h3 style="margin: 0; font-size: 36px;">${
                  stats.devices.warning
                }</h3>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Warning</p>
              </div>
              <div style="background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px;">
                <h3 style="margin: 0; font-size: 36px;">${
                  stats.devices.total
                }</h3>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Total</p>
              </div>
            </div>

            ${
              alerts.length > 0
                ? `
              <h2 style="color: #333;">Active Alerts (${alerts.length})</h2>
              <table style="width: 100%; background: white; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #333; color: white;">
                    <th style="padding: 15px; text-align: left;">Device</th>
                    <th style="padding: 15px; text-align: left;">Message</th>
                    <th style="padding: 15px; text-align: center;">Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${alerts
                    .slice(0, 10)
                    .map(
                      (alert) => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 12px;">${alert.device}</td>
                      <td style="padding: 12px;">${alert.message}</td>
                      <td style="padding: 12px; text-align: center;">
                        <span style="background: ${this.getLevelColor(
                          alert.level
                        )}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                          ${alert.level.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              ${
                alerts.length > 10
                  ? `<p style="color: #666;">And ${
                      alerts.length - 10
                    } more alerts...</p>`
                  : ""
              }
            `
                : '<div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 20px; border-radius: 4px;"><p style="margin: 0; color: #2e7d32;"><strong>✓</strong> No active alerts at the moment. All systems operational! 🎉</p></div>'
            }

            <p style="margin-top: 40px; color: #666; font-size: 12px; text-align: center;">
              This is an automatic daily report from NetSentry Monitoring System.
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"NetSentry Reports" <${
          process.env.EMAIL_FROM || process.env.EMAIL_USER
        }>`,
        to: process.env.ALERT_EMAIL_TO,
        subject: `📊 Daily Report - ${new Date().toLocaleDateString("en-US")}`,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Daily report sent to ${process.env.ALERT_EMAIL_TO}`);

      return true;
    } catch (error) {
      logger.error("Error sending daily report:", error);
      return false;
    }
  }

  /**
   * Cores por nível de alerta
   */
  getLevelColor(level) {
    const colors = {
      disaster: "#F44336",
      critical: "#E91E63",
      error: "#FF5722",
      warning: "#FF9800",
      information: "#2196F3",
      info: "#2196F3",
    };
    return colors[level.toLowerCase()] || "#9E9E9E";
  }

  /**
   * Cores por status
   */
  getStatusColor(status) {
    const colors = {
      online: "#4CAF50",
      offline: "#F44336",
      warning: "#FF9800",
    };
    return colors[status] || "#9E9E9E";
  }

  /**
   * Verificar se está inicializado
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = new EmailService();

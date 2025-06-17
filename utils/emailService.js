const nodemailer = require("nodemailer")
const { EmailConfiguration, EmailLog } = require("../models")

class EmailService {
  static async createTransporter(userId) {
    const emailConfig = await EmailConfiguration.findOne({
      where: { userId, isConfigured: true },
    })

    if (!emailConfig) {
      throw new Error("Email configuration not found or not configured")
    }

    // Enhanced configuration to handle SSL/TLS issues
    const transportConfig = {
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpSecure, // true for 465, false for other ports
      auth: {
        user: emailConfig.smtpUsername,
        pass: emailConfig.smtpPassword,
      },
      // Add TLS options to handle SSL/TLS version issues
      tls: {
        // Do not fail on invalid certificates (for development/testing)
        rejectUnauthorized: false,
        // Allow legacy SSL/TLS versions
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.3',
        // Ciphers to support older servers
        ciphers: 'SSLv3'
      },
      // If secure is false, try to use STARTTLS
      requireTLS: !emailConfig.smtpSecure,
      // Connection timeout
      connectionTimeout: 10000,
      // Socket timeout
      socketTimeout: 10000,
      // Enable debug logging for troubleshooting
      logger: false,
      debug: false
    }

    // Handle common port configurations
    if (emailConfig.smtpPort === 587) {
      // Port 587 typically uses STARTTLS
      transportConfig.secure = false
      transportConfig.requireTLS = true
    } else if (emailConfig.smtpPort === 465) {
      // Port 465 typically uses SSL/TLS from the start
      transportConfig.secure = true
      transportConfig.requireTLS = false
    } else if (emailConfig.smtpPort === 25) {
      // Port 25 typically doesn't use encryption by default
      transportConfig.secure = false
      transportConfig.requireTLS = false
      transportConfig.ignoreTLS = true
    }

    return nodemailer.createTransport(transportConfig)
  }

  static async sendEmail(userId, { to, subject, html, attachments = [] }) {
    const emailLog = await EmailLog.create({
      userId,
      recipientEmail: to,
      subject,
      body: html,
      attachmentCount: attachments.length,
      status: "Pending",
    })

    try {
      const transporter = await this.createTransporter(userId)

      const mailOptions = {
        from: (await EmailConfiguration.findOne({ where: { userId } })).emailAddress,
        to,
        subject,
        html,
        attachments,
      }

      const result = await transporter.sendMail(mailOptions)

      await emailLog.update({
        status: "Sent",
        sentAt: new Date(),
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      await emailLog.update({
        status: "Failed",
        errorMessage: error.message,
      })

      throw error
    }
  }

  static async testEmailConfiguration(userId) {
    try {
      const transporter = await this.createTransporter(userId)
      const emailConfig = await EmailConfiguration.findOne({ where: { userId } })

      // Verify the connection first
      await transporter.verify()

      await transporter.sendMail({
        from: emailConfig.emailAddress,
        to: emailConfig.emailAddress,
        subject: "Test Email Configuration",
        text: "This is a test email to verify your SMTP configuration.",
      })

      await emailConfig.update({
        lastTested: new Date(),
        testStatus: "Success",
      })

      return { success: true, message: "Email configuration test successful" }
    } catch (error) {
      const emailConfig = await EmailConfiguration.findOne({ where: { userId } })
      await emailConfig.update({
        lastTested: new Date(),
        testStatus: "Failed",
      })

      // Provide more detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        command: error.command,
        errno: error.errno,
        syscall: error.syscall
      }

      console.error('Email configuration test failed:', errorDetails)

      // Suggest common fixes based on error type
      let suggestion = ""
      if (error.code === 'ESOCKET' || error.message.includes('wrong version number')) {
        suggestion = "SSL/TLS version mismatch. Try using port 587 with STARTTLS instead of port 465 with SSL."
      } else if (error.code === 'EAUTH') {
        suggestion = "Authentication failed. Check your username and password."
      } else if (error.code === 'ECONNECTION') {
        suggestion = "Connection failed. Check your SMTP host and port settings."
      }

      throw new Error(`Email test failed: ${error.message}${suggestion ? ` Suggestion: ${suggestion}` : ''}`)
    }
  }

  static async testConnection(userId) {
    try {
      const transporter = await this.createTransporter(userId)
      
      // Just verify the connection without sending an email
      await transporter.verify()
      
      return { success: true, message: "SMTP connection successful" }
    } catch (error) {
      console.error('SMTP connection test failed:', error)
      
      let suggestion = ""
      if (error.code === 'ESOCKET' || error.message.includes('wrong version number')) {
        suggestion = "SSL/TLS version mismatch. Try different port/security combinations."
      } else if (error.code === 'EAUTH') {
        suggestion = "Authentication failed. Check credentials."
      } else if (error.code === 'ECONNECTION' || error.code === 'ENOTFOUND') {
        suggestion = "Connection failed. Check host and port."
      }
      
      throw new Error(`Connection test failed: ${error.message}${suggestion ? ` Suggestion: ${suggestion}` : ''}`)
    }
  }
}

module.exports = EmailService

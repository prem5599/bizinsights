// src/lib/email/service.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string[]
  subject: string
  template: string
  data: Record<string, any>
}

export class EmailService {
  private fromEmail: string

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@bizinsights.com'
  }

  async sendInsightDigest(
    email: string,
    organizationName: string,
    insights: any[]
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `📊 Weekly Insights for ${organizationName}`,
        html: this.generateInsightDigestHTML(organizationName, insights)
      })
    } catch (error) {
      console.error('Failed to send insight digest:', error)
      throw error
    }
  }

  async sendIntegrationAlert(
    email: string,
    organizationName: string,
    integration: string,
    issue: string
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `⚠️ Integration Issue: ${integration}`,
        html: this.generateIntegrationAlertHTML(organizationName, integration, issue)
      })
    } catch (error) {
      console.error('Failed to send integration alert:', error)
      throw error
    }
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    organizationName: string
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `Welcome to BizInsights! 🎉`,
        html: this.generateWelcomeHTML(name, organizationName)
      })
    } catch (error) {
      console.error('Failed to send welcome email:', error)
      throw error
    }
  }

  private generateInsightDigestHTML(organizationName: string, insights: any[]): string {
    const topInsights = insights.slice(0, 5)
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Insights - ${organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px; }
            .insight { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }
            .footer { text-align: center; margin-top: 30px; color: #666; }
            .btn { background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Insights</h1>
              <p>Here are the latest insights for ${organizationName}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h2>Top Insights This Week</h2>
              ${topInsights.map(insight => `
                <div class="insight">
                  <h3>${insight.title}</h3>
                  <p>${insight.description}</p>
                  <small>Impact Score: ${insight.impactScore}/10</small>
                </div>
              `).join('')}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard/insights" class="btn">
                View All Insights
              </a>
            </div>
            
            <div class="footer">
              <p>You're receiving this because you're a member of ${organizationName}</p>
              <p><small>BizInsights - Smart Analytics for Small Businesses</small></p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateIntegrationAlertHTML(organizationName: string, integration: string, issue: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Integration Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #FEF2F2; border: 1px solid #FECACA; padding: 20px; border-radius: 8px; }
            .btn { background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">
              <h1>⚠️ Integration Issue Detected</h1>
              <p><strong>Organization:</strong> ${organizationName}</p>
              <p><strong>Integration:</strong> ${integration}</p>
              <p><strong>Issue:</strong> ${issue}</p>
              
              <div style="margin: 20px 0;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/integrations" class="btn">
                  Fix Integration
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateWelcomeHTML(name: string, organizationName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to BizInsights!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 30px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; }
            .step { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .btn { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to BizInsights!</h1>
              <p>Smart Analytics for ${organizationName}</p>
            </div>
            
            <div class="content">
              <p>Hi ${name},</p>
              
              <p>Welcome to BizInsights! We're excited to help you unlock powerful insights from your business data.</p>
              
              <h2>Get Started in 3 Steps:</h2>
              
              <div class="step">
                <h3>1. Connect Your First Integration</h3>
                <p>Link Shopify, Stripe, or Google Analytics to start seeing your data</p>
              </div>
              
              <div class="step">
                <h3>2. Explore Your Dashboard</h3>
                <p>View real-time metrics and trends across all your platforms</p>
              </div>
              
              <div class="step">
                <h3>3. Get AI-Powered Insights</h3>
                <p>Discover opportunities and recommendations to grow your business</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard" class="btn">
                  Get Started Now
                </a>
              </div>
              
              <p>Need help? Reply to this email or contact us at ${process.env.SUPPORT_EMAIL}</p>
              
              <p>Best regards,<br>The BizInsights Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export const emailService = new EmailService()



// lib/reports/emailer.ts
import { ReportData } from './generator'
import { prisma } from '@/lib/prisma'

export class ReportEmailer {
  /**
   * Send weekly report email
   */
  static async sendWeeklyReport(
    recipientEmail: string,
    recipientName: string,
    reportData: ReportData
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateWeeklyEmailHTML(reportData, recipientName)
      const subject = `Weekly Business Report - ${reportData.organization.name}`
      
      return await this.sendEmail(recipientEmail, subject, htmlContent)
    } catch (error) {
      console.error('Failed to send weekly report:', error)
      return false
    }
  }

  /**
   * Send monthly report email
   */
  static async sendMonthlyReport(
    recipientEmail: string,
    recipientName: string,
    reportData: ReportData
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateMonthlyEmailHTML(reportData, recipientName)
      const subject = `Monthly Business Report - ${reportData.organization.name}`
      
      return await this.sendEmail(recipientEmail, subject, htmlContent)
    } catch (error) {
      console.error('Failed to send monthly report:', error)
      return false
    }
  }

  /**
   * Generate HTML email template for weekly reports
   */
  private static generateWeeklyEmailHTML(reportData: ReportData, recipientName: string): string {
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

    const formatNumber = (value: number) => 
      new Intl.NumberFormat('en-US').format(value)

    const formatPercentage = (value: number) => 
      `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

    const getChangeIcon = (value: number) => value > 0 ? '📈' : value < 0 ? '📉' : '➡️'

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Business Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .metric-value { font-size: 28px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
        .metric-change { font-size: 14px; font-weight: 500; }
        .metric-change.positive { color: #059669; }
        .metric-change.negative { color: #dc2626; }
        .metric-change.neutral { color: #6b7280; }
        .insights { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .recommendations { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
        .score-circle { display: inline-block; width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(#10b981 ${reportData.summary.performanceScore * 3.6}deg, #e5e7eb 0deg); position: relative; }
        .score-circle::after { content: '${reportData.summary.performanceScore}'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">📊 Weekly Business Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            ${reportData.organization.name} • ${reportData.period.start.toLocaleDateString()} - ${reportData.period.end.toLocaleDateString()}
          </p>
        </div>

        <div class="content">
          <h2 style="color: #1e293b; margin-bottom: 5px;">Hi ${recipientName}! 👋</h2>
          <p style="color: #64748b; margin-bottom: 30px;">
            Here's your weekly business performance summary. Your performance score this week is 
            <strong style="color: #3b82f6;">${reportData.summary.performanceScore}/100</strong>.
          </p>

          <div class="grid">
            <div class="metric-card">
              <h3 style="margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Revenue</h3>
              <div class="metric-value">${formatCurrency(reportData.summary.totalRevenue)}</div>
              <div class="metric-change ${reportData.summary.revenueChange > 0 ? 'positive' : reportData.summary.revenueChange < 0 ? 'negative' : 'neutral'}">
                ${getChangeIcon(reportData.summary.revenueChange)} ${formatPercentage(reportData.summary.revenueChange)} vs last week
              </div>
            </div>

            <div class="metric-card">
              <h3 style="margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Orders</h3>
              <div class="metric-value">${formatNumber(reportData.summary.totalOrders)}</div>
              <div class="metric-change ${reportData.summary.ordersChange > 0 ? 'positive' : reportData.summary.ordersChange < 0 ? 'negative' : 'neutral'}">
                ${getChangeIcon(reportData.summary.ordersChange)} ${formatPercentage(reportData.summary.ordersChange)} vs last week
              </div>
            </div>

            <div class="metric-card">
              <h3 style="margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Avg Order Value</h3>
              <div class="metric-value">${formatCurrency(reportData.summary.avgOrderValue)}</div>
              <div class="metric-change neutral">
                💰 Revenue per order
              </div>
            </div>

            <div class="metric-card">
              <h3 style="margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Conversion Rate</h3>
              <div class="metric-value">${reportData.summary.conversionRate.toFixed(1)}%</div>
              <div class="metric-change neutral">
                🎯 Visitors who purchased
              </div>
            </div>
          </div>

          ${reportData.insights.length > 0 ? `
          <div class="insights">
            <h3 style="margin: 0 0 15px 0; color: #1e40af;">🤖 Key Insights</h3>
            ${reportData.insights.slice(0, 3).map(insight => `
              <div style="margin-bottom: 15px;">
                <strong style="color: #1e293b;">${insight.title}</strong>
                <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">${insight.description}</p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${reportData.recommendations.length > 0 ? `
          <div class="recommendations">
            <h3 style="margin: 0 0 15px 0; color: #059669;">💡 Recommendations</h3>
            ${reportData.recommendations.slice(0, 3).map(rec => `
              <div style="margin-bottom: 15px;">
                <strong style="color: #1e293b;">${rec.title}</strong>
                <p style="margin: 5px 0 0 0; color: #475569; font-size: 14px;">${rec.description}</p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/dashboard" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              View Full Dashboard →
            </a>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;">
            This report was automatically generated by BizInsights.<br>
            <a href="${process.env.APP_URL}/dashboard/settings" style="color: #3b82f6;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Generate HTML email template for monthly reports
   */
  private static generateMonthlyEmailHTML(reportData: ReportData, recipientName: string): string {
    // Similar to weekly but with more detailed sections
    return this.generateWeeklyEmailHTML(reportData, recipientName)
      .replace('Weekly Business Report', 'Monthly Business Report')
      .replace('weekly business performance', 'monthly business performance')
      .replace('vs last week', 'vs last month')
  }

  /**
   * Send email using your email service
   */
  private static async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      // In production, integrate with your email service (Resend, SendGrid, etc.)
      // For now, we'll just log the email
      console.log('📧 Email would be sent:')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log('HTML content generated successfully')

      // Simulate successful email sending
      return true

      // Example Resend integration:
      /*
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const { data, error } = await resend.emails.send({
        from: 'BizInsights <reports@bizinsights.com>',
        to: [to],
        subject: subject,
        html: htmlContent,
      })

      if (error) {
        console.error('Email send error:', error)
        return false
      }

      return true
      */
    } catch (error) {
      console.error('Email service error:', error)
      return false
    }
  }

  /**
   * Send report to all organization members
   */
  static async sendReportToOrganization(
    organizationId: string,
    reportData: ReportData,
    reportType: 'weekly' | 'monthly'
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Get organization members
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        include: { user: true }
      })

      let sent = 0
      let failed = 0

      for (const member of members) {
        try {
          const success = reportType === 'weekly' 
            ? await this.sendWeeklyReport(member.user.email, member.user.name || 'User', reportData)
            : await this.sendMonthlyReport(member.user.email, member.user.name || 'User', reportData)

          if (success) {
            sent++
          } else {
            failed++
          }
        } catch (error) {
          console.error(`Failed to send report to ${member.user.email}:`, error)
          failed++
        }
      }

      return { sent, failed }
    } catch (error) {
      console.error('Failed to send reports to organization:', error)
      return { sent: 0, failed: 1 }
    }
  }
}
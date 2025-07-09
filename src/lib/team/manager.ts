// lib/team/manager.ts
import { prisma } from '@/lib/prisma'

export interface TeamMember {
  id: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface TeamInvitation {
  id: string
  organizationId: string
  email: string
  role: string
  invitedBy: string
  token: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface TeamPermissions {
  canRead: boolean
  canWrite: boolean
  canAdmin: boolean
  canBilling: boolean
  canInvite: boolean
  canManageIntegrations: boolean
  canViewReports: boolean
  canExportData: boolean
}

export class TeamManager {
  /**
   * Get all team members for an organization
   */
  static async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // owners first, then admins, etc.
        { createdAt: 'asc' }
      ]
    })
  }

  /**
   * Get pending invitations for an organization
   */
  static async getPendingInvitations(organizationId: string): Promise<TeamInvitation[]> {
    return prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Invite a new team member
   */
  static async inviteTeamMember(
    organizationId: string,
    email: string,
    role: 'admin' | 'member' | 'viewer',
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: TeamInvitation; error?: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' }
      }

      // Check if user already exists in organization
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          user: { email: email.toLowerCase() }
        }
      })

      if (existingMember) {
        return { success: false, error: 'User is already a member of this organization' }
      }

      // Check if invitation already exists
      const existingInvitation = await prisma.organizationInvitation.findFirst({
        where: {
          organizationId,
          email: email.toLowerCase(),
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        }
      })

      if (existingInvitation) {
        return { success: false, error: 'Invitation already sent to this email' }
      }

      // Create invitation
      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId,
          email: email.toLowerCase(),
          role,
          invitedBy,
          token: this.generateInvitationToken(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })

      // Send invitation email
      await this.sendInvitationEmail(invitation, organizationId)

      return { success: true, invitation }
    } catch (error) {
      console.error('Failed to invite team member:', error)
      return { success: false, error: 'Failed to send invitation' }
    }
  }

  /**
   * Accept team invitation
   */
  static async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
    try {
      // Find valid invitation
      const invitation = await prisma.organizationInvitation.findFirst({
        where: {
          token,
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        },
        include: { organization: true }
      })

      if (!invitation) {
        return { success: false, error: 'Invalid or expired invitation' }
      }

      // Check if user email matches invitation
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || user.email.toLowerCase() !== invitation.email) {
        return { success: false, error: 'Email mismatch' }
      }

      // Create organization member
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      })

      // Mark invitation as accepted
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      return { success: true, member }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      return { success: false, error: 'Failed to accept invitation' }
    }
  }

  /**
   * Update team member role
   */
  static async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: 'admin' | 'member' | 'viewer',
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the updater has permission
      const updaterMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: updatedBy,
          role: { in: ['owner', 'admin'] }
        }
      })

      if (!updaterMember) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Don't allow changing owner role
      const targetMember = await prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId }
      })

      if (!targetMember) {
        return { success: false, error: 'Member not found' }
      }

      if (targetMember.role === 'owner') {
        return { success: false, error: 'Cannot change owner role' }
      }

      // Update role
      await prisma.organizationMember.update({
        where: { id: memberId },
        data: { role: newRole }
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to update member role:', error)
      return { success: false, error: 'Failed to update role' }
    }
  }

  /**
   * Remove team member
   */
  static async removeMember(
    organizationId: string,
    memberId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the remover has permission
      const removerMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: removedBy,
          role: { in: ['owner', 'admin'] }
        }
      })

      if (!removerMember) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Don't allow removing owner
      const targetMember = await prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId }
      })

      if (!targetMember) {
        return { success: false, error: 'Member not found' }
      }

      if (targetMember.role === 'owner') {
        return { success: false, error: 'Cannot remove owner' }
      }

      // Don't allow removing yourself
      if (targetMember.userId === removedBy) {
        return { success: false, error: 'Cannot remove yourself' }
      }

      // Remove member
      await prisma.organizationMember.delete({
        where: { id: memberId }
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to remove member:', error)
      return { success: false, error: 'Failed to remove member' }
    }
  }

  /**
   * Cancel pending invitation
   */
  static async cancelInvitation(
    organizationId: string,
    invitationId: string,
    cancelledBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify permissions
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: cancelledBy,
          role: { in: ['owner', 'admin'] }
        }
      })

      if (!member) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Delete invitation
      await prisma.organizationInvitation.delete({
        where: { 
          id: invitationId,
          organizationId
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
      return { success: false, error: 'Failed to cancel invitation' }
    }
  }

  /**
   * Get team member permissions
   */
  static getPermissions(role: string): TeamPermissions {
    const permissions: Record<string, TeamPermissions> = {
      owner: {
        canRead: true,
        canWrite: true,
        canAdmin: true,
        canBilling: true,
        canInvite: true,
        canManageIntegrations: true,
        canViewReports: true,
        canExportData: true
      },
      admin: {
        canRead: true,
        canWrite: true,
        canAdmin: true,
        canBilling: false,
        canInvite: true,
        canManageIntegrations: true,
        canViewReports: true,
        canExportData: true
      },
      member: {
        canRead: true,
        canWrite: true,
        canAdmin: false,
        canBilling: false,
        canInvite: false,
        canManageIntegrations: false,
        canViewReports: true,
        canExportData: false
      },
      viewer: {
        canRead: true,
        canWrite: false,
        canAdmin: false,
        canBilling: false,
        canInvite: false,
        canManageIntegrations: false,
        canViewReports: true,
        canExportData: false
      }
    }

    return permissions[role] || permissions.viewer
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(
    organizationId: string,
    userId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    try {
      const member = await prisma.organizationMember.findFirst({
        where: { organizationId, userId }
      })

      if (!member) return false

      const permissions = this.getPermissions(member.role)
      return permissions[permission]
    } catch (error) {
      console.error('Permission check failed:', error)
      return false
    }
  }

  /**
   * Generate invitation token
   */
  private static generateInvitationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Send invitation email
   */
  private static async sendInvitationEmail(
    invitation: TeamInvitation,
    organizationId: string
  ): Promise<void> {
    try {
      // Get organization details
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!organization) return

      // Get inviter details
      const inviter = await prisma.user.findUnique({
        where: { id: invitation.invitedBy }
      })

      const inviteUrl = `${process.env.APP_URL}/invite/${invitation.token}`

      // In production, send actual email
      console.log('📧 Team invitation email:')
      console.log(`To: ${invitation.email}`)
      console.log(`Subject: You're invited to join ${organization.name} on BizInsights`)
      console.log(`Invite URL: ${inviteUrl}`)
      console.log(`Invited by: ${inviter?.name || inviter?.email}`)
      console.log(`Role: ${invitation.role}`)

      // TODO: Implement actual email sending with your email service
    } catch (error) {
      console.error('Failed to send invitation email:', error)
    }
  }
}
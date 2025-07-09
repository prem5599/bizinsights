'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Mail, Crown, Shield, Eye, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending' | 'suspended'
  joinedAt: string
  lastActive: string
  avatar?: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  invitedBy: string
  invitedAt: string
  expiresAt: string
}

export default function TeamPage() {
  const { data: session } = useSession()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  })

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      setIsLoading(true)
      // Mock data - replace with actual API calls
      setTeamMembers([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@company.com',
          role: 'owner',
          status: 'active',
          joinedAt: '2024-01-15',
          lastActive: '2 minutes ago',
          avatar: '/avatars/john.jpg'
        },
        {
          id: '2',
          name: 'Sarah Smith',
          email: 'sarah@company.com',
          role: 'admin',
          status: 'active',
          joinedAt: '2024-02-20',
          lastActive: '1 hour ago',
          avatar: '/avatars/sarah.jpg'
        },
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike@company.com',
          role: 'member',
          status: 'active',
          joinedAt: '2024-03-10',
          lastActive: '3 days ago'
        }
      ])

      setPendingInvitations([
        {
          id: '1',
          email: 'pending@company.com',
          role: 'member',
          invitedBy: 'John Doe',
          invitedAt: '2024-07-08',
          expiresAt: '2024-07-15'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch team data:', error)
      toast.error('Failed to load team data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(`Invitation sent to ${inviteForm.email}`)
      setIsInviteDialogOpen(false)
      setInviteForm({ email: '', role: 'member' })
      fetchTeamData()
    } catch (error) {
      toast.error('Failed to send invitation')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTeamMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole as any } : member
      ))
      
      toast.success('Role updated successfully')
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTeamMembers(prev => prev.filter(member => member.id !== memberId))
      toast.success('Team member removed')
    } catch (error) {
      toast.error('Failed to remove team member')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      toast.success('Invitation cancelled')
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'member':
        return <UserCheck className="h-4 w-4 text-green-500" />
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your team members and their permissions
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to add a new member to your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Can view data only</SelectItem>
                      <SelectItem value="member">Member - Can view and edit</SelectItem>
                      <SelectItem value="admin">Admin - Full access except billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send Invitation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} active member{teamMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(member.role)}
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {member.lastActive}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                            Change to Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'member')}>
                            Change to Member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'viewer')}>
                            Change to Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {invitation.invitedBy}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Team Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Levels</CardTitle>
          <CardDescription>
            Understanding team member roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-medium">Owner</div>
                <div className="text-sm text-gray-600">
                  Full access to all features, billing, and team management
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Admin</div>
                <div className="text-sm text-gray-600">
                  Can manage team members, integrations, and all data
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <UserCheck className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Member</div>
                <div className="text-sm text-gray-600">
                  Can view and edit data, create reports and insights
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-medium">Viewer</div>
                <div className="text-sm text-gray-600">
                  Read-only access to dashboards and reports
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { SalesTeam } from '../models/SalesTeam.js'

/**
 * Resolve the CRM tenant for this request.
 * - Owner of a SalesTeam → own workspace
 * - Member (matched by clerkUserId) of someone's team → owner's workspace
 * - Otherwise → personal workspace
 */
export async function resolveSalesWorkspace(req) {
  const personal = req.workspaceId
  const clerkUserId = req.clerkUserId || ''

  if (!personal) {
    return {
      salesWorkspaceId: null,
      isOwner: false,
      isMember: false,
      team: null,
    }
  }

  let team = await SalesTeam.findOne({ ownerWorkspaceId: personal }).lean()
  if (team) {
    return {
      salesWorkspaceId: personal,
      isOwner: true,
      isMember: true,
      team,
    }
  }

  if (clerkUserId) {
    team = await SalesTeam.findOne({ 'members.clerkUserId': clerkUserId }).lean()
    if (team) {
      return {
        salesWorkspaceId: team.ownerWorkspaceId,
        isOwner: false,
        isMember: true,
        team,
      }
    }
  }

  // Lazy-create empty team for owner so settings always work
  return {
    salesWorkspaceId: personal,
    isOwner: true,
    isMember: true,
    team: null,
  }
}

export async function ensureSalesTeam(ownerWorkspaceId, { clerkUserId = '', email = '' } = {}) {
  let team = await SalesTeam.findOne({ ownerWorkspaceId })
  if (!team) {
    team = await SalesTeam.create({
      ownerWorkspaceId,
      ownerClerkUserId: clerkUserId,
      ownerEmail: email,
      revenueGoal: 0,
      members: [],
      invites: [],
    })
  } else if (clerkUserId && !team.ownerClerkUserId) {
    team.ownerClerkUserId = clerkUserId
    if (email) team.ownerEmail = email
    await team.save()
  }
  return team
}

export function mapTeam(team, { isOwner = false } = {}) {
  if (!team) {
    return {
      revenueGoal: 0,
      members: [],
      invites: [],
      isOwner,
      ownerWorkspaceId: null,
    }
  }
  return {
    id: team._id?.toString?.() || team.id,
    ownerWorkspaceId: team.ownerWorkspaceId,
    revenueGoal: team.revenueGoal || 0,
    isOwner,
    members: (team.members || []).map((m) => ({
      id: m._id?.toString?.() || m.id,
      name: m.name,
      role: m.role,
      commissionPercent: m.commissionPercent || 0,
      clerkUserId: m.clerkUserId || '',
      email: m.email || '',
      linked: Boolean(m.clerkUserId),
    })),
    invites: isOwner
      ? (team.invites || []).map((i) => ({
          id: i._id?.toString?.() || i.id,
          email: i.email,
          role: i.role,
          name: i.name || '',
          expiresAt: i.expiresAt?.toISOString?.() || i.expiresAt,
          token: i.token,
        }))
      : [],
  }
}

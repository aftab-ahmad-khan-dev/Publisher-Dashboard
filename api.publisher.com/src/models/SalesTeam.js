import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['setter', 'closer', 'both'],
      default: 'both',
    },
    commissionPercent: { type: Number, default: 0 },
    clerkUserId: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: true },
)

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['setter', 'closer', 'both'],
      default: 'both',
    },
    name: { type: String, default: '' },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: true },
)

const salesTeamSchema = new mongoose.Schema(
  {
    ownerWorkspaceId: { type: String, required: true, unique: true, index: true },
    ownerClerkUserId: { type: String, default: '' },
    ownerEmail: { type: String, default: '' },
    revenueGoal: { type: Number, default: 0 },
    members: { type: [memberSchema], default: [] },
    invites: { type: [inviteSchema], default: [] },
  },
  { timestamps: true },
)

salesTeamSchema.index({ 'members.clerkUserId': 1 })
salesTeamSchema.index({ 'invites.token': 1 })

export const SalesTeam = mongoose.model('SalesTeam', salesTeamSchema)

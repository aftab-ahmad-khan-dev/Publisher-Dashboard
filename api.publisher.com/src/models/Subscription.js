import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, default: '' },
    plan: {
      type: String,
      enum: ['none', 'starter', 'growth', 'pro'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'active', 'rejected'],
      default: 'unpaid',
    },
    activatedAt: { type: Date, default: null },
    activatedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

export const Subscription = mongoose.model('Subscription', subscriptionSchema)

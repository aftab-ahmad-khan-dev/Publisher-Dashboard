import mongoose from 'mongoose'

const workspaceMigrationSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, index: true },
    fromWorkspaceId: { type: String, required: true },
    toWorkspaceId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

workspaceMigrationSchema.index({ clerkUserId: 1, fromWorkspaceId: 1 }, { unique: true })

export const WorkspaceMigration = mongoose.model('WorkspaceMigration', workspaceMigrationSchema)

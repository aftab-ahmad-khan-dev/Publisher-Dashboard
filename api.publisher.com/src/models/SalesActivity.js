import mongoose from 'mongoose'

const salesActivitySchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    /** YYYY-MM-DD */
    date: { type: String, required: true },
    setterName: { type: String, required: true, trim: true },
    dials: { type: Number, default: 0 },
    dmsSent: { type: Number, default: 0 },
    conversations: { type: Number, default: 0 },
  },
  { timestamps: true },
)

salesActivitySchema.index(
  { workspaceId: 1, date: 1, setterName: 1 },
  { unique: true },
)

export const SalesActivity = mongoose.model('SalesActivity', salesActivitySchema)

import mongoose from 'mongoose'

const paymentSubmissionSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    userEmail: { type: String, default: '' },
    planRequested: {
      type: String,
      enum: ['starter', 'growth', 'pro'],
      required: true,
    },
    bankMethod: {
      type: String,
      enum: ['jazzcash', 'ubl', 'nayapay', 'meezan'],
      required: true,
    },
    receiptMediaId: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: '' },
    rejectReason: { type: String, default: '' },
  },
  { timestamps: true },
)

paymentSubmissionSchema.index({ workspaceId: 1, createdAt: -1 })

export const PaymentSubmission = mongoose.model('PaymentSubmission', paymentSubmissionSchema)

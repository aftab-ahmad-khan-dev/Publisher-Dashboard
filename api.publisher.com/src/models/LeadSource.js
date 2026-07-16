import mongoose from 'mongoose'

const leadSourceSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, default: 'Lead source' },
    type: { type: String, enum: ['xlsx', 'sheets', 'csv'], required: true },
    spreadsheetId: String,
    spreadsheetUrl: String,
    /** Original / updated workbook bytes for xlsx write-back + export */
    fileData: Buffer,
    fileName: String,
    contentType: { type: String, default: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    sheetsMeta: [
      {
        sheetName: String,
        ok: Boolean,
        columnMap: mongoose.Schema.Types.Mixed,
        headerRowIndex: Number,
        leadCount: Number,
      },
    ],
    selectedSheets: [String],
    skipAlreadyEmailed: { type: Boolean, default: true },
    stats: {
      leads: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      quarantine: { type: Number, default: 0 },
    },
    lastSyncAt: Date,
  },
  { timestamps: true },
)

export const LeadSource = mongoose.model('LeadSource', leadSourceSchema)

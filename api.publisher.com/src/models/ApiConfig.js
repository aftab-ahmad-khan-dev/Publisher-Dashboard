import mongoose from 'mongoose'

const apiConfigSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    meta: {
      appId: String,
      appSecret: String,
      pageToken: String,
    },
    linkedin: {
      clientId: String,
      clientSecret: String,
      orgUrn: String,
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
    },
    reddit: {
      clientId: String,
      clientSecret: String,
      refreshToken: String,
      subreddit: String,
      userAgent: String,
    },
    quora: {
      profileUrl: String,
      defaultTopic: String,
    },
    gmail: {
      clientId: String,
      clientSecret: String,
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
      fromEmail: String,
    },
    webhookUrl: String,
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const ApiConfig = mongoose.model('ApiConfig', apiConfigSchema)

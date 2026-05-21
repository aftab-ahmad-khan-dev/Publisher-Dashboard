import mongoose from 'mongoose'

let connected = false

export async function connectDb() {
  const uri = process.env.DATABASE?.trim()
  if (!uri) {
    throw new Error('DATABASE is not set in api.publisher.com/.env')
  }
  if (connected) return mongoose.connection
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  connected = true
  console.log('MongoDB connected:', mongoose.connection.name)
  return mongoose.connection
}

export function isDbReady() {
  return connected && mongoose.connection.readyState === 1
}

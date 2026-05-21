import { Router } from 'express'
import dataRoutes from './routes/data.js'
import publishRoutes from './routes/publish.js'
import eventsRoutes from './routes/events.js'
import authRoutes from './routes/auth.js'
import cronRoutes from './routes/cron.js'

const router = Router()

router.use(dataRoutes)
router.use(publishRoutes)
router.use(eventsRoutes)
router.use(authRoutes)
router.use(cronRoutes)

export default router

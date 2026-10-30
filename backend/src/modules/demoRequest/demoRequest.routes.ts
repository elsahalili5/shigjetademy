import { Router } from 'express'
import { DemoRequestController } from './demoRequest.controller.ts'

const router = Router()

router.post('/', DemoRequestController.createDemoRequest)

export default router

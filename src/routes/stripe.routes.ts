import { Router } from 'express';
import express from 'express';
import prisma from '../config/database.config';
import { DonationRepository } from '../repositories/donation.repository';
import { DonationService } from '../services/donation.service';
import { DonationController } from '../controllers/donation.controller';

/**
 * Stripe Routes
 *
 * The webhook needs the RAW request body for signature verification, so this
 * router is mounted (in app.ts) BEFORE the global express.json() parser and the
 * route applies express.raw() locally.
 */
const router = Router();

const donationRepository = new DonationRepository(prisma);
const donationService = new DonationService(donationRepository);
const donationController = new DonationController(donationService);

router.post('/webhook', express.raw({ type: 'application/json' }), donationController.webhook);

export default router;

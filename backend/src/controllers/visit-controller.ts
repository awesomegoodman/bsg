import type { RequestHandler } from 'express';
import { checkInSchema, checkOutSchema } from '@diaspora/shared';
import type { VisitService } from '../services/visit-service.js';

export class VisitController {
  constructor(private service: VisitService) {}
  checkIn: RequestHandler = async (req, res) => {
    res
      .status(201)
      .json(
        await this.service.checkIn(
          checkInSchema.parse(req.body),
          'Self-service',
        ),
      );
  };
  register: RequestHandler = async (req, res) => {
    res
      .status(201)
      .json(
        await this.service.checkIn(
          checkInSchema.parse(req.body),
          'Receptionist',
        ),
      );
  };
  checkOut: RequestHandler = async (req, res) => {
    res.json(
      await this.service.checkOut(checkOutSchema.parse(req.body).visitId),
    );
  };
}

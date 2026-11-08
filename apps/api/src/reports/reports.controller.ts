import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ReportDto } from '../admissions/dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() body: ReportDto, @Req() req: Request) {
    const r = this.reports.create(body.admissionId, body.message, req.ip ?? 'unknown');
    return { id: r.id, status: r.status };
  }
}

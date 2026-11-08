import { Module } from '@nestjs/common';
import { AdmissionsModule } from '../admissions/admissions.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { CoverageService } from '../coverage/coverage.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [AdmissionsModule, ReportsModule],
  controllers: [AdminController],
  providers: [CoverageService],
})
export class AdminModule {}

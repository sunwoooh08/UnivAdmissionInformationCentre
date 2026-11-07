import { Module } from '@nestjs/common';
import { AdmissionsModule } from '../admissions/admissions.module.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [AdmissionsModule],
  controllers: [AdminController],
})
export class AdminModule {}

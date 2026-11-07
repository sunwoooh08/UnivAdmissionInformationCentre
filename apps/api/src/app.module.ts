import { Module } from '@nestjs/common';
import { AccessLogModule } from './access-log/access-log.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AdmissionsModule } from './admissions/admissions.module.js';
import { HealthController } from './health.controller.js';
import { ScheduleModule } from './schedule/schedule.module.js';

@Module({
  imports: [AccessLogModule, ScheduleModule, AdmissionsModule, AdminModule],
  controllers: [HealthController],
})
export class AppModule {}

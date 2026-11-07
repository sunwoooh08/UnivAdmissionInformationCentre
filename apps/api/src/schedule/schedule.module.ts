import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller.js';

@Module({ controllers: [ScheduleController] })
export class ScheduleModule {}

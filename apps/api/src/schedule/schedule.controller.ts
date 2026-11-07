import { Controller, Get } from '@nestjs/common';
import { COMMON_SCHEDULE } from './common-schedule.js';

@Controller('schedule')
export class ScheduleController {
  @Get()
  get() {
    return COMMON_SCHEDULE;
  }
}

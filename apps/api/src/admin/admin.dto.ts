import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import type { AccessAction } from '../access-log/access-log.service.js';

const ACTIONS: AccessAction[] = ['search', 'view', 'outlook', 'schedule', 'create', 'update', 'delete'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class LogRangeDto {
  @IsOptional() @Matches(DAY)
  from?: string;

  @IsOptional() @Matches(DAY)
  to?: string;
}

export class LogQueryDto extends LogRangeDto {
  @IsOptional() @IsIn(ACTIONS)
  action?: AccessAction;

  @IsOptional() @IsString()
  admissionId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  limit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number;
}

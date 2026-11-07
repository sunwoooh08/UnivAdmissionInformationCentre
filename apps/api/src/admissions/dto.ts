import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CATEGORIES, type Category } from '@susi/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const DATE_MSG = '날짜는 YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm 형식이어야 합니다.';

export class HistoryYearDto {
  @IsInt() @Min(2000) @Max(2100)
  year: number;

  @IsInt() @Min(1) @Max(5000)
  quota: number;

  @IsInt() @Min(0) @Max(10000)
  filled: number;
}

export class ScheduleDto {
  @IsOptional() @Matches(DATE_RE, { message: DATE_MSG })
  first: string | null;

  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @Matches(DATE_RE, { each: true, message: DATE_MSG })
  exam: [string, string] | null;

  @Matches(DATE_RE, { message: DATE_MSG })
  final: string;

  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @Matches(DATE_RE, { each: true, message: DATE_MSG })
  register?: [string, string] | null;

  @IsOptional() @Matches(DATE_RE, { message: DATE_MSG })
  waitlistEnd?: string | null;

  @IsOptional() @Matches(DATE_RE, { message: DATE_MSG })
  waitlistRegEnd?: string | null;
}

export class AdmissionInputDto {
  @IsString() @MinLength(1) @MaxLength(60)
  univ: string;

  @IsString() @MinLength(1) @MaxLength(80)
  track: string;

  @IsIn(CATEGORIES as Category[])
  category: Category;

  @IsString() @MinLength(1) @MaxLength(80)
  dept: string;

  @IsInt() @Min(1) @Max(5000)
  quota: number;

  @ValidateNested() @Type(() => ScheduleDto)
  schedule: ScheduleDto;

  @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => HistoryYearDto)
  history: HistoryYearDto[];
}

export class SearchQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsIn(CATEGORIES as Category[])
  category?: Category;
}

export class OutlookQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  rank: number;
}

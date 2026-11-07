import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CATEGORIES, type AdmissionDraft, type Category, type CoverageEntry, type IngestOutcome } from '@susi/shared';

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

/** 수집기 → API. 각 항목의 내용 검증은 @susi/shared 의 규칙이 맡는다. */
export class IngestDto {
  @IsString() @Matches(/^[a-z0-9][a-z0-9._-]{1,62}$/)
  collector: string;

  @IsArray() @ArrayMaxSize(5000)
  drafts: AdmissionDraft[];
}

export class IngestLogQueryDto {
  @IsOptional() @IsString() @MaxLength(40)
  runId?: string;

  @IsOptional() @IsIn(['created', 'updated', 'unchanged', 'pending', 'rejected'])
  outcome?: IngestOutcome;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  limit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number;
}

export class AdminListQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsIn(['published', 'pending', 'hidden'])
  state?: 'published' | 'pending' | 'hidden';
}

export class ReportDto {
  @IsString() @MinLength(1) @MaxLength(40)
  admissionId: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  message: string;
}

export class CoverageDto {
  @IsArray() @ArrayMaxSize(1000)
  entries: CoverageEntry[];
}

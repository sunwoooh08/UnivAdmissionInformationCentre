import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { AdmissionsService } from './admissions.service.js';
import { OutlookQueryDto, SearchQueryDto } from './dto.js';

@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.admissions.search(query.q, query.category);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.admissions.get(id);
  }

  @Get(':id/outlook')
  outlook(@Param('id') id: string, @Query() query: OutlookQueryDto) {
    const result = this.admissions.outlook(id, query.rank);
    if (!result) throw new NotFoundException('충원 이력이 없어 계산할 수 없습니다.');
    return result;
  }
}

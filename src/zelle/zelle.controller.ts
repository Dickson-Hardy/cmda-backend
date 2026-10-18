import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { AdminRole } from '../admin/admin.constant';
import { ParseObjectIdPipe } from '../_global/pipes/parse-object-id.pipe';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { CreateZelleDto, ReviewZelleDto, ZelleProofDto, ZelleSettingsDto } from './zelle.dto';
import { ZelleService } from './zelle.service';

const financeRoles = [AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER];
@Controller('zelle')
export class ZelleController {
  constructor(private service: ZelleService) {}
  @Get('settings')
  @Roles([...AllUserRoles, ...financeRoles])
  async settings() {
    return { data: await this.service.getSettings() };
  }
  @Get('admin/settings')
  @Roles(financeRoles)
  async adminSettings() {
    return { data: await this.service.getSettings(true) };
  }
  @Patch('admin/settings')
  @Roles(financeRoles)
  async save(@Req() req: any, @Body() dto: ZelleSettingsDto) {
    return { data: await this.service.saveSettings(dto, req.user.id) };
  }
  @Post('intents')
  @Roles(AllUserRoles)
  async create(@Req() req: any, @Body() dto: CreateZelleDto) {
    return { data: await this.service.create(req.user.id, dto) };
  }
  @Get('intents')
  @Roles(AllUserRoles)
  async mine(@Req() req: any, @Query() query: PaginationQueryDto) {
    return { data: await this.service.list(Math.max(1, Number(query.page) || 1), 10, req.user.id) };
  }
  @Post('intents/:id/proof')
  @Roles(AllUserRoles)
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(
    @Req() req: any,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ZelleProofDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { data: await this.service.upload(req.user.id, id, dto.transferReference, file) };
  }
  @Get('admin/intents')
  @Roles(financeRoles)
  async list(@Query() query: PaginationQueryDto) {
    return {
      data: await this.service.list(
        Math.max(1, Number(query.page) || 1),
        Math.min(100, Math.max(1, Number(query.limit) || 10)),
      ),
    };
  }
  @Get('admin/intents/:id/proof')
  @Roles(financeRoles)
  async proof(@Param('id', ParseObjectIdPipe) id: string) {
    return { data: await this.service.proof(id) };
  }
  @Post('admin/intents/:id/review')
  @Roles(financeRoles)
  async review(
    @Req() req: any,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReviewZelleDto,
  ) {
    return { data: await this.service.review(id, req.user.id, dto) };
  }
}

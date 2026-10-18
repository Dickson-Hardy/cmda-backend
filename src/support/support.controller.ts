import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { ParseObjectIdPipe } from '../_global/pipes/parse-object-id.pipe';
import {
  CreateSupportDto,
  SupportQueryDto,
  SupportReplyDto,
  UpdateSupportDto,
} from './support.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}
  @Post('tickets')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async create(@Body() dto: CreateSupportDto) {
    return { data: await this.service.create(dto) };
  }
  @Get('tickets/:reference')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async track(@Param('reference') reference: string, @Headers('x-support-token') token: string) {
    return { data: await this.service.track(reference, token) };
  }
  @Post('tickets/:reference/replies')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async reply(
    @Param('reference') reference: string,
    @Headers('x-support-token') token: string,
    @Body() dto: SupportReplyDto,
  ) {
    return { data: await this.service.reply(reference, dto, undefined, token) };
  }
  @Post('tickets/:reference/attachment')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('screenshot', { limits: { files: 1, fileSize: 5 * 1024 * 1024 } }),
  )
  async upload(
    @Param('reference') reference: string,
    @Headers('x-support-token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { data: await this.service.upload(reference, token, file) };
  }
  @Get('admin/tickets')
  @Roles(AllAdminRoles)
  async list(@Query() query: SupportQueryDto) {
    return { data: await this.service.list(query) };
  }
  @Get('admin/tickets/:id')
  @Roles(AllAdminRoles)
  async detail(@Param('id', ParseObjectIdPipe) id: string) {
    return { data: await this.service.detail(id) };
  }
  @Patch('admin/tickets/:id')
  @Roles(AllAdminRoles)
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateSupportDto,
  ) {
    return { data: await this.service.update(id, req.user.id, dto) };
  }
  @Post('admin/tickets/:id/replies')
  @Roles(AllAdminRoles)
  async adminReply(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: any,
    @Body() dto: SupportReplyDto,
  ) {
    return { data: await this.service.reply(id, dto, req.user.id) };
  }
  @Get('admin/tickets/:id/attachment')
  @Roles(AllAdminRoles)
  async attachment(@Param('id', ParseObjectIdPipe) id: string) {
    return { data: await this.service.attachment(id) };
  }
}

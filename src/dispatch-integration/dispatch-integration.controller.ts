import { Body,Controller,Get,Param,Post,Query,UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';
import { DispatchFeedbackGuard } from './dispatch-feedback.guard';
import { DispatchControlDto,DispatchFeedbackDto } from './dispatch.dto';
import { DispatchIntegrationService } from './dispatch-integration.service';
@Controller('integrations/dispatch')
export class DispatchInboundController {
 constructor(private readonly integration:DispatchIntegrationService){}
 @Public() @SkipThrottle() @UseGuards(DispatchFeedbackGuard) @Post('feedback') feedback(@Body() dto:DispatchFeedbackDto){return this.integration.receiveFeedback(dto);}
 @Public() @SkipThrottle() @UseGuards(DispatchFeedbackGuard) @Post('control') control(@Body() dto:DispatchControlDto){return dto.action==='status'?this.integration.status():dto.action==='retry'?this.integration.retry(dto.memberId??''):this.integration.requestRescan();}
}
@Controller('admin/dispatch')
export class DispatchAdminController {
 constructor(private readonly integration:DispatchIntegrationService){}
 @Roles([AdminRole.SUPERADMIN,AdminRole.MEMBER_MANAGER]) @Get('status') status(){return this.integration.status();}
 @Roles([AdminRole.SUPERADMIN,AdminRole.MEMBER_MANAGER]) @Get('feedback') feedback(@Query('memberId') memberId?:string,@Query('page') page?:string){return this.integration.feedbackList(memberId,page);}
 @Roles([AdminRole.SUPERADMIN]) @Post('rescan') rescan(){return this.integration.requestRescan();}
 @Roles([AdminRole.SUPERADMIN]) @Post('members/:id/retry') retry(@Param('id') id:string){return this.integration.retry(id);}
}

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { Roles } from './auth/decorators/roles.decorator';
import { AllAdminRoles } from './admin/admin.constant';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  getHealth() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('metrics')
  @Roles(AllAdminRoles)
  getMetrics() {
    return this.appService.getMetrics();
  }
}

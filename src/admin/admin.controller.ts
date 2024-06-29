import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminService } from './admin.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminRole, AllAdminRoles } from './admin.constant';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetches all admins' })
  findAll() {
    return this.adminService.findAll();
  }

  @Post()
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or add new admin' })
  @ApiBody({ type: CreateAdminDto })
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login an admin' })
  @ApiBody({ type: LoginAdminDto })
  login(@Body() loginDto: LoginAdminDto) {
    return this.adminService.login(loginDto);
  }

  @Get('profile')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current admin's profile" })
  findProfile() {
    return this.adminService.findProfile();
  }

  @Patch('profile')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current admin's profile" })
  updateProfile(@Body() updateAdminDto) {
    return this.adminService.updateProfile(updateAdminDto);
  }

  @Patch('role/:role/:id')
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the role of an admin' })
  updateRole(@Param('id') id: string, @Param('role') role: string) {
    return this.adminService.updateRole(id, role);
  }

  @Delete(':id')
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an admin by id' })
  remove(@Param('slug') slug: string) {
    return this.adminService.remove(slug);
  }
}

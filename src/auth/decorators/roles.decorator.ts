import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../admin/admin.constant';
import { UserRole } from '../../users/user.constant';

export const Roles = Reflector.createDecorator<(AdminRole | UserRole)[]>();

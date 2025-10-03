import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { IJwtPayload } from '../../_global/interface/jwt-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get(Roles, context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user: IJwtPayload = request.user;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Access not allowed to ${user.role.toLowerCase()}`);
    }

    return true;
  }
}

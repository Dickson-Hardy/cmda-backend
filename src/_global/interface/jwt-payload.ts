import { AdminRole } from '../../admin/admin.constant';
import { UserRole } from '../../users/user.constant';

export interface JwtPayload {
  id: string;
  email: string;
  role: AdminRole | UserRole;
  iat: string;
  exp: string;
}

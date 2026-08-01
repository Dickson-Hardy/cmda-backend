import { AdminRole } from '../../admin/admin.constant';
import { UserRole } from '../../users/user.constant';

export interface IJwtPayload {
  id: string;
  email: string;
  role: AdminRole | UserRole;
  type: 'access' | 'refresh';
  tokenVersion: number;
  sessionId?: string;
  iat: number;
  exp: number;
}

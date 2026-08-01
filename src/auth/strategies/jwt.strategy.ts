import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/schema/users.schema';
import { IJwtPayload } from '../../_global/interface/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    const user = await this.userModel.findById(payload.id).exec();

    if (
      !user ||
      payload.type !== 'access' ||
      (user.tokenVersion || 0) !== payload.tokenVersion ||
      user.isActive === false ||
      user.isBanned === true
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      tokenVersion: payload.tokenVersion,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}

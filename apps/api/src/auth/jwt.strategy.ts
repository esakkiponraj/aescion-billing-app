import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthTokenPayload } from '@aescion/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'aescion_super_secure_enterprise_jwt_secret_key_2026_production'
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    if (!payload || !payload.userId || !payload.organizationId) {
      throw new UnauthorizedException('Token payload is invalid');
    }
    return payload;
  }
}

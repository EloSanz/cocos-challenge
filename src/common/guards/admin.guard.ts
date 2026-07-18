/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENVIRONMENTS } from '../constants/env.constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isProd = process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION;
    if (isProd) {
      // Hide the admin routes completely in production
      throw new UnauthorizedException(
        'Admin routes are disabled in production environment',
      );
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');

    if (!adminSecret) {
      // If no secret is configured, fail securely by denying access.
      throw new UnauthorizedException('Admin secret key not configured');
    }

    if (!apiKey || apiKey !== adminSecret) {
      throw new UnauthorizedException('Invalid or missing admin API key');
    }

    return true;
  }
}

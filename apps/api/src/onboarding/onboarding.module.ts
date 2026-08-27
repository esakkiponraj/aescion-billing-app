import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService, AuditService]
})
export class OnboardingModule {}

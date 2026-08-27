import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingSchema } from '@aescion/validation';

@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Post('create-business')
  async createBusiness(@Body() body: any) {
    const validated = OnboardingSchema.parse(body);
    return this.onboardingService.createBusiness(validated);
  }
}

import { SetMetadata } from '@nestjs/common';
import { BusinessType } from '@aescion/shared-types';

export const REQUIRE_INDUSTRY_KEY = 'require_industry';
export const RequireIndustry = (...industries: BusinessType[]) =>
  SetMetadata(REQUIRE_INDUSTRY_KEY, industries);

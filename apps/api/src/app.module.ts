import { Module } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/services/audit.service';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProductModule } from './products/products.module';
import { CustomerModule } from './customers/customers.module';
import { InvoiceModule } from './invoices/invoices.module';
import { QuotationModule } from './quotations/quotations.module';
import { PaymentModule } from './payments/payments.module';
import { ShiftModule } from './cashier-shifts/shifts.module';
import { ReportsModule } from './reports/reports.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { ServiceJobModule } from './service-center/service.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { SupermarketModule } from './supermarket/supermarket.module';
import { WholesaleModule } from './wholesale/wholesale.module';
import { TeamModule } from './team/team.module';
import { BranchModule } from './branches/branches.module';
import { OrganizationModule } from './organizations/organizations.module';
import { SupplierModule } from './suppliers/suppliers.module';
import { SyncModule } from './sync/sync.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    RealtimeModule,
    SuperAdminModule,
    AuthModule,
    OnboardingModule,
    ProductModule,
    CustomerModule,
    InvoiceModule,
    QuotationModule,
    PaymentModule,
    ShiftModule,
    ReportsModule,
    RestaurantModule,
    ServiceJobModule,
    PharmacyModule,
    SupermarketModule,
    WholesaleModule,
    TeamModule,
    BranchModule,
    OrganizationModule,
    SupplierModule,
    SyncModule
  ],
  providers: [PrismaService, AuditService]
})
export class AppModule {}

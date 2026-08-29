const fs = require('fs');

// 1. InvoicesService
let invCode = fs.readFileSync('C:/AESCION/apps/api/src/invoices/invoices.service.ts', 'utf8');
if (!invCode.includes('EventsGateway')) {
  invCode = invCode.replace(
    "import { AuditService } from '../common/services/audit.service';",
    "import { AuditService } from '../common/services/audit.service';\nimport { EventsGateway } from '../realtime/events.gateway';"
  );
  invCode = invCode.replace(
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService\n  ) {}",
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService,\n    private eventsGateway: EventsGateway\n  ) {}"
  );
  invCode = invCode.replace(
    "return this.prisma.$transaction(async (tx) => {",
    "const createdInvoice = await this.prisma.$transaction(async (tx) => {"
  );
  invCode = invCode.replace(
    "      return tx.invoice.findUnique({\n        where: { id: invoice.id },\n        include: { lines: true, payments: true, receipts: true, branch: true }\n      });\n    });\n  }",
    "      return tx.invoice.findUnique({\n        where: { id: invoice.id },\n        include: { lines: true, payments: true, receipts: true, branch: true }\n      });\n    });\n    if (createdInvoice) {\n      this.eventsGateway.emitInvoiceCreated(organizationId, branchId, createdInvoice);\n    }\n    return createdInvoice;\n  }"
  );
  fs.writeFileSync('C:/AESCION/apps/api/src/invoices/invoices.service.ts', invCode, 'utf8');
  console.log('InvoicesService patched successfully');
}

// 2. ProductService
let prodCode = fs.readFileSync('C:/AESCION/apps/api/src/products/products.service.ts', 'utf8');
if (!prodCode.includes('EventsGateway')) {
  prodCode = prodCode.replace(
    "import { AuditService } from '../common/services/audit.service';",
    "import { AuditService } from '../common/services/audit.service';\nimport { EventsGateway } from '../realtime/events.gateway';"
  );
  prodCode = prodCode.replace(
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService\n  ) {}",
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService,\n    private eventsGateway: EventsGateway\n  ) {}"
  );
  prodCode = prodCode.replace(
    "return this.prisma.$transaction(async (tx) => {",
    "const createdProduct = await this.prisma.$transaction(async (tx) => {"
  );
  prodCode = prodCode.replace(
    "      return product;\n    });\n  }",
    "      return product;\n    });\n    this.eventsGateway.emitProductUpdated(organizationId, branchId, createdProduct);\n    return createdProduct;\n  }"
  );
  prodCode = prodCode.replace(
    "return updated;\n  }\n\n  async getStockLedger",
    "this.eventsGateway.emitProductUpdated(organizationId, undefined, updated);\n    return updated;\n  }\n\n  async getStockLedger"
  );
  fs.writeFileSync('C:/AESCION/apps/api/src/products/products.service.ts', prodCode, 'utf8');
  console.log('ProductService patched successfully');
}

// 3. CustomerService
let custCode = fs.readFileSync('C:/AESCION/apps/api/src/customers/customers.service.ts', 'utf8');
if (!custCode.includes('EventsGateway')) {
  custCode = custCode.replace(
    "import { AuditService } from '../common/services/audit.service';",
    "import { AuditService } from '../common/services/audit.service';\nimport { EventsGateway } from '../realtime/events.gateway';"
  );
  custCode = custCode.replace(
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService\n  ) {}",
    "constructor(\n    private prisma: PrismaService,\n    private auditService: AuditService,\n    private eventsGateway: EventsGateway\n  ) {}"
  );
  custCode = custCode.replace(
    "return customer;\n  }\n\n  async update",
    "this.eventsGateway.emitCustomerUpdated(organizationId, customer);\n    return customer;\n  }\n\n  async update"
  );
  custCode = custCode.replace(
    "return updated;\n  }\n\n  async getAgeingReport",
    "this.eventsGateway.emitCustomerUpdated(organizationId, updated);\n    return updated;\n  }\n\n  async getAgeingReport"
  );
  fs.writeFileSync('C:/AESCION/apps/api/src/customers/customers.service.ts', custCode, 'utf8');
  console.log('CustomerService patched successfully');
}

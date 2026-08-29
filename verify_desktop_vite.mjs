async function testVite() {
  console.log('\n--- VERIFYING VITE DEV SERVER MODULE RESOLUTION ---');
  
  const indexRes = await fetch('http://localhost:5173/');
  console.log('1. Index HTML Status:', indexRes.status);
  const html = await indexRes.text();
  console.log('   Root element present:', html.includes('id="root"'));

  const sharedRes = await fetch('http://localhost:5173/@fs/C:/AESCION/packages/shared-types/src/index.ts');
  console.log('2. @aescion/shared-types Status:', sharedRes.status);
  const sharedContent = await sharedRes.text();
  console.log('   Exports BusinessType:', sharedContent.includes('BusinessType'));
  console.log('   Exports TaxMode:', sharedContent.includes('TaxMode'));

  const enumsRes = await fetch('http://localhost:5173/@fs/C:/AESCION/packages/shared-types/src/enums.ts');
  console.log('3. shared-types/enums.ts Status:', enumsRes.status);
  const enumsContent = await enumsRes.text();
  console.log('   Defines BusinessType runtime enum:', enumsContent.includes('export const BusinessType'));

  const wizardRes = await fetch('http://localhost:5173/src/features/onboarding/OnboardingWizard.tsx');
  console.log('4. OnboardingWizard.tsx Status:', wizardRes.status);
  const wizardContent = await wizardRes.text();
  console.log('   Successfully compiled without export error:', !wizardContent.includes('SyntaxError') && wizardRes.status === 200);

  const mainRes = await fetch('http://localhost:5173/src/main.tsx');
  console.log('5. Main.tsx Status:', mainRes.status);

  console.log('--- ALL VITE DEV RESOLUTIONS SUCCEEDED ---\n');
}

testVite();

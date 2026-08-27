export function generateIdempotencyKey(prefix: string = 'tx'): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomStr}`;
}

export function formatDocumentNumber(prefix: string, sequenceNumber: number, branchCode?: string, fiscalYear?: string): string {
  const paddedSeq = sequenceNumber.toString().padStart(5, '0');
  const parts = [prefix];
  if (fiscalYear) parts.push(fiscalYear);
  if (branchCode) parts.push(branchCode);
  parts.push(paddedSeq);
  return parts.join('-');
}

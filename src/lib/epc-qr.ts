/**
 * EPC069-12 (SEPA credit transfer / "GiroCode") QR payload — the European
 * standard that lets a customer scan an invoice and get a bank transfer
 * pre-filled with the IBAN, amount and reference. Requires the garage to
 * have set an IBAN in Settings; BIC is optional under EPC version 002.
 */
export interface EpcQrInput {
  beneficiaryName: string;
  iban: string;
  bic?: string | null;
  amount: number;
  remittanceInfo: string;
}

export function buildEpcQrPayload(input: EpcQrInput): string {
  const lines = [
    'BCD',
    '002',
    '1',
    'SCT',
    (input.bic ?? '').replace(/\s+/g, ''),
    input.beneficiaryName.slice(0, 70),
    input.iban.replace(/\s+/g, ''),
    `EUR${input.amount.toFixed(2)}`,
    '',
    '',
    input.remittanceInfo.slice(0, 140),
  ];
  return lines.join('\n');
}

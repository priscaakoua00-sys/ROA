import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  orgBlock: { maxWidth: 260 },
  orgName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  muted: { color: '#666' },
  titleBlock: { alignItems: 'flex-end' },
  title: { fontSize: 20, fontWeight: 700 },
  invoiceNumber: { fontSize: 11, marginTop: 2, color: '#444' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#666' },
  section: { marginTop: 20 },
  billTo: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 4 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 6,
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 7 },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colAmount: { flex: 1.4, textAlign: 'right' },
  totals: { marginTop: 14, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', width: 220, paddingVertical: 2 },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  grandTotal: { fontSize: 12, fontWeight: 700 },
  notesBlock: { marginTop: 20, fontSize: 9, color: '#444' },
  paymentBlock: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  qr: { width: 76, height: 76 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
});

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  org: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    vatNumber: string | null;
    iban: string | null;
    bic: string | null;
  };
  customer: { name: string; phone: string | null; email: string | null };
  vehicle: { label: string; licensePlate: string | null } | null;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  qrDataUrl: string | null;
  formatCurrency: (n: number) => string;
  labels: {
    invoice: string;
    issueDate: string;
    dueDate: string;
    billTo: string;
    vehicle: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    subtotal: string;
    vat: string;
    total: string;
    paid: string;
    balanceDue: string;
    notes: string;
    scanToPay: string;
    paymentTerms: string;
    footer: string;
  };
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { org, labels } = data;
  const balance = Math.max(0, data.total - data.paidAmount);
  const orgAddressLine = [org.postalCode, org.city].filter(Boolean).join(' ');

  return (
    <Document title={`${labels.invoice} ${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.orgBlock}>
            {org.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={org.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={[styles.orgName, { marginTop: org.logoUrl ? 8 : 0 }]}>{org.name}</Text>
            {org.address ? <Text style={styles.muted}>{org.address}</Text> : null}
            {orgAddressLine ? <Text style={styles.muted}>{orgAddressLine}</Text> : null}
            {org.phone ? <Text style={styles.muted}>{org.phone}</Text> : null}
            {org.email ? <Text style={styles.muted}>{org.email}</Text> : null}
            {org.website ? <Text style={styles.muted}>{org.website}</Text> : null}
            {org.vatNumber ? <Text style={styles.muted}>VAT {org.vatNumber}</Text> : null}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{labels.invoice}</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <View style={styles.metaRow}>
              <Text>{labels.issueDate}</Text>
              <Text> {data.issueDate}</Text>
            </View>
            {data.dueDate ? (
              <View style={styles.metaRow}>
                <Text>{labels.dueDate}</Text>
                <Text> {data.dueDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.billTo}>{labels.billTo}</Text>
          <Text style={{ fontWeight: 700 }}>{data.customer.name}</Text>
          {data.customer.phone ? <Text style={styles.muted}>{data.customer.phone}</Text> : null}
          {data.customer.email ? <Text style={styles.muted}>{data.customer.email}</Text> : null}
          {data.vehicle ? (
            <Text style={styles.muted}>
              {labels.vehicle}: {data.vehicle.label}
              {data.vehicle.licensePlate ? ` (${data.vehicle.licensePlate})` : ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>{labels.description}</Text>
            <Text style={styles.colQty}>{labels.quantity}</Text>
            <Text style={styles.colPrice}>{labels.unitPrice}</Text>
            <Text style={styles.colAmount}>{labels.amount}</Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{data.formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{data.formatCurrency(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>{labels.subtotal}</Text>
            <Text>{data.formatCurrency(data.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>{labels.vat} ({data.vatRate}%)</Text>
            <Text>{data.formatCurrency(data.vatAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotal}>{labels.total}</Text>
            <Text style={styles.grandTotal}>{data.formatCurrency(data.total)}</Text>
          </View>
          {data.paidAmount > 0 ? (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.muted}>{labels.paid}</Text>
                <Text>{data.formatCurrency(data.paidAmount)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={{ fontWeight: 700 }}>{labels.balanceDue}</Text>
                <Text style={{ fontWeight: 700 }}>{data.formatCurrency(balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.paymentBlock}>
          <View style={{ maxWidth: 320 }}>
            <Text style={styles.muted}>{labels.paymentTerms}</Text>
            {org.iban ? <Text style={[styles.muted, { marginTop: 4 }]}>IBAN {org.iban}</Text> : null}
            {org.bic ? <Text style={styles.muted}>BIC {org.bic}</Text> : null}
          </View>
          {data.qrDataUrl ? (
            <View style={{ alignItems: 'center' }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={data.qrDataUrl} style={styles.qr} />
              <Text style={[styles.muted, { fontSize: 7, marginTop: 2 }]}>{labels.scanToPay}</Text>
            </View>
          ) : null}
        </View>

        {data.notes ? (
          <View style={styles.notesBlock}>
            <Text>{labels.notes}</Text>
            <Text style={{ marginTop: 2 }}>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}

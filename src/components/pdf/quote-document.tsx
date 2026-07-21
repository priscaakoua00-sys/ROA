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
  quoteNumber: { fontSize: 11, marginTop: 2, color: '#444' },
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
  kindTag: { fontSize: 7.5, color: '#999', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  acceptanceBlock: { marginTop: 24, fontSize: 8.5, color: '#666', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
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

export interface QuotePdfData {
  quoteNumber: string;
  issueDate: string;
  validUntil: string | null;
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
  };
  customer: { name: string; phone: string | null; email: string | null };
  vehicle: { label: string; licensePlate: string | null } | null;
  lineItems: { description: string; kind: 'part' | 'labor' | 'other'; quantity: number; unitPrice: number }[];
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  notes: string | null;
  formatCurrency: (n: number) => string;
  labels: {
    quote: string;
    issueDate: string;
    validUntil: string;
    billTo: string;
    vehicle: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    subtotal: string;
    vat: string;
    total: string;
    notes: string;
    acceptance: string;
    footer: string;
    kindPart: string;
    kindLabor: string;
  };
}

export function QuoteDocument({ data }: { data: QuotePdfData }) {
  const { org, labels } = data;
  const orgAddressLine = [org.postalCode, org.city].filter(Boolean).join(' ');
  const kindLabel: Record<string, string> = { part: labels.kindPart, labor: labels.kindLabor };

  return (
    <Document title={`${labels.quote} ${data.quoteNumber}`}>
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
            <Text style={styles.title}>{labels.quote}</Text>
            <Text style={styles.quoteNumber}>{data.quoteNumber}</Text>
            <View style={styles.metaRow}>
              <Text>{labels.issueDate}</Text>
              <Text> {data.issueDate}</Text>
            </View>
            {data.validUntil ? (
              <View style={styles.metaRow}>
                <Text>{labels.validUntil}</Text>
                <Text> {data.validUntil}</Text>
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
              <View style={styles.colDesc}>
                <Text>{item.description}</Text>
                {kindLabel[item.kind] ? <Text style={styles.kindTag}>{kindLabel[item.kind]}</Text> : null}
              </View>
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
        </View>

        {data.notes ? (
          <View style={styles.notesBlock}>
            <Text>{labels.notes}</Text>
            <Text style={{ marginTop: 2 }}>{data.notes}</Text>
          </View>
        ) : null}

        <View style={styles.acceptanceBlock}>
          <Text>{labels.acceptance}</Text>
        </View>

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}

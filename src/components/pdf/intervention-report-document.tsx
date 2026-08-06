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
  dateLine: { fontSize: 11, marginTop: 2, color: '#444' },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 4 },
  paragraph: { marginTop: 4, lineHeight: 1.5 },
  list: { marginTop: 4 },
  listItem: { flexDirection: 'row', marginTop: 3 },
  bullet: { width: 10 },
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
  colLabel: { flex: 3 },
  colResult: { flex: 1 },
  colNote: { flex: 2 },
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

export interface InterventionReportPdfData {
  workOrderTitle: string;
  createdAt: string;
  org: { name: string; logoUrl: string | null; address: string | null; postalCode: string | null; city: string | null; phone: string | null; email: string | null };
  customer: { name: string; phone: string | null; email: string | null };
  vehicle: { label: string; licensePlate: string | null } | null;
  summary: string;
  recommendedRepairs: { label: string; reason: string }[];
  reportText: string;
  checklist: { label: string; result: string; note: string | null }[];
  partsUsed: { description: string; quantity: number }[];
  labels: {
    report: string;
    billTo: string;
    vehicle: string;
    summary: string;
    recommendedRepairs: string;
    details: string;
    checklistTitle: string;
    checklistLabel: string;
    checklistResult: string;
    checklistNote: string;
    partsUsedTitle: string;
    footer: string;
  };
}

export function InterventionReportDocument({ data }: { data: InterventionReportPdfData }) {
  const { org, labels } = data;
  const orgAddressLine = [org.postalCode, org.city].filter(Boolean).join(' ');

  return (
    <Document title={`${labels.report} — ${data.workOrderTitle}`}>
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
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{labels.report}</Text>
            <Text style={styles.dateLine}>{data.createdAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{labels.billTo}</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{labels.summary}</Text>
          <Text style={{ fontWeight: 700 }}>{data.workOrderTitle}</Text>
          <Text style={styles.paragraph}>{data.summary}</Text>
        </View>

        {data.recommendedRepairs.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{labels.recommendedRepairs}</Text>
            <View style={styles.list}>
              {data.recommendedRepairs.map((r, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text>
                    <Text style={{ fontWeight: 700 }}>{r.label}</Text> — {r.reason}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{labels.details}</Text>
          <Text style={styles.paragraph}>{data.reportText}</Text>
        </View>

        {data.checklist.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{labels.checklistTitle}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colLabel}>{labels.checklistLabel}</Text>
                <Text style={styles.colResult}>{labels.checklistResult}</Text>
                <Text style={styles.colNote}>{labels.checklistNote}</Text>
              </View>
              {data.checklist.map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colLabel}>{c.label}</Text>
                  <Text style={styles.colResult}>{c.result}</Text>
                  <Text style={styles.colNote}>{c.note ?? ''}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {data.partsUsed.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{labels.partsUsedTitle}</Text>
            <View style={styles.list}>
              {data.partsUsed.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text>{p.description} × {p.quantity}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}

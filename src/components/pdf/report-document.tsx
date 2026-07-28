import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  orgName: { fontSize: 14, fontWeight: 700 },
  muted: { color: '#666' },
  title: { fontSize: 20, fontWeight: 700, marginTop: 20 },
  periodLabel: { fontSize: 11, marginTop: 2, color: '#444' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24 },
  tile: { width: '33%', paddingRight: 16, marginBottom: 18 },
  tileValue: { fontSize: 16, fontWeight: 700 },
  tileLabel: { fontSize: 9, color: '#666', marginTop: 2 },
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

export interface ReportPdfData {
  orgName: string;
  periodLabel: string;
  generatedAt: string;
  tiles: { label: string; value: string }[];
  footer: string;
}

export function ReportDocument({ data }: { data: ReportPdfData }) {
  return (
    <Document title={data.periodLabel}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.orgName}>{data.orgName}</Text>
        <Text style={styles.muted}>{data.generatedAt}</Text>
        <Text style={styles.title}>{data.periodLabel}</Text>

        <View style={styles.grid}>
          {data.tiles.map((tile) => (
            <View key={tile.label} style={styles.tile}>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{data.footer}</Text>
      </Page>
    </Document>
  );
}

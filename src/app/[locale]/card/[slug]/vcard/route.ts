import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

function vcardEscape(value: string): string {
  return value.replace(/([,;])/g, '\\$1');
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase.rpc('public_org_card', { p_slug: slug });
  const org = rows?.[0] as
    | {
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        postal_code: string | null;
        city: string | null;
        website: string | null;
      }
    | undefined;
  if (!org) return new NextResponse('Not found', { status: 404 });

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vcardEscape(org.name)}`,
    `ORG:${vcardEscape(org.name)}`,
    org.phone ? `TEL;TYPE=WORK,VOICE:${org.phone}` : null,
    org.email ? `EMAIL:${org.email}` : null,
    org.address ? `ADR;TYPE=WORK:;;${vcardEscape(org.address)};${vcardEscape(org.city ?? '')};;${vcardEscape(org.postal_code ?? '')};` : null,
    org.website ? `URL:${org.website.startsWith('http') ? org.website : `https://${org.website}`}` : null,
    'END:VCARD',
  ].filter(Boolean);

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${org.name.replace(/[^a-z0-9]/gi, '-')}.vcf"`,
    },
  });
}

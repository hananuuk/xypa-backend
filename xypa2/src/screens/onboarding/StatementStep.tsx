import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as XLSX from 'xlsx';
import { pdfToText } from '../../api/client';
import { colors, font } from '../../design/tokens';
import { Found } from '../../logic/scan';
import { dedupe, parseRows, parseText } from '../../logic/statement';
import { BigButton, ob, StepFrame } from './ui';

const BANKS = ['Khan Bank', 'Golomt', 'TDB', 'XacBank', 'State Bank', 'M bank'];

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function readFile(a: DocumentPicker.DocumentPickerAsset, bank: string): Promise<Found[]> {
  const buf = await (await fetch(a.uri)).arrayBuffer();
  const name = a.name.toLowerCase();
  if (name.endsWith('.pdf') || a.mimeType === 'application/pdf') {
    if (buf.byteLength > 4 * 1024 * 1024) throw new Error(`${a.name} is bigger than 4 MB`);
    return parseText((await pdfToText(toBase64(buf))).text, bank);
  }
  const wb = name.endsWith('.csv') || name.endsWith('.txt')
    ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string' })
    : XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: false });
  return wb.SheetNames.flatMap((n) => parseRows(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, raw: true, defval: '' }), bank));
}

/** Upload a statement (spec 4.3): pick the bank, follow the steps, add files, read them. */
export function StatementStep({ onBack, onRead }: { onBack: () => void; onRead: (found: Found[]) => void }) {
  const [bank, setBank] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pick = async () => {
    setMsg(null);
    const r = await DocumentPicker.getDocumentAsync({
      multiple: true, copyToCacheDirectory: true,
      type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
    });
    if (!r.canceled) setFiles((f) => [...f, ...r.assets.filter((a) => !f.some((x) => x.uri === a.uri))]);
  };

  const read = async () => {
    if (!bank) return;
    setBusy(true); setMsg(null);
    try {
      const all: Found[] = [];
      for (const f of files) all.push(...(await readFile(f, bank)));
      const found = dedupe(all);
      if (found.length === 0) setMsg("We couldn't find payments in that file. Try the Excel or CSV version of your statement, or add things yourself.");
      else onRead(found);
    } catch (e) {
      setMsg(`We couldn't read that file: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  return (
    <StepFrame step={1} title="Upload a statement" subtitle="Your last 3 months from your bank. xypa reads it on the spot to find your accounts, regular payments and spending." onBack={onBack}
      footer={<>
        {msg ? <Text style={s.msg} accessibilityLiveRegion="polite">{msg}</Text> : null}
        <BigButton title={busy ? 'Reading…' : 'Read statement'} disabled={!bank || files.length === 0 || busy} onPress={read} />
      </>}>
      <Text style={s.h}>1. Pick your bank</Text>
      <View style={s.chips}>
        {BANKS.map((b) => (
          <Pressable key={b} accessibilityRole="radio" accessibilityState={{ selected: bank === b }} accessibilityLabel={b} onPress={() => setBank(b)} style={[s.chip, bank === b && { backgroundColor: ob.ink }]}>
            <Text style={[s.chipT, bank === b && { color: colors.white }]}>{b}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.h}>2. Download your statement (хуулга)</Text>
      <View style={s.card}>
        {['Open your bank app and find Statements (хуулга).', 'Choose the last 3 months.', 'Pick PDF or Excel as the format.', 'Download it to your phone.'].map((t, i) => (
          <View key={t} style={s.step}><View style={s.num}><Text style={s.numT}>{i + 1}</Text></View><Text style={s.stepT}>{t}</Text></View>
        ))}
      </View>
      <Text style={s.h}>3. Add the files</Text>
      {files.map((f) => (
        <View key={f.uri} style={s.file}><Text style={s.fileT} numberOfLines={1}>{f.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${f.name}`} onPress={() => setFiles((x) => x.filter((y) => y.uri !== f.uri))} hitSlop={10}><Text style={s.rm}>Remove</Text></Pressable></View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel={files.length ? 'Add another statement' : 'Choose files'} onPress={pick} style={s.drop}>
        <Text style={s.dropT}>{files.length ? '+ Add another statement' : 'Choose PDF, Excel or CSV files'}</Text>
      </Pressable>
      {busy ? <ActivityIndicator style={{ marginTop: 16 }} color={ob.ink} /> : null}
    </StepFrame>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: font.medium, fontSize: 17, color: ob.ink, marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, backgroundColor: colors.chip, paddingHorizontal: 18, justifyContent: 'center' },
  chipT: { fontFamily: font.medium, fontSize: 15, color: ob.ink },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEEBE5', alignItems: 'center', justifyContent: 'center' },
  numT: { fontFamily: font.medium, fontSize: 14, color: ob.ink },
  stepT: { flex: 1, fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ob.ink },
  file: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, minHeight: 52, marginBottom: 8 },
  fileT: { flex: 1, fontFamily: font.regular, fontSize: 15, color: ob.ink },
  rm: { fontFamily: font.medium, fontSize: 14, color: colors.accent },
  drop: { minHeight: 64, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dropT: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  msg: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.accentInk },
});

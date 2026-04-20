import type { Order } from '@/types';

const DEFAULT_ORDERS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1WmLK-CJzWtcry3gd8fLXKOqbnh8M4Vb7uBWRXHLiJhM/edit?usp=sharing';
const SHEET_ID_REGEX = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

function extractSheetId(input?: string): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  const match = value.match(SHEET_ID_REGEX);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) return value;
  return null;
}

function extractGid(input?: string): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/[?&]gid=(\d+)/);
  return match?.[1] || null;
}

function getOrdersSheetId(): string {
  const fromId = extractSheetId(import.meta.env.VITE_GOOGLE_ORDERS_SHEET_ID);
  if (fromId) return fromId;
  const fromUrl = extractSheetId(import.meta.env.VITE_GOOGLE_ORDERS_SHEET_URL);
  if (fromUrl) return fromUrl;
  return extractSheetId(DEFAULT_ORDERS_SHEET_URL) as string;
}

function getOrdersSheetGid(): string | null {
  const fromEnvGid = (import.meta.env.VITE_GOOGLE_ORDERS_SHEET_GID || '').toString().trim();
  if (/^\d+$/.test(fromEnvGid)) return fromEnvGid;
  return extractGid(import.meta.env.VITE_GOOGLE_ORDERS_SHEET_URL) || extractGid(DEFAULT_ORDERS_SHEET_URL);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, ''); });
    return row;
  });
}

function mapStatus(raw: string): Order['status'] {
  const s = raw.toLowerCase().trim();
  if (!s) return 'Pending';
  if (s.includes('deliver') || s.includes('ডেলিভ')) return 'Delivered';
  if (s.includes('cancel') || s.includes('বাতিল')) return 'Cancelled';
  if (s.includes('confirm') || s.includes('কনফার্ম')) return 'Confirmed';
  return 'Pending';
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');
}

function getLookup(row: Record<string, string>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    lookup.set(normalizeHeader(k), (v || '').trim());
  }
  return lookup;
}

function pick(lookup: Map<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = lookup.get(normalizeHeader(alias));
    if (value) return value;
  }
  return '';
}

function parseNumber(value: string): number {
  const normalized = (value || '').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchGoogleSheetOrders(): Promise<Order[]> {
  const sheetId = getOrdersSheetId();
  const gid = getOrdersSheetGid();
  const url = gid
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);

  return rows
    .map((r, i) => {
      const lookup = getLookup(r);

      const orderId = pick(lookup, ['Order ID', 'OrderID', 'ID', 'Order No']);
      const rawCustomerName = pick(lookup, ['Customer Name', 'Name', 'কাস্টমার নাম', 'নাম']);
      const rawCustomerPhone = pick(lookup, ['Phone', 'Mobile', 'মোবাইল নাম্বার', 'মোবাইল', 'Contact Number']);
      const district = pick(lookup, ['District', 'জেলা']);
      const thanaArea = pick(lookup, ['Thana + Area', 'Thana/Area', 'থানা + এলাকা', 'থানা']);
      const rawAddress = pick(lookup, ['Address', 'ঠিকানা']);
      const address = rawAddress || [thanaArea, district].filter(Boolean).join(', ');

      const rawProductName = pick(lookup, ['Product Name', 'Product', 'পণ্যের নাম', 'চুলার নাম']);
      if (!rawCustomerName && !rawCustomerPhone && !rawProductName) return null;

      const customerName = rawCustomerName || 'Unknown';
      const customerPhone = rawCustomerPhone;
      const productName = rawProductName || 'Unknown Product';
      const quantity = parseNumber(pick(lookup, ['Quantity', 'Qty', 'পরিমাণ'])) || 1;
      const unitPrice = parseNumber(pick(lookup, ['Unit Price', 'Price', 'দাম']));
      const deliveryFee = parseNumber(pick(lookup, ['Delivery Fee', 'Delivery', 'ডেলিভারি চার্জ']));
      const amountFromSheet = parseNumber(
        pick(lookup, ['Total Amount', 'Amount', 'Total', 'মোট', 'মোট টাকা']),
      );
      const totalAmount = amountFromSheet || unitPrice * quantity + deliveryFee;

      const rawDate = pick(lookup, ['Order DateTime', 'Order Date', 'Timestamp', 'Date', 'তারিখ']);
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const date =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString('en-GB')
          : rawDate;

      return {
        id: orderId || `gsheet-${i}`,
        date: date || '',
        customerName,
        customerPhone,
        address,
        items: [{
          name: productName,
          quantity,
          unitPrice,
        }],
        amount: totalAmount,
        deliveryFee: deliveryFee || undefined,
        status: mapStatus(pick(lookup, ['Order Status', 'Status', 'স্ট্যাটাস'])),
        productLink: pick(lookup, ['Product Link', 'Link']) || undefined,
        sku: pick(lookup, ['SKU', 'Product SKU', 'Code', 'কোড']) || '',
        productSize: pick(lookup, ['Product size', 'Size', 'সাইজ']) || '',
      } as Order;
    })
    .filter((order): order is Order => order !== null);
}

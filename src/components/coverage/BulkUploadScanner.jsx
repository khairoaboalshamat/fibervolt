import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import AddressResultCard from './AddressResultCard.jsx';

export default function BulkUploadScanner({ pins, clients, clientMap, user, onPinsCreated }) {
  const fileRef = useRef();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setProcessing(true);
    setResults([]);
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                }
              }
            }
          }
        }
      });

      const rows = extracted?.output?.addresses || extracted?.output || [];
      if (!rows.length) { setError('No addresses found in file.'); setProcessing(false); return; }

      setProgress({ done: 0, total: rows.length });
      const scanned = [];
      const newPins = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const addr = row.address || row.Address || row.address_line || '';
        if (!addr) continue;

        const addrLower = addr.toLowerCase();
        const existingPin = pins.find(p => (p.address || '').toLowerCase().includes(addrLower.split(',')[0]) || addrLower.includes((p.address || '').toLowerCase().split(',')[0]));
        const existingClient = clientMap[addrLower] || clients.find(c => (c.address || '').toLowerCase().includes(addrLower.split(',')[0]));

        let lat, lng;
        if (!existingPin) {
          try {
            const geo = await base44.functions.invoke('reverseGeocode', { address: addr });
            lat = geo.data?.lat;
            lng = geo.data?.lng;
            if (lat && lng) {
              newPins.push({ address: addr, lat, lng, status: 'lead', customer_name: row.name || '', phone: row.phone || '', rep_email: user?.email, rep_name: user?.full_name || user?.email, source: 'upload' });
            }
          } catch { /* skip */ }
        }

        scanned.push({ address: addr, pin: existingPin || null, client: existingClient || null });
        setProgress({ done: i + 1, total: rows.length });
      }

      if (newPins.length > 0) {
        await base44.entities.MapPin.bulkCreate(newPins);
        onPinsCreated?.(newPins.length);
      }

      setResults(scanned);
    } catch (e) {
      setError(e.message || 'Failed to process file.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload a CSV or Excel file with an address column. Each address will be checked for fiber and service status.</p>

      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />

      {!processing && results.length === 0 && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:bg-muted transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold">Upload Address List</p>
            <p className="text-sm text-muted-foreground">CSV or Excel (.xlsx, .xls)</p>
          </div>
        </button>
      )}

      {processing && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-semibold">Scanning addresses...</p>
            <p className="text-sm text-muted-foreground">{progress.done} / {progress.total}</p>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {results.length > 0 && !processing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{results.length} addresses scanned</p>
            <Button variant="outline" size="sm" onClick={() => { setResults([]); setProgress({ done: 0, total: 0 }); }}>
              Upload Another
            </Button>
          </div>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Fiber Available', val: results.filter(r => r.pin?.fiber_status === 'available').length, color: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'Has Service', val: results.filter(r => r.pin?.status === 'sale' || r.pin?.status === 'installed' || r.client).length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Opportunity', val: results.filter(r => r.pin?.fiber_status === 'available' && r.pin?.status !== 'sale' && r.pin?.status !== 'installed' && !r.client).length, color: 'text-orange-700 bg-orange-50 border-orange-200' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 text-center ${s.color}`}>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {results.map((r, i) => <AddressResultCard key={i} address={r.address} pin={r.pin} client={r.client} />)}
          </div>
        </div>
      )}
    </div>
  );
}
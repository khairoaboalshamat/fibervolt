import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import AddressResultCard from './AddressResultCard.jsx';
import * as XLSX from 'xlsx';

export default function BulkUploadScanner({ pins, clientMap }) {
  const fileInputRef = useRef();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const processFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResults([]);
    setProgress(0);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const addresses = rows.map(r => r['address'] || r['Address'] || r['ADDRESS'] || '').filter(Boolean);
      const checked = [];
      for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i];
        const addrKey = addr.toLowerCase().trim();
        const pin = pins.find(p => p.address && p.address.toLowerCase().trim() === addrKey);
        const client = clientMap[addrKey];
        checked.push({
          address: addr,
          fiberStatus: pin?.fiber_status || 'unknown',
          isCustomer: !!client || pin?.status === 'sale' || pin?.status === 'installed' || pin?.status === 'already_customer',
          customerName: client?.name,
          repName: pin?.rep_name,
          status: pin?.status,
        });
        setProgress(Math.round(((i + 1) / addresses.length) * 100));
      }
      setResults(checked);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const fiberCount = results.filter(r => r.fiberStatus === 'available').length;
  const customerCount = results.filter(r => r.isCustomer).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Upload a CSV or Excel file with an "address" column to check all addresses at once.</p>
      <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? `Processing… ${progress}%` : 'Upload File'}
      </Button>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={processFile} />
      {results.length > 0 && (
        <>
          <div className="flex gap-3 text-sm">
            <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {fiberCount} fiber available</span>
            <span className="text-blue-600 font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {customerCount} customers</span>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => <AddressResultCard key={i} {...r} />)}
          </div>
        </>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Loader2, CheckCircle2 } from 'lucide-react';
import AddressResultCard from '@/components/coverage/AddressResultCard.jsx';

export default function StreetScanner({ pins, clientMap }) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    if (!street || !city) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a list of 20 realistic street addresses on "${street}, ${city}". Use typical house number ranges. Return only JSON.`,
        response_json_schema: { type: 'object', properties: { addresses: { type: 'array', items: { type: 'string' } } } },
      });
      const addresses = res?.addresses || [];
      const checked = addresses.map(addr => {
        const addrKey = addr.toLowerCase().trim();
        const pin = pins.find(p => p.address && p.address.toLowerCase().trim() === addrKey);
        const client = clientMap[addrKey];
        return {
          address: addr,
          fiberStatus: pin?.fiber_status || 'unknown',
          isCustomer: !!client || pin?.status === 'sale' || pin?.status === 'installed' || pin?.status === 'already_customer',
          customerName: client?.name,
          repName: pin?.rep_name,
          status: pin?.status,
        };
      });
      setResults(checked);
    } finally {
      setLoading(false);
    }
  };

  const fiberCount = results.filter(r => r.fiberStatus === 'available').length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Enter a street name to scan all addresses on it.</p>
      <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="Street name (e.g. Oak Lane)" />
      <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City, State" />
      <Button onClick={scan} disabled={loading || !street || !city} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
        {loading ? 'Scanning…' : 'Scan Street'}
      </Button>
      {results.length > 0 && (
        <>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> {fiberCount} of {results.length} addresses have fiber
          </p>
          <div className="space-y-2">{results.map((r, i) => <AddressResultCard key={i} {...r} />)}</div>
        </>
      )}
    </div>
  );
}
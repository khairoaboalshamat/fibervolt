import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, CreditCard, Home, FileText, X, Loader2, CheckCircle2, Upload } from 'lucide-react';

const MODES = [
  { id: 'business_card', label: 'Business Card', icon: CreditCard, desc: 'Scan a business card to extract contact info' },
  { id: 'address', label: 'Address/Door', icon: Home, desc: 'Scan a door number or address sign' },
  { id: 'paper_list', label: 'Paper List', icon: FileText, desc: 'Scan a printed address list' },
];

export default function LeadScanner({ user, onPinsCreated, onClose }) {
  const [mode, setMode] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const handleImage = async (file) => {
    if (!file) return;
    setScanning(true);
    setResults(null);

    try {
      // Upload image first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);

      // Use AI to extract data based on mode
      let prompt = '';
      let schema = {};

      if (mode === 'business_card') {
        prompt = `This is a photo of a business card. Extract all contact information you can find. Return the data as JSON.`;
        schema = {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  address: { type: 'string' },
                  company: { type: 'string' },
                }
              }
            }
          }
        };
      } else if (mode === 'address') {
        prompt = `This is a photo of a house, door, or address sign. Extract the street address or house number visible in the image. If you can see a street name or number, include it. Return as JSON.`;
        schema = {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string', description: 'Full or partial street address visible' },
                }
              }
            }
          }
        };
      } else if (mode === 'paper_list') {
        prompt = `This is a photo of a printed list of addresses or leads. Extract every address, name, and phone number you can find. Return as JSON array.`;
        schema = {
          type: 'object',
          properties: {
            leads: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  phone: { type: 'string' },
                }
              }
            }
          }
        };
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: schema,
      });

      setResults(result);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const getLeadsFromResults = () => {
    if (!results) return [];
    if (mode === 'business_card') return results.contacts || [];
    if (mode === 'address') return results.addresses || [];
    if (mode === 'paper_list') return results.leads || [];
    return [];
  };

  const handleSaveAll = async () => {
    const leads = getLeadsFromResults();
    if (!leads.length) return;

    setSaving(true);
    try {
      // For each lead, geocode the address if we have one, then create a pin
      const pinsToCreate = [];

      for (const lead of leads) {
        if (!lead.address) continue;
        try {
          const geo = await base44.functions.invoke('reverseGeocode', { address: lead.address });
          const { lat, lng } = geo.data || {};
          if (lat && lng) {
            pinsToCreate.push({
              address: lead.address,
              lat,
              lng,
              status: 'lead',
              customer_name: lead.name || '',
              phone: lead.phone || '',
              email: lead.email || '',
              rep_email: user?.email,
              rep_name: user?.full_name || user?.email,
              source: 'manual',
              notes: lead.company ? `Company: ${lead.company}` : '',
            });
          }
        } catch {
          // skip if geocoding fails
        }
      }

      if (pinsToCreate.length > 0) {
        await base44.entities.MapPin.bulkCreate(pinsToCreate);
        onPinsCreated?.(pinsToCreate.length);
      }

      setDone(true);
      setTimeout(() => onClose(), 1500);
    } finally {
      setSaving(false);
    }
  };

  const leads = getLeadsFromResults();

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Lead Scanner
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold">Leads saved to map!</p>
          </div>
        ) : !mode ? (
          // Mode selection
          <div className="grid grid-cols-1 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          // Scan mode
          <div className="space-y-4">
            <button onClick={() => { setMode(null); setResults(null); setImageUrl(null); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← Back
            </button>

            <p className="font-semibold">{MODES.find(m => m.id === mode)?.label}</p>

            {/* Image capture */}
            {!imageUrl && !scanning && (
              <div className="flex flex-col gap-3">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => handleImage(e.target.files[0])}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleImage(e.target.files[0])}
                />
                <Button onClick={() => cameraInputRef.current?.click()} className="w-full gap-2">
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                  <Upload className="h-4 w-4" /> Upload from Library
                </Button>
              </div>
            )}

            {scanning && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Scanning with AI...</p>
              </div>
            )}

            {imageUrl && !scanning && (
              <img src={imageUrl} alt="Scanned" className="w-full rounded-xl object-cover max-h-48" />
            )}

            {/* Results */}
            {results && leads.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-sm">{leads.length} lead{leads.length > 1 ? 's' : ''} found:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leads.map((lead, i) => (
                    <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                      {lead.name && <p className="font-medium">{lead.name}</p>}
                      {lead.address && <p className="text-muted-foreground">{lead.address}</p>}
                      {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                      {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                      {lead.company && <p className="text-muted-foreground">{lead.company}</p>}
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveAll} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {saving ? 'Saving...' : `Save ${leads.length} Lead${leads.length > 1 ? 's' : ''} to Map`}
                </Button>
                <Button variant="outline" onClick={() => { setResults(null); setImageUrl(null); }} className="w-full">
                  Scan Again
                </Button>
              </div>
            )}

            {results && leads.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p>No leads detected. Try a clearer photo.</p>
                <Button variant="outline" onClick={() => { setResults(null); setImageUrl(null); }} className="mt-3">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
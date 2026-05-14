export const PIN_STATUSES = [
  { value: 'lead',             label: 'Lead',             color: '#3b82f6', bg: 'bg-blue-500/10',    text: 'text-blue-400',   border: 'border-blue-500/30' },
  { value: 'knocked',          label: 'Knocked',          color: '#94a3b8', bg: 'bg-slate-500/10',   text: 'text-slate-400',  border: 'border-slate-500/30' },
  { value: 'no_answer',        label: 'No Answer',        color: '#6b7280', bg: 'bg-gray-500/10',    text: 'text-gray-400',   border: 'border-gray-500/30' },
  { value: 'follow_up',        label: 'Follow Up',        color: '#f97316', bg: 'bg-orange-500/10',  text: 'text-orange-400', border: 'border-orange-500/30' },
  { value: 'interested',       label: 'Interested',       color: '#f59e0b', bg: 'bg-amber-500/10',   text: 'text-amber-400',  border: 'border-amber-500/30' },
  { value: 'not_interested',   label: 'Not Interested',   color: '#ef4444', bg: 'bg-red-500/10',     text: 'text-red-400',    border: 'border-red-500/30' },
  { value: 'callback',         label: 'Callback',         color: '#a855f7', bg: 'bg-purple-500/10',  text: 'text-purple-400', border: 'border-purple-500/30' },
  { value: 'already_customer', label: 'Already Customer', color: '#8b5cf6', bg: 'bg-violet-500/10',  text: 'text-violet-400', border: 'border-violet-500/30' },
  { value: 'sale',             label: 'Sale',             color: '#22c55e', bg: 'bg-green-500/10',   text: 'text-green-400',  border: 'border-green-500/30' },
  { value: 'installed',        label: 'Installed',        color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400',border: 'border-emerald-500/30' },
  { value: 'cancelled',        label: 'Cancelled',        color: '#f43f5e', bg: 'bg-rose-500/10',    text: 'text-rose-400',   border: 'border-rose-500/30' },
  { value: 'not_available',    label: 'Not Available',    color: '#475569', bg: 'bg-slate-600/10',   text: 'text-slate-500',  border: 'border-slate-600/30' },
];

export const FIBER_STATUSES = [
  { value: 'unknown',          label: 'Unknown',          color: '#6b7280' },
  { value: 'available',        label: 'Fiber Available',  color: '#22c55e' },
  { value: 'not_available',    label: 'Not Available',    color: '#ef4444' },
  { value: 'under_construction',label: 'Under Construction', color: '#f59e0b' },
  { value: 'planned',          label: 'Planned',          color: '#3b82f6' },
];

export function getStatus(value) {
  return PIN_STATUSES.find(s => s.value === value) || PIN_STATUSES[0];
}

export function getFiberStatus(value) {
  return FIBER_STATUSES.find(s => s.value === value) || FIBER_STATUSES[0];
}

export default function PinStatusBadge({ status }) {
  const s = getStatus(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}
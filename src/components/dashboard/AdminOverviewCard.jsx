import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, Users } from 'lucide-react';
import { TOTAL_STACK, REP_BASE_PAY, REP_MAX_PAY, calcRepPay, TIER_LABELS } from '@/lib/commissionData';

export default function AdminOverviewCard({ sales, users, repTiers = [] }) {
  const getRepTier = (email) => repTiers.find(t => t.rep_email === email)?.tier ?? 0;
  const isRepAdmin = (email) => users?.find(u => u.email === email)?.role === 'admin';

  // Calculate totals across all installed sales
  let totalStack = 0;
  let totalRepPay = 0;
  let totalOverride = 0;

  sales.filter(s => s.status === 'installed' && TOTAL_STACK[s.plan]).forEach(s => {
    const stack = TOTAL_STACK[s.plan];
    const repPay = isRepAdmin(s.rep_email) ? stack : calcRepPay(s.plan, getRepTier(s.rep_email));
    const override = isRepAdmin(s.rep_email) ? 0 : stack - repPay;
    totalStack += stack;
    totalRepPay += repPay;
    totalOverride += override;
  });

  // Per-rep breakdown (only non-admin reps with installed deals)
  const repEmails = [...new Set(
    sales.filter(s => s.status === 'installed' && TOTAL_STACK[s.plan] && !isRepAdmin(s.rep_email))
      .map(s => s.rep_email)
  )];

  const repBreakdown = repEmails.map(email => {
    const repUser = users?.find(u => u.email === email);
    const name = repUser?.full_name || email;
    const tier = getRepTier(email);
    const deals = sales.filter(s => s.status === 'installed' && s.rep_email === email).length;
    return { email, name, tier, deals };
  }).sort((a, b) => b.deals - a.deals);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Admin Override Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Stack</p>
            <p className="text-lg font-bold text-foreground">${totalStack.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Rep Pay</p>
            <p className="text-lg font-bold text-amber-500">${totalRepPay.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-accent/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Your Override</p>
            <p className="text-lg font-bold text-accent">${totalOverride.toLocaleString()}</p>
          </div>
        </div>

        {repBreakdown.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" /> Rep Pay Tiers
            </p>
            {repBreakdown.map(r => (
              <div key={r.email} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.deals} deals installed</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-500">
                    Rep: ${calcRepPay('1G', r.tier)} (1G)
                  </p>
                  <p className="text-xs text-muted-foreground">{TIER_LABELS[r.tier]}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
          <p className="font-medium text-foreground">Pay Stack per deal:</p>
          <div className="grid grid-cols-4 gap-1 text-center font-medium text-foreground/70 pb-1">
            <span>Plan</span><span>Stack</span><span>Rep (base→max)</span><span>Override</span>
          </div>
          {Object.entries(TOTAL_STACK).map(([plan, stack]) => (
            <div key={plan} className="grid grid-cols-4 gap-1 text-center">
              <span className="font-semibold text-foreground">{plan}</span>
              <span>${stack}</span>
              <span>${REP_BASE_PAY[plan]}→${REP_MAX_PAY[plan]}</span>
              <span className="text-accent font-semibold">${stack - REP_MAX_PAY[plan]}–${stack - REP_BASE_PAY[plan]}</span>
            </div>
          ))}
          <p className="pt-1 text-muted-foreground/70">Rep tier boost: +$25/tier (Tier 1–4)</p>
        </div>
      </CardContent>
    </Card>
  );
}
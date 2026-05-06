import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { TOTAL_STACK, REP_BASE_PAY, calcRepPay, calcAdminOverride } from '@/lib/commissionData';

export default function AdminOverviewCard({ sales, users }) {
  // Group installed deals per rep
  const repDealCounts = {};
  sales.forEach(s => {
    if (s.status === 'installed' && s.rep_email) {
      repDealCounts[s.rep_email] = (repDealCounts[s.rep_email] || 0) + 1;
    }
  });

  // Calculate totals across all installed sales
  let totalStack = 0;
  let totalRepPay = 0;
  let totalOverride = 0;

  sales.filter(s => s.status === 'installed' && TOTAL_STACK[s.plan]).forEach(s => {
    const dealCount = repDealCounts[s.rep_email] || 0;
    const repPay = calcRepPay(s.plan, dealCount);
    const stack = TOTAL_STACK[s.plan] || 0;
    const override = stack - repPay;
    totalStack += stack;
    totalRepPay += repPay;
    totalOverride += override;
  });

  // Per-rep breakdown
  const repBreakdown = Object.entries(repDealCounts).map(([email, deals]) => {
    const repUser = users?.find(u => u.email === email);
    const name = repUser?.full_name || email;
    // Calculate this rep's current pay tier for a sample plan (1G base)
    const currentBase = calcRepPay('1G', deals);
    const tierBoost = Math.floor(deals / 25) * 25;
    return { email, name, deals, tierBoost };
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
                  <p className="font-semibold text-foreground">
                    Base +${r.tierBoost} boost
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.deals >= 25 ? `Tier ${Math.floor(r.deals / 25)}` : 'Starter tier'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
          <p className="font-medium">Pay Stack per deal:</p>
          {Object.entries(TOTAL_STACK).map(([plan, stack]) => (
            <div key={plan} className="flex justify-between">
              <span>{plan}: Stack ${stack} | Rep base ${REP_BASE_PAY[plan]} | Override ${stack - REP_BASE_PAY[plan]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
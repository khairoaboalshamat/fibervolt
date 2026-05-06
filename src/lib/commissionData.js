// Default plan prices and commissions
export const DEFAULT_PLANS = [
  { name: "7G", monthly_price: 300, commission: 225 },
  { name: "5G", monthly_price: 250, commission: 200 },
  { name: "2G", monthly_price: 200, commission: 175 },
  { name: "1G", monthly_price: 150, commission: 150 },
  { name: "500M", monthly_price: 100, commission: 0 },
  { name: "200M", monthly_price: 75, commission: 0 },
];

// Total pay stack per deal (what admin collects from provider)
export const TOTAL_STACK = {
  "7G": 475,
  "5G": 425,
  "2G": 375,
  "1G": 325,
};

// Rep base pay per plan
export const REP_BASE_PAY = {
  "7G": 225,
  "5G": 200,
  "2G": 175,
  "1G": 150,
};

// Rep max pay per plan (reached at 100 deals)
export const REP_MAX_PAY = {
  "7G": 325,
  "5G": 300,
  "2G": 275,
  "1G": 250,
};

// Rep boost: +$25 every 25 deals, max at 100 deals (4 tiers)
export function calcRepPay(plan, totalInstalledDeals) {
  const base = REP_BASE_PAY[plan];
  const max = REP_MAX_PAY[plan];
  if (base === undefined) return 0;
  const boostTiers = Math.min(Math.floor(totalInstalledDeals / 25), 4);
  const boosted = base + boostTiers * 25;
  return Math.min(boosted, max);
}

// Admin override = total stack - rep pay
export function calcAdminOverride(plan, totalInstalledDeals) {
  const stack = TOTAL_STACK[plan];
  if (stack === undefined) return 0;
  return stack - calcRepPay(plan, totalInstalledDeals);
}

export const DEFAULT_ADDONS = [
  { name: "Whole Home Wi-Fi", monthly_price: 10, commission: 20 },
  { name: "Whole Home Wi-Fi Plus", monthly_price: 20, commission: 25 },
  { name: "YouTube TV", monthly_price: 73, commission: 25 },
  { name: "Static IP", monthly_price: 15, commission: 0 },
  { name: "Unlimited Data", monthly_price: 30, commission: 0 },
];

export function calcMonthlyBill(plan, addOns, plans, addons) {
  const planData = plans.find(p => p.name === plan);
  let total = planData?.monthly_price || 0;
  addOns.forEach(ao => {
    const addon = addons.find(a => a.name === ao);
    total += addon?.monthly_price || 0;
  });
  return total;
}

export function calcCommission(plan, addOns, plans, addons, boosts = [], repEmail = '') {
  const planData = plans.find(p => p.name === plan);
  let total = planData?.commission || 0;
  
  // Add boost for this rep/plan
  const boost = boosts.find(b => b.rep_email === repEmail && b.plan === plan);
  if (boost) total += boost.boost_amount;

  addOns.forEach(ao => {
    const addon = addons.find(a => a.name === ao);
    total += addon?.commission || 0;
  });
  return total;
}
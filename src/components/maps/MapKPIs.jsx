import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { DoorOpen, ShoppingCart, Wrench, Package } from 'lucide-react';
import { subDays } from 'date-fns';

export default function MapKPIs({ pins, sales, userEmail }) {
  const stats = useMemo(() => {
    const myPins = pins.filter(p => p.rep_email === userEmail);
    const doorsKnocked = myPins.length;

    const mySales = sales.filter(s => s.rep_email === userEmail);
    const totalOrders = mySales.length;

    const installed = mySales.filter(s => s.status === 'installed');
    const installRate = totalOrders > 0 ? Math.round((installed.length / totalOrders) * 100) : 0;

    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentInstalls = installed.filter(s => s.install_date && new Date(s.install_date) >= thirtyDaysAgo).length;

    const withAddons = mySales.filter(s => s.add_ons && s.add_ons.length > 0).length;
    const addOnRate = totalOrders > 0 ? Math.round((withAddons / totalOrders) * 100) : 0;

    return { doorsKnocked, totalOrders, installRate, recentInstalls, addOnRate };
  }, [pins, sales, userEmail]);

  const items = [
    { label: 'Doors Knocked', value: stats.doorsKnocked, icon: DoorOpen, color: 'text-blue-400' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-green-400' },
    { label: 'Install Rate', value: `${stats.installRate}%`, icon: Wrench, color: 'text-amber-400' },
    { label: 'Installs (30d)', value: stats.recentInstalls, icon: Wrench, color: 'text-accent' },
    { label: 'Add-On Rate', value: `${stats.addOnRate}%`, icon: Package, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-3 text-center">
          <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </Card>
      ))}
    </div>
  );
}
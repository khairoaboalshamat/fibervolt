import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import SaleRow from '@/components/dashboard/SaleRow';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-install_date', 500),
  });

  const mySales = isAdmin ? sales : sales.filter(s => s.rep_email === user?.email);

  const installDates = useMemo(() => {
    const map = {};
    mySales.forEach(s => {
      if (!s.install_date || s.status === 'cancelled') return;
      const key = s.install_date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [mySales]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedSales = selectedDay ? (installDates[format(selectedDay, 'yyyy-MM-dd')] || []) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Install Calendar</h1>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const hasInstalls = !!installDates[key];
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    relative bg-card p-2 min-h-[60px] text-left transition-all
                    ${!inMonth ? 'opacity-30' : ''}
                    ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                    hover:bg-muted/50
                  `}
                >
                  <span className={`text-sm font-medium ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {hasInstalls && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {installDates[key].slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-base font-semibold mb-3">
              Installs on {format(selectedDay, 'MMM d, yyyy')}
            </h3>
            {selectedSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No installs this day</p>
            ) : (
              <div className="divide-y divide-border">
                {selectedSales.map(s => <SaleRow key={s.id} sale={s} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
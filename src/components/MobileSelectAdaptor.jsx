import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Wrapper component that renders shadcn Select as a Drawer on mobile
 * and as a normal Select on desktop.
 * 
 * Usage:
 * <MobileSelectAdaptor value={val} onValueChange={setVal}>
 *   <SelectItem value="opt1">Option 1</SelectItem>
 *   ...
 * </MobileSelectAdaptor>
 */
export default function MobileSelectAdaptor({
  value,
  onValueChange,
  children,
  placeholder = 'Select...',
  triggerClassName,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 ${triggerClassName || ''}`}>
          <span className="text-sm">{placeholder}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-96">
        <ScrollArea className="w-full">
          <div className="p-4 space-y-2">
            {React.Children.map(children, (child) => {
              if (child?.props?.value) {
                return (
                  <button
                    key={child.props.value}
                    onClick={() => {
                      onValueChange(child.props.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors select-none ${
                      value === child.props.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {child.props.children}
                  </button>
                );
              }
              return child;
            })}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
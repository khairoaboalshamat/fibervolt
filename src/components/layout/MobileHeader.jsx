import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileHeader({ title, showBackButton = true, onBackClick }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border pt-safe pb-4 px-4 lg:hidden">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 select-none"
            onClick={handleBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight flex-1">{title}</h1>
      </div>
    </div>
  );
}
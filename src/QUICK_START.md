# Mobile Optimization - Quick Start Guide

## What Was Added

✅ **Bottom Navigation** - 4-tab mobile bar (Dashboard, New Sale, Map, Activity)
✅ **Safe Area Support** - Notch/home indicator handling for iOS
✅ **Pull-to-Refresh** - Swipe down to refresh on Dashboard & Activity
✅ **Mobile Header** - Native-style header with back button
✅ **Delete Account** - Apple compliance feature
✅ **Mobile Selects** - Bottom sheets instead of dropdowns on mobile
✅ **Select-None** - Prevents text selection on rapid taps

---

## Quick Commands

### Test on Mobile
```bash
# Open DevTools mobile emulation
F12 → Ctrl+Shift+M → Set to 375px width
```

### Test on Real Device
```bash
# iOS Simulator
open /Applications/Xcode.app/Contents/Developer/Applications/iPhone\ Simulator.app

# Android Emulator
$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_33
```

---

## Component Reference

### MobileHeader
```jsx
import MobileHeader from '@/components/layout/MobileHeader';

<MobileHeader 
  title="My Page"
  showBackButton={true}
  onBackClick={() => console.log('Back clicked')}
/>
```

### BottomTabs
Automatically appears on mobile. No configuration needed.

### PullToRefresh
```jsx
import PullToRefresh from '@/components/PullToRefresh';

<PullToRefresh 
  onRefresh={async () => {
    await queryClient.refetchQueries({ queryKey: ['data'] });
  }}
  isLoading={false}
>
  {/* Page content */}
</PullToRefresh>
```

### MobileSelectAdaptor
```jsx
import MobileSelectAdaptor from '@/components/MobileSelectAdaptor';
import { SelectItem } from '@/components/ui/select';

<MobileSelectAdaptor 
  value={selected}
  onValueChange={setSelected}
  placeholder="Choose..."
>
  <SelectItem value="opt1">Option 1</SelectItem>
</MobileSelectAdaptor>
```

### DeleteAccountDialog
Automatically in Sidebar. No code needed.

---

## CSS Utilities

### Safe Area Padding
```css
pt-safe    /* padding-top: env(safe-area-inset-top) */
px-safe    /* left + right safe insets */
pb-safe    /* padding-bottom: env(safe-area-inset-bottom) */
```

### Mobile Detection
```jsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();  // true if < 768px
```

---

## Common Patterns

### Detail Page Template
```jsx
import MobileHeader from '@/components/layout/MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MyDetailPage() {
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile && <MobileHeader title="Page Title" />}
      <div className={isMobile ? 'p-4 pb-20' : 'max-w-2xl mx-auto'}>
        {/* Content here */}
      </div>
    </>
  );
}
```

### List Page with Refresh
```jsx
import PullToRefresh from '@/components/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

export default function MyListPage() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['items'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* List items */}
      </div>
    </PullToRefresh>
  );
}
```

---

## Troubleshooting

### Bottom tabs not showing?
- Check viewport width < 768px
- Verify useIsMobile() returns true
- Check z-50 isn't hidden by parent overflow

### Safe area not working?
- iOS only feature (Android returns 0)
- Requires viewport-fit=cover in meta tag ✅ (already set)
- Clear browser cache if updating

### Pull-to-refresh not working?
- Must be at scroll position 0 (top)
- Touch device required (won't work with mouse)
- Verify onRefresh handler is async

### MobileSelectAdaptor not opening?
- Check useIsMobile() is true on mobile
- Verify SelectItem children have value prop
- Open DevTools console for error messages

---

## Performance Tips

1. **Code splitting** - New components only load on mobile
2. **CSS variables** - Safe area insets use zero-cost CSS
3. **Pull-to-refresh** - Debounced touch handlers (no jank)
4. **Bottom tabs** - Fixed position, doesn't impact main scroll

---

## Browser Support

| Browser | iOS | Android | Desktop |
|---------|-----|---------|---------|
| Safari | ✅ 11+ | N/A | ✅ |
| Chrome | N/A | ✅ 5+ | ✅ |
| Firefox | ✅ 10+ | ✅ 5+ | ✅ |
| Edge | ✅ | ✅ | ✅ |

---

## Next Steps

1. Test on mobile device or emulator
2. Verify bottom tabs appear on < 768px
3. Test pull-to-refresh gesture
4. Confirm safe area padding on iOS notch
5. Try delete account feature
6. Use MobileSelectAdaptor in new filters

---

**Questions?** See `IMPLEMENTATION_SUMMARY.md` for detailed docs.
**Issues?** Check `MOBILE_CHECKLIST.md` for debugging steps.
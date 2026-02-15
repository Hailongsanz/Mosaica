import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const VIEWPORT_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function WheelColumn({ items, value, onChange, label, width = 'w-14' }) {
  const containerRef = useRef(null);
  const snapTimer = useRef(null);
  const isScrolling = useRef(false);

  const selectedIndex = items.indexOf(value);
  const paddingCount = Math.floor(VISIBLE_ITEMS / 2);

  // Scroll to the selected item (centered in viewport)
  const scrollToIndex = useCallback((index, smooth = false) => {
    if (!containerRef.current || index < 0) return;
    const target = index * ITEM_HEIGHT;
    if (smooth) {
      containerRef.current.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      containerRef.current.scrollTop = target;
    }
  }, []);

  // On mount / value change, jump to the right position
  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  // After any scroll, snap to the nearest item
  const scheduleSnap = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      containerRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
      isScrolling.current = false;
    }, 100);
  }, [items, value, onChange]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    scheduleSnap();
  }, [scheduleSnap]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (!containerRef.current) return;
    containerRef.current.scrollTop += Math.sign(e.deltaY) * ITEM_HEIGHT;
    scheduleSnap();
  }, [scheduleSnap]);

  const handleItemClick = (item, index) => {
    scrollToIndex(index, true);
    onChange(item);
  };

  // Cleanup timer
  useEffect(() => () => { if (snapTimer.current) clearTimeout(snapTimer.current); }, []);

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className={cn("relative rounded-xl overflow-hidden", width)} style={{ height: VIEWPORT_HEIGHT }}>
        {/* Selection highlight — solid rounded pill */}
        <div
          className="absolute left-1 right-1 rounded-lg bg-primary/15 dark:bg-primary/25 pointer-events-none z-10"
          style={{ top: paddingCount * ITEM_HEIGHT + 2, height: ITEM_HEIGHT - 4 }}
        />

        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
          {/* Top spacers so first item can reach center */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`t${i}`} style={{ height: ITEM_HEIGHT }} aria-hidden />
          ))}

          {items.map((item, index) => {
            const isSelected = item === value;
            return (
              <div
                key={item}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex items-center justify-center cursor-pointer select-none transition-colors duration-100",
                  isSelected
                    ? "text-foreground font-semibold text-[17px]"
                    : "text-muted-foreground/60 text-sm hover:text-muted-foreground"
                )}
                style={{ height: ITEM_HEIGHT }}
                onClick={() => handleItemClick(item, index)}
              >
                {item}
              </div>
            );
          })}

          {/* Bottom spacers so last item can reach center */}
          {Array.from({ length: paddingCount }).map((_, i) => (
            <div key={`b${i}`} style={{ height: ITEM_HEIGHT }} aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

// Data
const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const allMinutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const periods = ['AM', 'PM'];

// 24h ↔ 12h helpers
function parse24h(time) {
  if (!time) return { hour12: '12', minute: '00', period: 'AM' };
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return {
    hour12: String(hour12).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
    period,
  };
}

function to24h(hour12, minute, period) {
  let h = parseInt(hour12, 10);
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export default function TimeWheelPicker({ value, onChange, label, className, highlight }) {
  const parsed = parse24h(value);
  const [hour, setHour] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const p = parse24h(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const commit = (h, m, p) => onChange(to24h(h, m, p));

  const displayTime = value ? `${parsed.hour12}:${parsed.minute} ${parsed.period}` : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            highlight && "ring-2 ring-amber-400 border-amber-400",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime || (label || 'Set time')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-start gap-1">
          <WheelColumn
            items={hours12}
            value={hour}
            onChange={(h) => { setHour(h); commit(h, minute, period); }}
            label="Hour"
          />

          <div className="flex items-center justify-center pt-6" style={{ height: VIEWPORT_HEIGHT }}>
            <span className="text-xl font-bold text-muted-foreground">:</span>
          </div>

          <WheelColumn
            items={allMinutes}
            value={minute}
            onChange={(m) => { setMinute(m); commit(hour, m, period); }}
            label="Min"
            width="w-14"
          />

          <div className="w-px bg-border mx-1 self-stretch mt-5" />

          <WheelColumn
            items={periods}
            value={period}
            onChange={(p) => { setPeriod(p); commit(hour, minute, p); }}
            label=""
            width="w-12"
          />
        </div>

        <div className="flex justify-between mt-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onChange(''); setOpen(false); }}
            className="text-muted-foreground text-xs"
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} className="text-xs">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

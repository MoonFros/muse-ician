import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function Menu({
  items,
  label = 'More actions',
  trigger,
  align = 'right',
  triggerClassName = 'btn-icon',
}: {
  items: (MenuItem | { separator: true })[];
  label?: string;
  trigger?: ReactNode;
  align?: 'left' | 'right';
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    const timer = setTimeout(() => firstItemRef.current?.focus(), 20);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [open]);

  let firstRendered = false;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {trigger ?? <Icon name="more" size={16} />}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={`absolute top-full z-50 mt-1.5 w-52 animate-fade-up overflow-hidden rounded-xl border border-ink-600 bg-ink-850 p-1.5 shadow-lift ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {items.map((item, index) => {
            if ('separator' in item) {
              return <div key={`sep-${index}`} className="my-1 border-t border-ink-700/70" />;
            }
            const isFirst = !firstRendered;
            if (!item.disabled) firstRendered = true;
            return (
              <button
                key={`${item.label}-${index}`}
                ref={isFirst ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger ? 'text-danger hover:bg-danger/10' : 'text-slate-muted hover:bg-ink-750 hover:text-slate-text'
                }`}
              >
                {item.icon ? <Icon name={item.icon} size={14} className="mt-0.5 shrink-0" /> : null}
                <span className="min-w-0">
                  <span className="block">{item.label}</span>
                  {item.hint ? <span className="block text-2xs text-slate-faint">{item.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

import { Check, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { inputClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { searchZones, timeZones, zoneName, zoneOffset } from "../zones";

/**
 * A searchable list of time zones (the ARIA combobox pattern): type a city or region,
 * move with the arrow keys, Enter to choose, Escape to keep the current one.
 */
export function ZonePicker({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (zone: string) => void;
  label: string;
  hint?: string;
}) {
  const zones = useMemo(() => timeZones(), []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const results = useMemo(() => searchZones(zones, query), [zones, query]);
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (open)
      document
        .getElementById(optionId(active))
        ?.scrollIntoView({ block: "nearest" });
    // optionId only depends on the stable id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (zone: string | undefined) => {
    if (zone) onChange(zone);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) =>
        results.length ? (i + step + results.length) % results.length : 0,
      );
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      pick(results[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label text-ink">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={hint ? hintId : undefined}
          aria-activedescendant={
            open && results[active] ? optionId(active) : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className={cn(inputClass, "h-11 pl-10 pr-3.5")}
          value={open ? query : `${zoneName(value)} (${zoneOffset(value)})`}
          placeholder="Search a city or region"
          onFocus={(event) => {
            setOpen(true);
            setActive(0);
            event.currentTarget.select();
          }}
          onBlur={close}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-panel border border-line bg-surface p-1 shadow-sheet"
          >
            {results.map((zone, index) => (
              <li
                key={zone}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(zone)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-[0.9375rem]",
                  index === active && "bg-surface-2",
                )}
              >
                <span className="flex items-center gap-2">
                  {zone === value ? (
                    <Check className="size-4 shrink-0 text-chalk" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                  {zoneName(zone)}
                </span>
                <span className="type-figure shrink-0 text-[0.8125rem] text-ink-3">
                  {zoneOffset(zone)}
                </span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 text-[0.9375rem] text-ink-3">
                No time zone matches "{query}". Try a big city nearby.
              </li>
            )}
          </ul>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-[0.8125rem] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

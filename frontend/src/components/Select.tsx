import * as SelectPrimitive from "@radix-ui/react-select";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onValueChange,
  options,
  placeholder = "Оберіть...",
  disabled,
  className = "",
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={`field-input inline-flex items-center justify-between gap-2 [-webkit-tap-highlight-color:transparent] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="text-ink-soft">
          <svg
            width="13"
            height="13"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="select-content z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt}
                value={opt}
                className="cursor-pointer select-none rounded-lg px-3 py-2 text-sm text-ink outline-none [-webkit-tap-highlight-color:transparent] data-[highlighted]:bg-brand-soft data-[state=checked]:font-bold data-[state=checked]:text-brand"
              >
                <SelectPrimitive.ItemText>{opt}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

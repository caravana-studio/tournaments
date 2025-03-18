import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
}

const AmountInput = ({ value, onChange }: AmountInputProps) => {
  const PREDEFINED_AMOUNTS = [
    { value: 1, label: "$1" },
    { value: 5, label: "$5" },
    { value: 10, label: "$10" },
    { value: 50, label: "$50" },
  ];
  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-row gap-2">
        {PREDEFINED_AMOUNTS.map(({ value: presetValue, label }) => (
          <Button
            key={presetValue}
            type="button"
            variant={value === presetValue ? "default" : "outline"}
            className="px-2"
            onClick={() => onChange(presetValue)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Input
        type="number"
        placeholder="0.0"
        className="w-[80px] p-1"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};

export default AmountInput;

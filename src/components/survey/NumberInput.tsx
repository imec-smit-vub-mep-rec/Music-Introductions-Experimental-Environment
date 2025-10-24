'use client';

import { Input } from '@/components/ui/input';

interface NumberInputProps {
  question: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
}

export function NumberInput({ 
  question, 
  value, 
  onChange, 
  placeholder = '',
  required = false,
  min,
  max
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(null);
    } else {
      const numValue = parseInt(inputValue, 10);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-dark-purple">
        {question}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <Input
        type="number"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className="border-dark-purple focus:border-maize focus:ring-maize"
      />
    </div>
  );
}

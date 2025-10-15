'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CheckboxQuestionProps {
  question: string;
  options: string[];
  value?: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
}

export function CheckboxQuestion({ 
  question, 
  options, 
  value = [], 
  onChange, 
  required = false 
}: CheckboxQuestionProps) {
  const handleChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...value, option]);
    } else {
      onChange(value.filter(v => v !== option));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-dark-purple">
        {question}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-3">
            <Checkbox 
              id={option}
              checked={value.includes(option)}
              onCheckedChange={(checked) => handleChange(option, checked as boolean)}
              className="border-dark-purple data-[state=checked]:bg-maize data-[state=checked]:border-maize"
            />
            <Label 
              htmlFor={option}
              className="text-dark-purple cursor-pointer flex-1"
            >
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

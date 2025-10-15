'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MultipleChoiceProps {
  question: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function MultipleChoice({ 
  question, 
  options, 
  value, 
  onChange, 
  required = false 
}: MultipleChoiceProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-dark-purple">
        {question}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-3">
            <RadioGroupItem 
              value={option} 
              id={option}
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
      </RadioGroup>
    </div>
  );
}

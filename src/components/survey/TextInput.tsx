'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TextInputProps {
  question: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}

export function TextInput({ 
  question, 
  value, 
  onChange, 
  placeholder = '',
  multiline = false,
  required = false 
}: TextInputProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-dark-purple">
        {question}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] border-dark-purple focus:border-maize focus:ring-maize"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-dark-purple focus:border-maize focus:ring-maize"
        />
      )}
    </div>
  );
}

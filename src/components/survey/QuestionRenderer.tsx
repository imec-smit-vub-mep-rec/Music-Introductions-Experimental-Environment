'use client';

import { Question } from '@/lib/types';
import { MultipleChoice } from './MultipleChoice';
import { CheckboxQuestion } from './CheckboxQuestion';
import { TextInput } from './TextInput';
import { RatingScale } from './RatingScale';

interface QuestionRendererProps {
  question: Question;
  value?: any;
  onChange: (value: any) => void;
}

export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice
          question={question.text}
          options={question.options || []}
          value={value}
          onChange={onChange}
          required={question.required}
        />
      );
    
    case 'checkbox':
      return (
        <CheckboxQuestion
          question={question.text}
          options={question.options || []}
          value={value}
          onChange={onChange}
          required={question.required}
        />
      );
    
    case 'text':
      return (
        <TextInput
          question={question.text}
          value={value}
          onChange={onChange}
          placeholder={question.placeholder}
          multiline={true}
          required={question.required}
        />
      );
    
    case 'rating':
      return (
        <RatingScale
          question={question.text}
          value={value}
          onChange={onChange}
          min={question.min}
          max={question.max}
          required={question.required}
        />
      );
    
    default:
      return <div>Unsupported question type</div>;
  }
}

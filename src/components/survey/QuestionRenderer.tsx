'use client';

import { Question, AnswerValue } from '@/lib/types';
import { MultipleChoice } from './MultipleChoice';
import { CheckboxQuestion } from './CheckboxQuestion';
import { TextInput } from './TextInput';
import { RatingScale } from './RatingScale';

interface QuestionRendererProps {
  question: Question;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onAutoNext?: () => void;
}

export function QuestionRenderer({ question, value, onChange, onAutoNext }: QuestionRendererProps) {
  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice
          question={question.text}
          options={question.options || []}
          value={value}
          onChange={onChange}
          required={question.required}
          onAutoNext={onAutoNext}
        />
      );
    
    case 'checkbox':
      return (
        <CheckboxQuestion
          question={question.text}
          options={question.options || []}
          value={value as string[]}
          onChange={onChange}
          required={question.required}
        />
      );
    
    case 'text':
      return (
        <TextInput
          question={question.text}
          value={value as string}
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
          value={value as number}
          onChange={onChange}
          min={question.min}
          max={question.max}
          required={question.required}
          onAutoNext={onAutoNext}
        />
      );
    
    default:
      return <div>Unsupported question type</div>;
  }
}

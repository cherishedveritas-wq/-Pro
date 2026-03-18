import React, { useState, useEffect } from 'react';
import { Input, InputProps } from './Input';

interface FormattedNumberInputProps extends Omit<InputProps, 'onChange' | 'value' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

export function FormattedNumberInput({ value, onChange, ...props }: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    // Update display value when the external value changes, 
    // but avoid formatting if the user is currently typing a valid number that just lacks commas
    // Actually, formatting on every keystroke is standard for financial inputs.
    if (value !== undefined && value !== null) {
      setDisplayValue(value.toLocaleString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Allow just a minus sign for negative numbers
    if (inputValue === '-') {
      setDisplayValue('-');
      return;
    }

    // Remove all characters except digits and minus sign
    const rawValue = inputValue.replace(/[^\d-]/g, '');
    
    // Ensure minus sign is only at the beginning
    const sanitizedValue = rawValue.replace(/(?!^)-/g, '');

    const numValue = Number(sanitizedValue);
    
    if (!isNaN(numValue)) {
      // We don't set displayValue here directly to avoid cursor jumping issues,
      // we let the useEffect handle it, OR we format it right away.
      // Formatting right away is better for immediate feedback.
      setDisplayValue(numValue.toLocaleString());
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    // On blur, ensure the value is properly formatted
    if (displayValue === '-' || displayValue === '') {
      setDisplayValue('0');
      onChange(0);
    } else {
      setDisplayValue(value.toLocaleString());
    }
  };

  return (
    <Input
      {...props}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

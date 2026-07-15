import React, { useState, useEffect } from "react";

interface CommaSeparatedInputProps {
  value: string[];
  onChange: (updatedValue: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function CommaSeparatedInput({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: CommaSeparatedInputProps) {
  const [inputValue, setInputValue] = useState("");

  // Keep in sync with external updates (such as clicking presets or loading a product)
  useEffect(() => {
    const joined = (value || []).join(", ");
    const currentParsed = inputValue.split(",").map(s => s.trim()).filter(Boolean).join(", ");
    const externalParsed = (value || []).join(", ");
    
    if (currentParsed !== externalParsed) {
      setInputValue(joined);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const parsed = val.split(",").map(s => s.trim()).filter(Boolean);
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}

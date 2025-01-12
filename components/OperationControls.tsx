import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { operationSchema, type OperationType } from '../config/operationSchema';
import MonacoPromptEditor from './MonacoPromptEditor';

interface OperationControlsProps {
  operation: string;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  wordWrap: boolean;
  showLineNumbers: boolean;
  onSettingsChange?: {
    wordWrap: (value: boolean) => void;
    lineNumbers: (value: boolean) => void;
  };
}

interface FieldArrayValue {
  values: any[];
  onChange: (values: any[]) => void;
}

const isArrayField = (fieldSchema: any) => {
  return Array.isArray(fieldSchema.type) && fieldSchema.type.includes('array') || 
         fieldSchema.type === 'array';
};

// Move isMultilineField outside components so it's accessible everywhere
const isMultilineField = (fieldName: string, operationType: string) => {
  const multilineFields = {
    llm: ['prompt'],
    shell: ['prompt'],
    run: ['prompt'],
    return: ['prompt']
  };
  return multilineFields[operationType as keyof typeof multilineFields]?.includes(fieldName);
};

// Update the record deletion button in ArrayField
const ArrayField: React.FC<{
  fieldName: string;
  values: any[];
  onChange: (values: any[]) => void;
  fieldSchema: any;
  showLineNumbers: boolean;
  wordWrap: boolean;
  operationType: string;
}> = ({ fieldName, values = [], onChange, fieldSchema, showLineNumbers, wordWrap, operationType }) => {
  // Ensure values is always an array
  const arrayValues = Array.isArray(values) ? values : [];
  
  useEffect(() => {
    // Only initialize if the array is empty
    if (arrayValues.length === 0) {
      onChange(['']);
    }
  }, []);

  const handleAddValue = () => {
    onChange([...arrayValues, '']); 
  };

  const handleRemoveValue = (index: number) => {
    const newValues = arrayValues.filter((_, i) => i !== index);
    // Only set to [''] if removing the last item
    onChange(newValues.length === 0 ? [''] : newValues);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newValues = [...arrayValues];
    newValues[index] = newValue;
    onChange(newValues);
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-col gap-2">
        {arrayValues.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            {isMultilineField(fieldName, operationType) ? (
              <div className="flex-1 border border-gray-700 rounded">
                <div className="relative">
                  <MonacoPromptEditor
                    value={value}
                    onChange={(newValue) => handleValueChange(index, newValue)}
                    placeholder={fieldSchema.description}
                    showLineNumbers={showLineNumbers}
                    wordWrap={wordWrap}
                    isOperationEditor={true}
                  />
                  {arrayValues.length > 1 && (
                    <button
                      onClick={() => handleRemoveValue(index)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-red-900 hover:text-red-400 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text" 
                  value={value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  placeholder={fieldSchema.description}
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm h-8"
                />
                {arrayValues.length > 1 && (
                  <button
                    onClick={() => handleRemoveValue(index)}
                    className="flex-shrink-0 self-center p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-red-900 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleAddValue}
        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 border border-gray-700 rounded hover:border-gray-600 hover:text-gray-300"
      >
        <Plus className="w-3 h-3" />
        <span>Add Record</span>
      </button>
    </div>
  );
};

const OperationControls: React.FC<OperationControlsProps> = ({
  operation,
  values,
  onChange,
  wordWrap,
  showLineNumbers,
  onSettingsChange
}) => {
  const valuesRef = useRef(values);
  
  useEffect(() => {
    // Deep merge the values to preserve array state
    valuesRef.current = Object.keys(values).reduce((acc, key) => {
      if (Array.isArray(values[key])) {
        // Only update array if it has changed
        if (JSON.stringify(acc[key]) !== JSON.stringify(values[key])) {
          acc[key] = values[key];
        }
      } else {
        acc[key] = values[key];
      }
      return acc;
    }, {...valuesRef.current});
  }, [values]);

  const handleFieldChange = (field: string, value: any) => {
    const newValues = {
      ...valuesRef.current,
      [field]: value
    };
    valuesRef.current = newValues;
    onChange(field, value);
  };

  const [activeOptionalFields, setActiveOptionalFields] = useState<string[]>([]);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  
  const operationType = operation.replace('@', '') as OperationType;
  const schema = operationSchema[operationType];

  // Initialize active fields based on existing values
  useEffect(() => {
    if (schema) {
      const optionalFields = Object.keys(schema.properties).filter(field => 
        !(schema as { required?: string[] }).required?.includes(field) && 
        values[field] !== undefined && 
        values[field] !== ''
      );
      setActiveOptionalFields(optionalFields);
      setShowAllFields(false);
    }
  }, [operation]);

  if (!schema) return null;

  const requiredFields: string[] = 'required' in schema ? [...(schema.required || [])] : [];
  const optionalFields = Object.keys(schema.properties).filter(field => !requiredFields.includes(field));
  const allFields = [...requiredFields, ...optionalFields];

  const renderField = (fieldName: string) => {
      const fieldSchema = (schema.properties as Record<string, any>)[fieldName];
    if (!fieldSchema) return null;

    if (isArrayField(fieldSchema)) {
      return (
        <ArrayField
          fieldName={fieldName}
          values={values[fieldName] || []}
          onChange={(newValues) => handleFieldChange(fieldName, newValues)}
          fieldSchema={fieldSchema}
          showLineNumbers={showLineNumbers}
          wordWrap={wordWrap}
          operationType={operationType}
        />
      );
    }

    if (isMultilineField(fieldName, operationType)) {
      return (
        <div className="w-full border border-gray-700 rounded">
          <MonacoPromptEditor
            value={values[fieldName] || ''}
            onChange={(value) => handleFieldChange(fieldName, value)}
            placeholder={fieldSchema.description}
            showLineNumbers={showLineNumbers}
            wordWrap={wordWrap}
            isOperationEditor={true}
          />
        </div>
      );
    }

    if ('enum' in fieldSchema && Array.isArray(fieldSchema.enum)) {
      return (
        <select
          value={values[fieldName] || ''}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          className="w-48 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm h-8"
        >
          <option value="">Select {fieldName}</option>
          {fieldSchema.enum.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (fieldSchema.type === 'number') {
      return (
        <input
          type="number"
          value={values[fieldName] || ''}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          min={fieldSchema.minimum || 0}
          max={fieldSchema.maximum || 1}
          step={0.1}
          className="w-48 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm h-8"
        />
      );
    }

    return (
      <input
        type="text"
        value={values[fieldName] || ''}
        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        placeholder={fieldSchema.description}
        className="w-48 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm h-8"
      />
    );
  };

  // Update the renderFieldRow function for field deletion button
  const renderFieldRow = (fieldName: string, isRequired: boolean) => {
    const isActive = isRequired || activeOptionalFields.includes(fieldName);
    const isVisible = isRequired || isActive || showAllFields;

    if (!isVisible) return null;

    if (!isActive && !isRequired) {
      return (
        <div key={fieldName} className="flex items-center gap-2">
          <button
            onClick={() => setActiveOptionalFields(prev => [...prev, fieldName])}
            className="flex items-center gap-1 px-3 h-8 text-sm text-gray-400 border border-gray-700 rounded hover:border-gray-600 hover:text-gray-300"
          >
            <Plus className="w-3 h-3" />
            <span>Add {fieldName}</span>
          </button>
          {(schema.properties as Record<string, { description?: string }>)[fieldName]?.description && (
            <span className="text-xs text-gray-500">{(schema.properties as Record<string, { description?: string }>)[fieldName].description}</span>
          )}
        </div>
      );
    }

    return (
      <div key={fieldName} className="flex items-start">
        <div className="flex items-center gap-1 w-[120px] text-sm text-gray-400 pt-1">
          {fieldName}
          <div className="relative">
            <Info 
              className="w-3.5 h-3.5 text-gray-500 cursor-help"
              onMouseEnter={() => setHoveredInfo(fieldName)}
              onMouseLeave={() => setHoveredInfo(null)}
            />
            {hoveredInfo === fieldName && (schema.properties as Record<string, { description?: string }>)[fieldName]?.description && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10 w-64 p-2 text-xs bg-gray-800 rounded shadow-lg border border-gray-700">
                {(schema.properties as Record<string, { description?: string }>)[fieldName].description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 flex-1">
          <div className={`flex items-center gap-2 ${isMultilineField(fieldName, operationType) ? 'flex-1' : ''}`}>
            {renderField(fieldName)}
            {!isRequired && (
              <button
                onClick={() => {
                  setActiveOptionalFields(prev => prev.filter(f => f !== fieldName));
                  handleFieldChange(fieldName, undefined);
                }}
                className="p-1 text-gray-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const inactiveOptionalFields = optionalFields.filter(field => !activeOptionalFields.includes(field));

  return (
    <div className="space-y-2 mt-2">
      {/* Render all fields in their original order */}
      {allFields.map(fieldName => renderFieldRow(fieldName, requiredFields.includes(fieldName)))}

      {/* Show More/Less Button (always at bottom) */}
      {inactiveOptionalFields.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowAllFields(!showAllFields)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-600 hover:text-gray-300 transition-colors"
          >
            {showAllFields ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show {inactiveOptionalFields.length} More Fields</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OperationControls;
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Palette, GripVertical } from "lucide-react";

interface NotebookColorControlsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorConfig {
  'notebook-node-border': string;
  'notebook-operation-border': string;
  // Container level
  'notebook-bg': string;
  
  // Default/Heading Node hierarchy - completely separate
  'notebook-node-bg': string;
  'notebook-node-header-bg': string;
  'notebook-node-content-bg': string;
  'notebook-node-monaco-bg': string;
  'notebook-node-monaco-margin-bg': string;
  'notebook-node-input-bg': string;
  'notebook-node-input-border': string;
  'notebook-node-input-text': string;
  'notebook-node-button-bg': string;
  'notebook-node-button-border': string;
  'notebook-node-button-text': string;
  'notebook-node-button-hover-bg': string;
  
  // Operation Node hierarchy - completely separate
  'notebook-operation-bg': string;
  'notebook-operation-header-bg': string;
  'notebook-operation-content-bg': string;
  'notebook-operation-monaco-bg': string;
  'notebook-operation-monaco-margin-bg': string;
  'notebook-operation-input-bg': string;
  'notebook-operation-input-border': string;
  'notebook-operation-input-text': string;
  'notebook-operation-button-bg': string;
  'notebook-operation-button-border': string;
  'notebook-operation-button-text': string;
  'notebook-operation-button-hover-bg': string;
  'notebook-operation-dropdown-bg': string;
  'notebook-operation-dropdown-border': string;
  'notebook-operation-dropdown-text': string;
  'notebook-operation-type-bg': string;
  'notebook-operation-type-border': string;
  'notebook-operation-type-text': string;
  'notebook-operation-type-selected-bg': string;
  'notebook-operation-type-selected-border': string;
  'notebook-operation-type-selected-text': string;
  
  // Shared only for container-level states
  'notebook-hover-bg': string;
  'notebook-active-bg': string;
}

interface InheritanceConfig {
  // Container level
  'notebook-bg': boolean;
  
  // Default/Heading Node hierarchy - completely separate
  'notebook-node-bg': boolean;
  'notebook-node-header-bg': boolean;
  'notebook-node-content-bg': boolean;
  'notebook-node-monaco-bg': boolean;
  'notebook-node-monaco-margin-bg': boolean;
  'notebook-node-input-bg': boolean;
  'notebook-node-input-border': boolean;
  'notebook-node-input-text': boolean;
  'notebook-node-button-bg': boolean;
  'notebook-node-button-border': boolean;
  'notebook-node-button-text': boolean;
  'notebook-node-button-hover-bg': boolean;
  
  // Operation Node hierarchy - completely separate
  'notebook-operation-bg': boolean;
  'notebook-operation-header-bg': boolean;
  'notebook-operation-content-bg': boolean;
  'notebook-operation-monaco-bg': boolean;
  'notebook-operation-monaco-margin-bg': boolean;
  'notebook-operation-input-bg': boolean;
  'notebook-operation-input-border': boolean;
  'notebook-operation-input-text': boolean;
  'notebook-operation-button-bg': boolean;
  'notebook-operation-button-border': boolean;
  'notebook-operation-button-text': boolean;
  'notebook-operation-button-hover-bg': boolean;
  'notebook-operation-dropdown-bg': boolean;
  'notebook-operation-dropdown-border': boolean;
  'notebook-operation-dropdown-text': boolean;
  'notebook-operation-type-bg': boolean;
  'notebook-operation-type-border': boolean;
  'notebook-operation-type-text': boolean;
  'notebook-operation-type-selected-bg': boolean;
  'notebook-operation-type-selected-border': boolean;
  'notebook-operation-type-selected-text': boolean;
  
  // Shared only for container-level states
  'notebook-hover-bg': boolean;
  'notebook-active-bg': boolean;
}

const defaultColors: ColorConfig = {
  'notebook-node-border': '#4b5563',
  'notebook-operation-border': '#ff0040',
  // Container level
  'notebook-bg': '#111827',
  
  // Default/Heading Node hierarchy - completely separate
  'notebook-node-bg': '#1f2937',
  'notebook-node-header-bg': '#374151',
  'notebook-node-content-bg': '#1f2937',
  'notebook-node-monaco-bg': '#1e1e1e',
  'notebook-node-monaco-margin-bg': '#2d2d2d',
  'notebook-node-input-bg': '#374151',
  'notebook-node-input-border': '#4b5563',
  'notebook-node-input-text': '#ffffff',
  'notebook-node-button-bg': '#4b5563',
  'notebook-node-button-border': '#6b7280',
  'notebook-node-button-text': '#ffffff',
  'notebook-node-button-hover-bg': '#6b7280',
  
  // Operation Node hierarchy - completely separate
  'notebook-operation-bg': '#065f46',
  'notebook-operation-header-bg': '#047857',
  'notebook-operation-content-bg': '#065f46',
  'notebook-operation-monaco-bg': '#1e1e1e',
  'notebook-operation-monaco-margin-bg': '#2d2d2d',
  'notebook-operation-input-bg': '#047857',
  'notebook-operation-input-border': '#059669',
  'notebook-operation-input-text': '#ffffff',
  'notebook-operation-button-bg': '#059669',
  'notebook-operation-button-border': '#10b981',
  'notebook-operation-button-text': '#ffffff',
  'notebook-operation-button-hover-bg': '#10b981',
  'notebook-operation-dropdown-bg': '#1e1e1e',
  'notebook-operation-dropdown-border': '#555555',
  'notebook-operation-dropdown-text': '#ffffff',
  'notebook-operation-type-bg': '#064e3b',
  'notebook-operation-type-border': '#047857',
  'notebook-operation-type-text': '#ffffff',
  'notebook-operation-type-selected-bg': '#047857',
  'notebook-operation-type-selected-border': '#059669',
  'notebook-operation-type-selected-text': '#ffffff',
  
  // Shared only for container-level states
  'notebook-hover-bg': '#374151',
  'notebook-active-bg': '#374151'
};

const testColors: ColorConfig = {
  'notebook-node-border': '#00ff00',
  'notebook-operation-border': '#0000ff',
  // Container level
  'notebook-bg': '#7bbd26',
  
  // Default/Heading Node hierarchy - completely separate
  'notebook-node-bg': '#ff0000',
  'notebook-node-header-bg': '#00ff00',
  'notebook-node-content-bg': '#0000ff',
  'notebook-node-monaco-bg': '#ffffff',
  'notebook-node-monaco-margin-bg': '#808080',
  'notebook-node-input-bg': '#f0f0f0',
  'notebook-node-input-border': '#cccccc',
  'notebook-node-input-text': '#000000',
  'notebook-node-button-bg': '#d0d0d0',
  'notebook-node-button-border': '#aaaaaa',
  'notebook-node-button-text': '#000000',
  'notebook-node-button-hover-bg': '#c0c0c0',
  
  // Operation Node hierarchy - completely separate
  'notebook-operation-bg': '#ffff00',
  'notebook-operation-header-bg': '#ff00ff',
  'notebook-operation-content-bg': '#00ffff',
  'notebook-operation-monaco-bg': '#ff8000',
  'notebook-operation-monaco-margin-bg': '#ff4000',
  'notebook-operation-input-bg': '#8000ff',
  'notebook-operation-input-border': '#4000ff',
  'notebook-operation-input-text': '#ffffff',
  'notebook-operation-button-bg': '#ff0080',
  'notebook-operation-button-border': '#ff0040',
  'notebook-operation-button-text': '#ffffff',
  'notebook-operation-button-hover-bg': '#ff00c0',
  'notebook-operation-dropdown-bg': '#80ff00',
  'notebook-operation-dropdown-border': '#40ff00',
  'notebook-operation-dropdown-text': '#000000',
  'notebook-operation-type-bg': '#ff8080',
  'notebook-operation-type-border': '#ff4040',
  'notebook-operation-type-text': '#000000',
  'notebook-operation-type-selected-bg': '#ff0080',
  'notebook-operation-type-selected-border': '#ff0040',
  'notebook-operation-type-selected-text': '#ffffff',
  
  // Shared only for container-level states
  'notebook-hover-bg': '#374151',
  'notebook-active-bg': '#374151'
};

const defaultInheritance: InheritanceConfig = {
  // Container level
  'notebook-bg': false,
  
  // Default/Heading Node hierarchy - completely separate
  'notebook-node-bg': false,
  'notebook-node-header-bg': true,
  'notebook-node-content-bg': true,
  'notebook-node-monaco-bg': false,
  'notebook-node-monaco-margin-bg': false,
  'notebook-node-input-bg': false,
  'notebook-node-input-border': false,
  'notebook-node-input-text': false,
  'notebook-node-button-bg': false,
  'notebook-node-button-border': false,
  'notebook-node-button-text': false,
  'notebook-node-button-hover-bg': false,
  
  // Operation Node hierarchy - completely separate
  'notebook-operation-bg': false,
  'notebook-operation-header-bg': true,
  'notebook-operation-content-bg': true,
  'notebook-operation-monaco-bg': false,
  'notebook-operation-monaco-margin-bg': false,
  'notebook-operation-input-bg': false,
  'notebook-operation-input-border': false,
  'notebook-operation-input-text': false,
  'notebook-operation-button-bg': false,
  'notebook-operation-button-border': false,
  'notebook-operation-button-text': false,
  'notebook-operation-button-hover-bg': false,
  'notebook-operation-dropdown-bg': false,
  'notebook-operation-dropdown-border': false,
  'notebook-operation-dropdown-text': false,
  'notebook-operation-type-bg': false,
  'notebook-operation-type-border': false,
  'notebook-operation-type-text': false,
  'notebook-operation-type-selected-bg': false,
  'notebook-operation-type-selected-border': false,
  'notebook-operation-type-selected-text': false,
  
  // Shared only for container-level states
  'notebook-hover-bg': false,
  'notebook-active-bg': false
};

const getParentColor = (key: keyof ColorConfig, colors: ColorConfig): string => {
  const parentMap: { [key: string]: keyof ColorConfig } = {
    'notebook-node-header-bg': 'notebook-node-bg',
    'notebook-node-content-bg': 'notebook-node-bg',
    'notebook-operation-header-bg': 'notebook-operation-bg',
    'notebook-operation-content-bg': 'notebook-operation-bg'
  };
  
  return parentMap[key] ? colors[parentMap[key]] : colors[key];
};

const updateInheritedChildren = (
  key: keyof ColorConfig,
  value: string,
  colors: ColorConfig,
  inheritance: InheritanceConfig
): ColorConfig => {
  const newColors = { ...colors };
  newColors[key] = value;
  
  const childMap: { [key: string]: (keyof ColorConfig)[] } = {
    'notebook-node-bg': ['notebook-node-header-bg', 'notebook-node-content-bg'],
    'notebook-operation-bg': ['notebook-operation-header-bg', 'notebook-operation-content-bg']
  };
  
  const children = childMap[key] || [];
  children.forEach(childKey => {
    if (inheritance[childKey]) {
      newColors[childKey] = value;
    }
  });
  
  return newColors;
};

const colorLabels: { [key in keyof ColorConfig]: string } = {
  'notebook-bg': 'Container Background',
  'notebook-node-bg': 'Default Node Background',
  'notebook-node-header-bg': 'Default Node Header',
  'notebook-node-content-bg': 'Default Node Content',
  'notebook-node-monaco-bg': 'Default Node Monaco Background',
  'notebook-node-monaco-margin-bg': 'Default Node Monaco Line Numbers',
  'notebook-node-input-bg': 'Default Node Input Background',
  'notebook-node-input-border': 'Default Node Input Border',
  'notebook-node-input-text': 'Default Node Input Text',
  'notebook-node-button-bg': 'Default Node Button Background',
  'notebook-node-button-border': 'Default Node Button Border',
  'notebook-node-button-text': 'Default Node Button Text',
  'notebook-node-button-hover-bg': 'Default Node Button Hover',
  'notebook-operation-bg': 'Operation Node Background',
  'notebook-operation-header-bg': 'Operation Node Header',
  'notebook-operation-content-bg': 'Operation Node Content',
  'notebook-operation-monaco-bg': 'Operation Node Monaco Background',
  'notebook-operation-monaco-margin-bg': 'Operation Node Monaco Line Numbers',
  'notebook-operation-input-bg': 'Operation Node Input Background',
  'notebook-operation-input-border': 'Operation Node Input Border',
  'notebook-operation-input-text': 'Operation Node Input Text',
  'notebook-operation-button-bg': 'Operation Node Button Background',
  'notebook-operation-button-border': 'Operation Node Button Border',
  'notebook-operation-button-text': 'Operation Node Button Text',
  'notebook-operation-button-hover-bg': 'Operation Node Button Hover',
  'notebook-operation-dropdown-bg': 'Operation Dropdown Background',
  'notebook-operation-dropdown-border': 'Operation Dropdown Border',
  'notebook-operation-dropdown-text': 'Operation Dropdown Text',
  'notebook-operation-type-bg': 'Operation Type Field Background',
  'notebook-operation-type-border': 'Operation Type Field Border',
  'notebook-operation-type-text': 'Operation Type Field Text',
  'notebook-operation-type-selected-bg': 'Operation Type Selected Background',
  'notebook-operation-type-selected-border': 'Operation Type Selected Border',
  'notebook-operation-type-selected-text': 'Operation Type Selected Text',
  'notebook-hover-bg': 'Hover Background',
  'notebook-active-bg': 'Active Background'
};

const applyColors = (colors: ColorConfig) => {
  // CRITICAL FIX: Apply notebook variables only to .notebook-theme containers
  // NOT to document.documentElement (global scope)
  const notebookContainers = document.querySelectorAll('.notebook-theme');
  
  Object.entries(colors).forEach(([key, value]) => {
    if (key.startsWith('notebook-')) {
      // Apply to each notebook-themed container, not globally
      notebookContainers.forEach(container => {
        (container as HTMLElement).style.setProperty(`--${key}`, value);
      });
    }
  });
  
  // Also remove any global variables that might have been set previously
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    if (key.startsWith('notebook-')) {
      root.style.removeProperty(`--${key}`);
    }
  });
};

const ColorControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  inherit: boolean;
  onInheritChange: (inherit: boolean) => void;
  canInherit: boolean;
  level: number;
}> = ({ label, value, onChange, inherit, onInheritChange, canInherit, level }) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const handleColorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsColorPickerOpen(true);
    setTimeout(() => {
      colorPickerRef.current?.click();
    }, 0);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onChange(e.target.value);
    setIsColorPickerOpen(false);
  };

  const handleColorPickerBlur = () => {
    setIsColorPickerOpen(false);
  };

  const indentClass = level === 0 ? '' : level === 1 ? 'ml-4' : 'ml-8';

  return (
    <div className={`flex items-center space-x-2 ${indentClass}`}>
      <div className="flex items-center space-x-2 flex-1">
        <Label className="text-sm min-w-0 flex-1">{label}</Label>
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer flex items-center justify-center relative"
            style={{ backgroundColor: value }}
            onClick={handleColorClick}
          >
            <input
              ref={colorPickerRef}
              type="color"
              value={value}
              onChange={handleColorChange}
              onBlur={handleColorPickerBlur}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <Palette className="w-4 h-4 text-white mix-blend-difference" />
          </div>
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 text-xs"
            placeholder="#000000"
          />
        </div>
      </div>
      {canInherit && (
        <div className="flex items-center space-x-1">
          <Checkbox
            id={`inherit-${label}`}
            checked={inherit}
            onCheckedChange={(checked) => onInheritChange(checked as boolean)}
          />
          <Label htmlFor={`inherit-${label}`} className="text-xs">Inherit</Label>
        </div>
      )}
    </div>
  );
};

export const NotebookColorControls: React.FC<NotebookColorControlsProps> = ({ isOpen, onClose }) => {
  const [colors, setColors] = useState<ColorConfig>(defaultColors);
  const [inheritance, setInheritance] = useState<InheritanceConfig>(defaultInheritance);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const cardRef = useRef<HTMLDivElement>(null);
  // Export color config as JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(colors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook-colors.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import color config from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setColors((prev) => ({ ...prev, ...imported }));
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (isOpen) {
      applyColors(colors);
    }
  }, [colors, isOpen]);

  const handleColorChange = (key: keyof ColorConfig, value: string) => {
    const newColors = updateInheritedChildren(key, value, colors, inheritance);
    setColors(newColors);
  };

  const handleInheritanceChange = (key: keyof ColorConfig, inherit: boolean) => {
    setInheritance(prev => ({ ...prev, [key]: inherit }));
    if (inherit) {
      const parentColor = getParentColor(key, colors);
      handleColorChange(key, parentColor);
    }
  };

  const handleReset = () => {
    setColors(defaultColors);
    setInheritance(defaultInheritance);
  };

  const handleTestColors = () => {
    setColors(testColors);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (cardRef.current) {
      setIsDragging(true);
      const rect = cardRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fractalic-color-modal-bg"
      onClick={onClose}
    >
      <Card
        ref={cardRef}
        className="w-96 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl fractalic-color-modal"
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          userSelect: isDragging ? 'none' : 'auto',
          zIndex: 9999
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          className="cursor-move bg-gray-100 dark:bg-gray-700 flex flex-row items-center justify-between p-4"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2">
            <GripVertical className="w-4 h-4 text-gray-500" />
            <div>
              <CardTitle className="text-lg">Notebook Color Controls</CardTitle>
              <CardDescription>Customize notebook appearance</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex space-x-2">
            <Button onClick={handleReset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleTestColors} variant="outline" size="sm">
              Test Colors
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              Export JSON
            </Button>
            <label className="inline-block">
              <Button asChild variant="outline" size="sm">
                <span>Import JSON</span>
              </Button>
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </label>
          </div>

          <div className="space-y-4">
            {/* Container */}
            <div>
              <h3 className="font-medium mb-3">🏠 Container</h3>
              <div className="space-y-2">
                <ColorControl
                  label={colorLabels['notebook-bg']}
                  value={colors['notebook-bg']}
                  onChange={(value) => handleColorChange('notebook-bg', value)}
                  inherit={inheritance['notebook-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-bg', inherit)}
                  canInherit={false}
                  level={0}
                />
              </div>
            </div>

            <Separator />

            {/* Default/Heading Nodes */}
            <div>
              <h3 className="font-medium mb-3">📄 Default/Heading Nodes</h3>
              <div className="space-y-2">
                <ColorControl
                  label={colorLabels['notebook-node-bg']}
                  value={colors['notebook-node-bg']}
                  onChange={(value) => handleColorChange('notebook-node-bg', value)}
                  inherit={inheritance['notebook-node-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-bg', inherit)}
                  canInherit={false}
                  level={0}
                />
                <ColorControl
                  label={colorLabels['notebook-node-border']}
                  value={colors['notebook-node-border']}
                  onChange={(value) => handleColorChange('notebook-node-border', value)}
                  inherit={false}
                  onInheritChange={() => {}}
                  canInherit={false}
                  level={0}
                />
                <ColorControl
                  label={colorLabels['notebook-node-header-bg']}
                  value={colors['notebook-node-header-bg']}
                  onChange={(value) => handleColorChange('notebook-node-header-bg', value)}
                  inherit={inheritance['notebook-node-header-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-header-bg', inherit)}
                  canInherit={true}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-content-bg']}
                  value={colors['notebook-node-content-bg']}
                  onChange={(value) => handleColorChange('notebook-node-content-bg', value)}
                  inherit={inheritance['notebook-node-content-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-content-bg', inherit)}
                  canInherit={true}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-monaco-bg']}
                  value={colors['notebook-node-monaco-bg']}
                  onChange={(value) => handleColorChange('notebook-node-monaco-bg', value)}
                  inherit={inheritance['notebook-node-monaco-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-monaco-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-monaco-margin-bg']}
                  value={colors['notebook-node-monaco-margin-bg']}
                  onChange={(value) => handleColorChange('notebook-node-monaco-margin-bg', value)}
                  inherit={inheritance['notebook-node-monaco-margin-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-monaco-margin-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-input-bg']}
                  value={colors['notebook-node-input-bg']}
                  onChange={(value) => handleColorChange('notebook-node-input-bg', value)}
                  inherit={inheritance['notebook-node-input-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-input-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-input-border']}
                  value={colors['notebook-node-input-border']}
                  onChange={(value) => handleColorChange('notebook-node-input-border', value)}
                  inherit={inheritance['notebook-node-input-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-input-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-input-text']}
                  value={colors['notebook-node-input-text']}
                  onChange={(value) => handleColorChange('notebook-node-input-text', value)}
                  inherit={inheritance['notebook-node-input-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-input-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-button-bg']}
                  value={colors['notebook-node-button-bg']}
                  onChange={(value) => handleColorChange('notebook-node-button-bg', value)}
                  inherit={inheritance['notebook-node-button-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-button-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-button-border']}
                  value={colors['notebook-node-button-border']}
                  onChange={(value) => handleColorChange('notebook-node-button-border', value)}
                  inherit={inheritance['notebook-node-button-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-button-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-button-text']}
                  value={colors['notebook-node-button-text']}
                  onChange={(value) => handleColorChange('notebook-node-button-text', value)}
                  inherit={inheritance['notebook-node-button-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-button-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-node-button-hover-bg']}
                  value={colors['notebook-node-button-hover-bg']}
                  onChange={(value) => handleColorChange('notebook-node-button-hover-bg', value)}
                  inherit={inheritance['notebook-node-button-hover-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-node-button-hover-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
              </div>
            </div>

            <Separator />

            {/* Operation Nodes */}
            <div>
              <h3 className="font-medium mb-3">⚙️ Operation Nodes</h3>
              <div className="space-y-2">
                <ColorControl
                  label={colorLabels['notebook-operation-bg']}
                  value={colors['notebook-operation-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-bg', value)}
                  inherit={inheritance['notebook-operation-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-bg', inherit)}
                  canInherit={false}
                  level={0}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-border']}
                  value={colors['notebook-operation-border']}
                  onChange={(value) => handleColorChange('notebook-operation-border', value)}
                  inherit={false}
                  onInheritChange={() => {}}
                  canInherit={false}
                  level={0}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-header-bg']}
                  value={colors['notebook-operation-header-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-header-bg', value)}
                  inherit={inheritance['notebook-operation-header-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-header-bg', inherit)}
                  canInherit={true}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-content-bg']}
                  value={colors['notebook-operation-content-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-content-bg', value)}
                  inherit={inheritance['notebook-operation-content-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-content-bg', inherit)}
                  canInherit={true}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-monaco-bg']}
                  value={colors['notebook-operation-monaco-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-monaco-bg', value)}
                  inherit={inheritance['notebook-operation-monaco-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-monaco-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-monaco-margin-bg']}
                  value={colors['notebook-operation-monaco-margin-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-monaco-margin-bg', value)}
                  inherit={inheritance['notebook-operation-monaco-margin-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-monaco-margin-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-input-bg']}
                  value={colors['notebook-operation-input-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-input-bg', value)}
                  inherit={inheritance['notebook-operation-input-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-input-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-input-border']}
                  value={colors['notebook-operation-input-border']}
                  onChange={(value) => handleColorChange('notebook-operation-input-border', value)}
                  inherit={inheritance['notebook-operation-input-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-input-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-input-text']}
                  value={colors['notebook-operation-input-text']}
                  onChange={(value) => handleColorChange('notebook-operation-input-text', value)}
                  inherit={inheritance['notebook-operation-input-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-input-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-button-bg']}
                  value={colors['notebook-operation-button-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-button-bg', value)}
                  inherit={inheritance['notebook-operation-button-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-button-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-button-border']}
                  value={colors['notebook-operation-button-border']}
                  onChange={(value) => handleColorChange('notebook-operation-button-border', value)}
                  inherit={inheritance['notebook-operation-button-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-button-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-button-text']}
                  value={colors['notebook-operation-button-text']}
                  onChange={(value) => handleColorChange('notebook-operation-button-text', value)}
                  inherit={inheritance['notebook-operation-button-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-button-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-button-hover-bg']}
                  value={colors['notebook-operation-button-hover-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-button-hover-bg', value)}
                  inherit={inheritance['notebook-operation-button-hover-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-button-hover-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-dropdown-bg']}
                  value={colors['notebook-operation-dropdown-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-dropdown-bg', value)}
                  inherit={inheritance['notebook-operation-dropdown-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-dropdown-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-dropdown-border']}
                  value={colors['notebook-operation-dropdown-border']}
                  onChange={(value) => handleColorChange('notebook-operation-dropdown-border', value)}
                  inherit={inheritance['notebook-operation-dropdown-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-dropdown-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-dropdown-text']}
                  value={colors['notebook-operation-dropdown-text']}
                  onChange={(value) => handleColorChange('notebook-operation-dropdown-text', value)}
                  inherit={inheritance['notebook-operation-dropdown-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-dropdown-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-bg']}
                  value={colors['notebook-operation-type-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-type-bg', value)}
                  inherit={inheritance['notebook-operation-type-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-border']}
                  value={colors['notebook-operation-type-border']}
                  onChange={(value) => handleColorChange('notebook-operation-type-border', value)}
                  inherit={inheritance['notebook-operation-type-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-text']}
                  value={colors['notebook-operation-type-text']}
                  onChange={(value) => handleColorChange('notebook-operation-type-text', value)}
                  inherit={inheritance['notebook-operation-type-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-text', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-selected-bg']}
                  value={colors['notebook-operation-type-selected-bg']}
                  onChange={(value) => handleColorChange('notebook-operation-type-selected-bg', value)}
                  inherit={inheritance['notebook-operation-type-selected-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-selected-bg', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-selected-border']}
                  value={colors['notebook-operation-type-selected-border']}
                  onChange={(value) => handleColorChange('notebook-operation-type-selected-border', value)}
                  inherit={inheritance['notebook-operation-type-selected-border']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-selected-border', inherit)}
                  canInherit={false}
                  level={1}
                />
                <ColorControl
                  label={colorLabels['notebook-operation-type-selected-text']}
                  value={colors['notebook-operation-type-selected-text']}
                  onChange={(value) => handleColorChange('notebook-operation-type-selected-text', value)}
                  inherit={inheritance['notebook-operation-type-selected-text']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-operation-type-selected-text', inherit)}
                  canInherit={false}
                  level={1}
                />
              </div>
            </div>

            <Separator />

            {/* Shared States */}
            <div>
              <h3 className="font-medium mb-3">🔄 Shared States</h3>
              <div className="space-y-2">
                <ColorControl
                  label={colorLabels['notebook-hover-bg']}
                  value={colors['notebook-hover-bg']}
                  onChange={(value) => handleColorChange('notebook-hover-bg', value)}
                  inherit={inheritance['notebook-hover-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-hover-bg', inherit)}
                  canInherit={false}
                  level={0}
                />
                <ColorControl
                  label={colorLabels['notebook-active-bg']}
                  value={colors['notebook-active-bg']}
                  onChange={(value) => handleColorChange('notebook-active-bg', value)}
                  inherit={inheritance['notebook-active-bg']}
                  onInheritChange={(inherit) => handleInheritanceChange('notebook-active-bg', inherit)}
                  canInherit={false}
                  level={0}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { type OperationType } from '../../config/operationSchema';

export interface YamlField {
  name: string;
  type: string;
  required?: boolean;
  default?: any;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  description?: string;
}

export interface YamlOperation {
  type: OperationType;
  fields: Record<string, YamlField>;
}

export interface YamlParseResult {
  success: boolean;
  operation?: string;
  values?: Record<string, any>;
  error?: Error;
}

export interface YamlFormatOptions {
  indent?: number;
  lineWidth?: number;
  quotingStyle?: 'single' | 'double';
  blockStyle?: 'literal' | 'folded';
}
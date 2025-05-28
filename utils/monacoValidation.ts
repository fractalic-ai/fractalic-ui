/**
 * Monaco editor validation provider for Fractalic operations
 */
import { validateOperation, formatValidationErrors, parseAndValidateYAML, type OperationType } from './validation';

// Error severity mapping
const ErrorSeverity = {
  Error: 8,
  Warning: 4,
  Info: 2,
  Hint: 1
} as const;

// Register validation provider for Fractalic
export function registerFractalicValidationProvider(monaco: any) {
  // Create a marker owner for our validation
  const markerId = 'fractalic-validation';
  
  monaco.languages.registerCodeActionProvider('fractalic', {
    provideCodeActions: (model: any, range: any, context: any) => {
      const actions: any[] = [];
      
      // Get markers in the range
      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
        .filter((marker: any) => marker.owner === markerId);
      
      for (const marker of markers) {
        if (marker.message.includes('Either \'prompt\' or \'block\' must be provided')) {
          actions.push({
            title: 'Add prompt field',
            kind: 'quickfix',
            edit: {
              edits: [{
                resource: model.uri,
                edit: {
                  range: new monaco.Range(marker.startLineNumber, 1, marker.startLineNumber, 1),
                  text: 'prompt: \n'
                }
              }]
            }
          });
          
          actions.push({
            title: 'Add block field',
            kind: 'quickfix',
            edit: {
              edits: [{
                resource: model.uri,
                edit: {
                  range: new monaco.Range(marker.startLineNumber, 1, marker.startLineNumber, 1),
                  text: 'block: \n'
                }
              }]
            }
          });
        }
      }
      
      return { actions, dispose: () => {} };
    }
  });

  // Validation function
  function validateFractalicDocument(model: any) {
    const content = model.getValue();
    const lines = content.split('\n');
    const markers: any[] = [];
    
    let currentOperation: { type: OperationType; startLine: number; content: string[] } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Check for operation start
      const operationMatch = line.match(/^@(llm|shell|import|run|return|goto)\s*$/);
      if (operationMatch) {
        // Validate previous operation if exists
        if (currentOperation) {
          validateOperationBlock(currentOperation, markers, monaco);
        }
        
        // Start new operation
        currentOperation = {
          type: operationMatch[1] as OperationType,
          startLine: lineNumber,
          content: []
        };
        continue;
      }
      
      // Check for operation end (empty line, new header, or new operation)
      if (currentOperation) {
        const trimmedLine = line.trim();
        const isEmptyLine = trimmedLine === '';
        const isHeader = trimmedLine.startsWith('#');
        const isNewOperation = trimmedLine.match(/^@(llm|shell|import|run|return|goto)/);
        
        if (isEmptyLine || isHeader || isNewOperation) {
          // Validate the current operation
          validateOperationBlock(currentOperation, markers, monaco);
          currentOperation = null;
          
          // If it's a new operation, handle it
          if (isNewOperation) {
            const newOpMatch = trimmedLine.match(/^@(llm|shell|import|run|return|goto)\s*$/);
            if (newOpMatch) {
              currentOperation = {
                type: newOpMatch[1] as OperationType,
                startLine: lineNumber,
                content: []
              };
            }
          }
        } else {
          // Add line to current operation content
          currentOperation.content.push(line);
        }
      }
    }
    
    // Validate last operation if exists
    if (currentOperation) {
      validateOperationBlock(currentOperation, markers, monaco);
    }
    
    // Set markers
    monaco.editor.setModelMarkers(model, markerId, markers);
  }
  
  function validateOperationBlock(
    operation: { type: OperationType; startLine: number; content: string[] },
    markers: any[],
    monaco: any
  ) {
    const yamlContent = operation.content.join('\n');
    const result = parseAndValidateYAML(yamlContent, operation.type);
    
    if (!result.success && 'error' in result) {
      if ('errors' in result.error) {
        // Zod validation errors
        const formattedErrors = formatValidationErrors(result.error);
        
        for (const error of formattedErrors) {
          const lineNumber = findFieldLineNumber(operation.content, error.field, operation.startLine);
          
          markers.push({
            severity: ErrorSeverity.Error,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1000, // End of line
            message: `${error.field}: ${error.message}`,
            source: 'fractalic-validator',
            owner: 'fractalic-validation'
          });
        }
      } else {
        // YAML parsing error
        markers.push({
          severity: ErrorSeverity.Error,
          startLineNumber: operation.startLine + 1,
          startColumn: 1,
          endLineNumber: operation.startLine + 1,
          endColumn: 1000,
          message: result.error.message,
          source: 'fractalic-validator',
          owner: 'fractalic-validation'
        });
      }
    }
  }
  
  function findFieldLineNumber(content: string[], fieldPath: string, startLine: number): number {
    const fieldName = fieldPath.split('.')[0]; // Get the top-level field name
    
    for (let i = 0; i < content.length; i++) {
      const line = content[i].trim();
      if (line.startsWith(`${fieldName}:`)) {
        return startLine + i + 1;
      }
    }
    
    return startLine + 1; // Default to operation start line
  }
  
  // Auto-validate on content change
  monaco.editor.onDidCreateModel((model: any) => {
    if (model.getLanguageId() === 'fractalic') {
      validateFractalicDocument(model);
      
      model.onDidChangeContent(() => {
        // Debounce validation to avoid excessive calls
        setTimeout(() => validateFractalicDocument(model), 500);
      });
    }
  });
  
  // Validate existing models
  monaco.editor.getModels().forEach((model: any) => {
    if (model.getLanguageId() === 'fractalic') {
      validateFractalicDocument(model);
    }
  });
}

// Initialize validation with Monaco setup
export function setupFractalicValidation(monaco: any) {
  try {
    registerFractalicValidationProvider(monaco);
    console.log("Fractalic validation provider registered successfully");
  } catch (error) {
    console.error("Error setting up Fractalic validation:", error);
  }
}

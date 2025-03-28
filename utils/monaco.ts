/**
 * Monaco editor configuration for Fractalic
 */
import * as monaco from 'monaco-editor';

// Function to register Fractalic language with Monaco editor
export function registerFractalicLanguage(monaco: any) {
  // Register the Fractalic language
  monaco.languages.register({ id: "fractalic" });

  // Define custom tokens for Fractalic syntax
  monaco.languages.setMonarchTokensProvider("fractalic", {
    tokenizer: {
      root: [
        // SIMPLIFIED Markdown Headers (for debugging the error)
        [/^(#{1,6})(\s+)(.*)$/, ["header", "white", "header-text"]],

        // Fractalic Operations
        [/^@(llm|shell|import|run|return|goto)\b/, "operation-keyword"],

        // Field names - Capture name and colon together
        [/^(\s*-?\s*)(prompt|block|file|media|provider|model|temperature|save-to-file|use-header|mode|to)(:)/,
          ["white", "field-name", "punctuation.colon"]],

        // String values (double and single quoted)
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string_double"],
        [/'/, "string", "@string_single"],

        // Block references
        [/\b[\w-]+\/[\w-]+(\*)?/, "block-reference"],

        // Comments
        [/#.*$/, "comment"],

        // REVISED: Multiline strings indicator - Capture trailing space
        [/(\s+)(>|>-|\|)(\s*)$/, ["white", "multiline-indicator", "white"]],

        // Code blocks
        [/^```\w*$/, "code-block"],
        [/^```$/, "code-block"],

        // REVISED: YAML arrays marker - Capture trailing space
        [/^(\s*)(-)(\s+)/, ["white", "array-marker", "white"]],

        // REVISED: Markdown link syntax - Capture brackets/parens
        [/(\[)([^\]]+)(\]\()([^)]+)(\))/, ["punctuation.bracket", "link", "punctuation.link", "url", "punctuation.bracket"]],

        // REVISED: Simple literal values (numbers, true/false) after a colon - Make inner group non-capturing
        [/(:\s+)(\d+(?:\.\d+)?|true|false)\b/, ["punctuation.colon", "literal-value"]],

        // Default text (catch-all)
        [/[a-zA-Z_]\w*/, "identifier"],
      ],

      string_double: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],

      string_single: [
        [/[^\\']+/, "string"],
        [/\\./, "string.escape"],
        [/'/, "string", "@pop"],
      ],
    },
  });

  // Define a dark theme for Fractalic - Relying ONLY on this now
  monaco.editor.defineTheme("fractalicDarkTheme", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // Explicit rules for Fractalic tokens
      { token: "operation-keyword", foreground: "#3EB467", fontStyle: "bold" },
      { token: "field-name", foreground: "#999999" },
      { token: "punctuation.colon", foreground: "#999999" },
      { token: "string", foreground: "#CE9178" },
      { token: "string.escape", foreground: "#D7BA7D" },
      { token: "literal-value", foreground: "#B5CEA8" },
      { token: "block-reference", foreground: "#DCDCAA" },
      { token: "comment", foreground: "#6A9955", fontStyle: "italic" },
      { token: "header", foreground: "#569CD6", fontStyle: "bold" },
      { token: "header-text", foreground: "#569CD6", fontStyle: "bold" },
      { token: "header-id", foreground: "#808080" },
      { token: "multiline-indicator", foreground: "#569CD6" },
      { token: "code-block", foreground: "#CE9178" },
      { token: "array-marker", foreground: "#569CD6" },
      // Added tokens for link punctuation
      { token: "punctuation.bracket", foreground: "#D4D4D4" },
      { token: "punctuation.link", foreground: "#D4D4D4" },
      { token: "link", foreground: "#569CD6" },
      { token: "url", foreground: "#608B4E" },
      { token: "identifier", foreground: "#D4D4D4" },
      { token: "white", foreground: "#D4D4D4" },
    ],
    colors: {
      "editor.foreground": "#D4D4D4",
      "editor.background": "#1E1E1E",
      "editorCursor.foreground": "#AEAFAD",
      "editor.lineHighlightBackground": "#2A2D2E",
      "editorLineNumber.foreground": "#858585",
      "editorLineNumber.activeForeground": "#C6C6C6",
      "editor.selectionBackground": "#264F78",
      "editorGutter.background": "#1E1E1E",
    },
  });
}

// Register custom folding provider for Fractalic
export function registerFractalicFolding(monaco: any) {
  monaco.languages.registerFoldingRangeProvider("fractalic", {
    provideFoldingRanges: function(model: any, context: any, token: any) {
      let ranges: any[] = [];
      const lineCount = model.getLineCount();
      let headerStarts: { line: number; level: number }[] = [];
      let operationStarts: number[] = [];

      // First pass: Identify all header and operation start lines
      for (let i = 1; i <= lineCount; i++) {
        const line = model.getLineContent(i);
        const headerMatch = line.match(/^(#{1,6})\s+/);
        if (headerMatch) {
          headerStarts.push({ line: i, level: headerMatch[1].length });
        } else if (line.match(/^@(llm|shell|import|run|return|goto)\b/)) {
          operationStarts.push(i);
        }
      }

      // Second pass: Create header folding ranges
      for (let i = 0; i < headerStarts.length; i++) {
        const currentHeader = headerStarts[i];
        let nextSectionStartLine = lineCount + 1;

        // Find the next header start line
        if (i + 1 < headerStarts.length) {
          nextSectionStartLine = Math.min(nextSectionStartLine, headerStarts[i + 1].line);
        }

        // Find the first operation start line *after* the current header
        const nextOperationLine = operationStarts.find(opLine => opLine > currentHeader.line);
        if (nextOperationLine) {
          nextSectionStartLine = Math.min(nextSectionStartLine, nextOperationLine);
        }

        const endLine = nextSectionStartLine - 1;
        // Add range only if it's valid (at least one line below the header)
        if (endLine > currentHeader.line) {
          ranges.push({
            start: currentHeader.line,
            end: endLine,
            kind: monaco.languages.FoldingRangeKind.Region
          });
        }
      }

      // Third pass: Create operation folding ranges
      for (let i = 0; i < operationStarts.length; i++) {
        const currentOpStart = operationStarts[i];
        let endLine = lineCount;

        // Find the end of the operation block by looking ahead
        for (let j = currentOpStart + 1; j <= lineCount; j++) {
          const nextLine = model.getLineContent(j);
          const isNextOp = !!nextLine.match(/^@(llm|shell|import|run|return|goto)\b/);
          const isNextHeader = !!nextLine.match(/^#{1,6}\s/);
          const isEmptyLine = nextLine.trim() === '';
          let isFollowedByNonYaml = false;
          if (isEmptyLine && j + 1 <= lineCount) {
            // Check if the line after the empty line looks like YAML (indented key: value)
            isFollowedByNonYaml = !model.getLineContent(j + 1).match(/^\s+\w+:/);
          }

          // End condition found if next line starts a new operation, a header,
          // or is an empty line followed by something that doesn't look like YAML content.
          if (isNextOp || isNextHeader || (isEmptyLine && isFollowedByNonYaml)) {
            endLine = j - 1; // End the fold on the line before the condition
            break;
          }
        }

        // Add range only if it's valid (ends on or after start line)
        if (endLine >= currentOpStart) {
           ranges.push({
             start: currentOpStart,
             end: endLine,
             kind: monaco.languages.FoldingRangeKind.Region // Use Region for operations
           });
        }
      }

      // Sort ranges by start line (optional, but good practice for Monaco)
      ranges.sort((a, b) => a.start - b.start);

      return ranges;
    }
  });
}

// Register hover provider for Fractalic operations
export function registerFractalicHoverProvider(monaco: any) {
  monaco.languages.registerHoverProvider("fractalic", {
    provideHover: function (model: any, position: any) {
      try {
        // Get the content of the current line
        const currentLine = model.getLineContent(position.lineNumber);

        // Check if this line starts with an operation keyword
        const operationMatch = currentLine.match(/^@(\w+)/);
        if (!operationMatch) return null; // Exit if line doesn't start with @op

        const operation = operationMatch[1];
        const operationKeyword = `@${operation}`;

        // --- Revised Check ---
        // Check if the cursor position is within the bounds of the operation keyword
        if (position.column < 1 || position.column > operationKeyword.length + 1) {
             return null; // Exit if cursor is not over the operation keyword
        }
        // --- End Revised Check ---

        // Operation-specific field information
        const operationInfo: any = {
          llm: {
            title: "LLM Operation",
            description: "Sends prompts to language models and captures responses.",
            fields: [
              { name: "prompt", required: "Yes*", description: "Direct text string for input prompt" },
              { name: "block", required: "Yes*", description: "Reference(s) to blocks for prompt content" },
              { name: "media", required: "No", description: "File paths for additional media context" },
              { name: "save-to-file", required: "No", description: "File path to save raw response" },
              { name: "use-header", required: "No", description: "Header for LLM response" },
              { name: "mode", required: "No", description: "Merge mode (append, prepend, replace)" },
              { name: "to", required: "No", description: "Target block reference" },
              { name: "provider", required: "No", description: "Override for language model provider" },
              { name: "model", required: "No", description: "Override for specific model" },
              { name: "temperature", required: "No", description: "Controls randomness (0.0-1.0)" }
            ],
            note: "* Either prompt or block must be provided"
          },
          shell: {
            title: "Shell Operation",
            description: "Executes shell commands and captures output.",
            fields: [
              { name: "prompt", required: "Yes", description: "Shell command to execute" },
              { name: "use-header", required: "No", description: "Header for command output" },
              { name: "mode", required: "No", description: "Merge mode (append, prepend, replace)" },
              { name: "to", required: "No", description: "Target block reference" }
            ]
          },
          import: {
            title: "Import Operation",
            description: "Imports content from another file or specific section.",
            fields: [
              { name: "file", required: "Yes", description: "File path to import from" },
              { name: "block", required: "No", description: "Reference to specific section within source file" },
              { name: "mode", required: "No", description: "How content is merged (append, prepend, replace)" },
              { name: "to", required: "No", description: "Target block reference in current document" }
            ]
          },
          run: {
            title: "Run Operation",
            description: "Executes another markdown file as a workflow.",
            fields: [
              { name: "file", required: "Yes", description: "Path to markdown file to execute" },
              { name: "prompt", required: "No", description: "Literal text input for workflow" },
              { name: "block", required: "No", description: "Reference(s) to blocks for input" },
              { name: "use-header", required: "No", description: "Header for workflow output" },
              { name: "mode", required: "No", description: "Merge mode (append, prepend, replace)" },
              { name: "to", required: "No", description: "Target block reference" }
            ]
          },
          return: {
            title: "Return Operation",
            description: "Produces final output and ends current workflow.",
            fields: [
              { name: "prompt", required: "Yes*", description: "Literal text to return" },
              { name: "block", required: "Yes*", description: "Reference(s) to blocks to return" },
              { name: "use-header", required: "No", description: "Header for returned content" }
            ],
            note: "* Either prompt or block must be provided"
          },
          goto: {
            title: "Goto Operation",
            description: "Navigates to different document sections.",
            fields: [
              { name: "block", required: "Yes", description: "Target block to navigate to" }
            ]
          }
        };

        if (operationInfo[operation]) {
          const info = operationInfo[operation];

          // Create contents using simple markdown
          let contents = [];
          contents.push({ value: `## ${info.title}` });
          contents.push({ value: info.description });
          contents.push({ value: "### Parameters" });
          let fieldTable = "| Field | Required | Description |\n|-------|----------|-------------|\n";
          info.fields.forEach((field: any) => {
            fieldTable += `| \`${field.name}\` | ${field.required} | ${field.description} |\n`;
          });
          contents.push({ value: fieldTable });
          if (info.note) {
            contents.push({ value: `**Note:** ${info.note}` });
          }

          // Define the range for the hover popup (covering only the @operation)
          const hoverRange = {
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: 1 + operationKeyword.length
          };

          return {
            range: hoverRange,
            contents: contents
          };
        }

        return null;
      } catch (error) {
        console.warn('Error in hover provider:', error);
        return null;
      }
    }
  });
}

// Helper function to generate suggestions for a given operation
function getSuggestionsForOperation(operation: string, range: any, monaco: any, triggeredBySpace: boolean): monaco.languages.CompletionItem[] {
  let suggestions: monaco.languages.CompletionItem[] = [];
  const paramRange = range; // Use the provided range

  // --- Helper to adjust snippet text based on trigger ---
  const adjustSnippetText = (textLines: string[]): string => {
    if (triggeredBySpace) {
      // Prepend newline if triggered by '@op '
      return '\n' + textLines.join('\n');
    }
    return textLines.join('\n');
  };
  // --- End Helper ---

  // Using the structure from operationInfo for consistency
  if (operation === 'llm') {
    suggestions = [
      // Fields from operationInfo (range remains paramRange)
      { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Direct text string for input prompt", insertText: "prompt: ", range: paramRange },
      { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference(s) to blocks for prompt content", insertText: "block: ", range: paramRange },
      { label: "media", kind: monaco.languages.CompletionItemKind.Field, documentation: "File paths for additional media context", insertText: "media: ", range: paramRange },
      { label: "save-to-file", kind: monaco.languages.CompletionItemKind.Field, documentation: "File path to save raw response", insertText: "save-to-file: ", range: paramRange },
      { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for LLM response", insertText: "use-header: ", range: paramRange },
      { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode (append, prepend, replace)", insertText: "mode: ", range: paramRange },
      { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
      { label: "provider", kind: monaco.languages.CompletionItemKind.Field, documentation: "Override for language model provider", insertText: "provider: ", range: paramRange },
      { label: "model", kind: monaco.languages.CompletionItemKind.Field, documentation: "Override for specific model", insertText: "model: ", range: paramRange },
      { label: "temperature", kind: monaco.languages.CompletionItemKind.Field, documentation: "Controls randomness (0.0-1.0)", insertText: "temperature: ", range: paramRange },
      // Snippets (adjust insertText and potentially range if triggeredBySpace)
      {
        label: "full-llm-operation (prompt)",
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: "Complete LLM operation using prompt",
        insertText: adjustSnippetText(["prompt: ${1:Your prompt here}", "model: ${2:default-model}"]), // Use helper
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: paramRange // Range is handled in provideCompletionItems now
      },
      {
        label: "full-llm-operation (block)",
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: "Complete LLM operation using block",
        insertText: adjustSnippetText(["block: ${1:block-reference}", "model: ${2:default-model}"]), // Use helper
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: paramRange // Range is handled in provideCompletionItems now
      }
    ];
  } else if (operation === 'shell') {
     suggestions = [
        // Fields
        { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Shell command to execute", insertText: "prompt: ", range: paramRange },
        { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for command output", insertText: "use-header: ", range: paramRange },
        { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode (append, prepend, replace)", insertText: "mode: ", range: paramRange },
        { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
        // Snippets
        {
          label: "full-shell-operation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete shell operation",
          insertText: adjustSnippetText(["prompt: ${1:echo 'Hello World'}", "use-header: \"${2:# Shell Output}\""]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        }
     ];
  } else if (operation === 'import') {
     suggestions = [
        // Fields
        { label: "file", kind: monaco.languages.CompletionItemKind.Field, documentation: "File path to import from", insertText: "file: ", range: paramRange },
        { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference to specific section within source file", insertText: "block: ", range: paramRange },
        { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "How content is merged (append, prepend, replace)", insertText: "mode: ", range: paramRange },
        { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference in current document", insertText: "to: ", range: paramRange },
        // Snippets
        {
          label: "full-import-operation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete import operation",
          insertText: adjustSnippetText(["file: ${1:path/to/file.md}", "block: ${2:section/subsection}", "mode: ${3:append}", "to: ${4:target-block}"]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        }
     ];
  } else if (operation === 'run') {
     suggestions = [
        // Fields
        { label: "file", kind: monaco.languages.CompletionItemKind.Field, documentation: "Path to markdown file to execute", insertText: "file: ", range: paramRange },
        { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Literal text input for workflow", insertText: "prompt: ", range: paramRange },
        { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference(s) to blocks for input", insertText: "block: ", range: paramRange },
        { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for workflow output", insertText: "use-header: ", range: paramRange },
        { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode (append, prepend, replace)", insertText: "mode: ", range: paramRange },
        { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
        // Snippets
        {
          label: "full-run-operation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete run operation",
          insertText: adjustSnippetText(["file: ${1:path/to/file.md}", "prompt: ${2:Input for workflow}", "use-header: \"${3:# Workflow Output}\""]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        }
     ];
  } else if (operation === 'return') {
     suggestions = [
        // Fields
        { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Literal text to return", insertText: "prompt: ", range: paramRange },
        { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference(s) to blocks to return", insertText: "block: ", range: paramRange },
        { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for returned content", insertText: "use-header: ", range: paramRange },
        // Snippets
        {
          label: "full-return-operation (block)",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete return operation using block",
          insertText: adjustSnippetText(["block: ${1:block-reference}", "use-header: \"${2:# Return Block}\""]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        },
        {
          label: "full-return-operation (prompt)",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete return operation using prompt",
          insertText: adjustSnippetText(["prompt: ${1:Return text}", "use-header: \"${2:# Return Value}\""]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        },
        {
          label: "return-array-blocks",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Return multiple blocks",
          insertText: adjustSnippetText(["block:", "  - ${1:first-block}", "  - ${2:second-block}", "use-header: \"${3:# Return Block}\""]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        }
     ];
  } else if (operation === 'goto') {
     suggestions = [
        // Fields
        { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block to navigate to", insertText: "block: ", range: paramRange },
        // Snippets
        {
          label: "full-goto-operation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: "Complete goto operation",
          insertText: adjustSnippetText(["block: ${1:target-block-id}"]), // Use helper
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: paramRange
        }
     ];
  }
  return suggestions;
}

// Register auto-completion provider for Fractalic
export function registerFractalicCompletionProvider(monaco: any) {
  monaco.languages.registerCompletionItemProvider("fractalic", {
    triggerCharacters: ["@", " ", "\n", "#", "{", ":"], // Added ':' to potentially trigger after field name
    provideCompletionItems: (model: any, position: any) => {
      try {
        const currentLineNumber = position.lineNumber;
        const currentLineContent = model.getLineContent(currentLineNumber);
        const textUntilPosition = currentLineContent.substring(0, position.column - 1);

        // Get previous line content
        const previousLineNumber = currentLineNumber > 1 ? currentLineNumber - 1 : 0; // Use 0 if no previous line
        const previousLineContent = previousLineNumber > 0 ? model.getLineContent(previousLineNumber) : "";

        // --- IMPROVED FIELD VALUE DETECTION ---
        // Check if we're inside a field value context more precisely
        const isInFieldValueContext = (() => {
          // Check for classic field pattern: "field:" or "field: " where cursor is after colon
          const fieldColonMatch = /^(\s*)([a-zA-Z0-9_-]+)(:)(\s*)/.exec(currentLineContent);
          
          if (fieldColonMatch && position.column > fieldColonMatch.index + fieldColonMatch[0].length) {
            // We're on a line with a field and our cursor is after the "field: " part
            return true;
          }
          
          // Check for array item pattern: "  - " where cursor is after the hyphen
          const arrayItemMatch = /^(\s+)(-)(\s+)/.exec(currentLineContent);
          if (arrayItemMatch && position.column > arrayItemMatch.index + arrayItemMatch[0].length) {
            return true;
          }
          
          // Check if we're inside quoted string (field value)
          const textBeforeCursor = currentLineContent.substring(0, position.column - 1);
          // Count quotes before cursor to determine if we're inside a string
          const doubleQuoteCount = (textBeforeCursor.match(/"/g) || []).length;
          const singleQuoteCount = (textBeforeCursor.match(/'/g) || []).length;
          
          // If odd number of either quote type, we're inside a quoted string
          if ((doubleQuoteCount % 2 === 1) || (singleQuoteCount % 2 === 1)) {
            return true;
          }
          
          // Check if we're on a continuation line (indented) after a field declaration
          // This handles multiline field values
          if (currentLineContent.trim() && currentLineContent.match(/^\s+/) && !currentLineContent.match(/^\s+[a-zA-Z0-9_-]+:/)) {
            // We're on an indented line that's not a field declaration itself
            // Look at previous lines to see if we're in a field value context
            for (let i = currentLineNumber - 1; i > 0; i--) {
              const prevLine = model.getLineContent(i);
              if (!prevLine.trim()) continue; // Skip empty lines
              
              // If we hit a line with same or less indentation, check if it's a field
              const currentIndent = currentLineContent.match(/^(\s*)/)[0].length;
              const prevIndent = prevLine.match(/^(\s*)/)[0].length;
              
              if (prevIndent <= currentIndent) {
                const fieldMatch = prevLine.match(/^(\s*)([a-zA-Z0-9_-]+)(:)(\s*)/);
                if (fieldMatch) return true; // We're in a multiline value
                if (prevLine.match(/^(\s+)(-)(\s+)/)) return true; // We're in an array value
              }
              
              // If we hit a less indented line that's not a field, we're not in a value context
              if (prevIndent < currentIndent) break;
            }
          }
          
          return false;
        })();
        
        if (isInFieldValueContext) {
          // We're entering a value context, don't provide suggestions
          return { suggestions: [] };
        }

        let suggestions: monaco.languages.CompletionItem[] = [];
        let operationForParams: string | null = null;
        let isWithinOperationBlock = false;
        let triggerBasedOnCurrentLineWithSpace = false;

        // --- Parameter/Snippet Suggestion Logic ---

        // Check 1: Current line is "@op " and cursor is right after space
        const opMatchCurrentSpace = currentLineContent.match(/^@(\w+)\s$/);
        if (opMatchCurrentSpace && position.column === currentLineContent.length + 1) {
            operationForParams = opMatchCurrentSpace[1];
            triggerBasedOnCurrentLineWithSpace = true;
            isWithinOperationBlock = true; // We are starting an operation block
        }

        // Check 2: If not triggered by "@op ", check if we are inside an operation block
        // by looking upwards for the nearest "@op" line before a separator (# or empty line).
        if (!operationForParams) {
            for (let lineNum = currentLineNumber - 1; lineNum >= 1; lineNum--) {
                const lineContent = model.getLineContent(lineNum);
                const trimmedLine = lineContent.trim();

                // Found the start of the operation block?
                const opMatchPrev = trimmedLine.match(/^@(\w+)\s*$/);
                if (opMatchPrev) {
                    operationForParams = opMatchPrev[1];
                    isWithinOperationBlock = true;
                    break; // Found the relevant operation
                }

                // Found a separator before finding an operation? Stop searching.
                if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                    break;
                }
                // If we are on the current line and it's not empty, continue searching upwards
                // Only stop if we hit an empty line or header on PREVIOUS lines.
                if (lineNum === currentLineNumber && trimmedLine !== '') {
                   continue;
                } else if (trimmedLine === '') { // Stop if previous line was empty
                   break;
                }
            }
        }


        // If we identified an operation context, generate suggestions
        if (operationForParams && isWithinOperationBlock) {
            let paramRange;

            // Determine the insertion range
            if (triggerBasedOnCurrentLineWithSpace) {
                // Requirement 1: Triggered by '@op '. Replace the space.
                paramRange = {
                    startLineNumber: currentLineNumber,
                    endLineNumber: currentLineNumber,
                    startColumn: position.column -1, // Start at the space
                    endColumn: position.column     // End after the space
                };
            } else if (textUntilPosition.trim() === '') {
                // Requirement 2 (cont.): Current line is empty/whitespace. Insert at start.
                 paramRange = {
                    startLineNumber: currentLineNumber,
                    endLineNumber: currentLineNumber,
                    startColumn: 1, // Start of the line
                    endColumn: 1  // Replace nothing initially
                };
            } else {
                 // Requirement 2 (cont.): Typing on a non-empty line within the block. Insert at cursor.
                 paramRange = {
                    startLineNumber: currentLineNumber,
                    endLineNumber: currentLineNumber,
                    startColumn: position.column,
                    endColumn: position.column
                };
            }

            // Get suggestions (fields and snippets)
            // Pass the trigger flag to adjust snippet text
            suggestions = getSuggestionsForOperation(operationForParams, paramRange, monaco, triggerBasedOnCurrentLineWithSpace);

             // Filter out snippets if not triggered by '@op ' or if not on an empty line start
            if (!triggerBasedOnCurrentLineWithSpace && textUntilPosition.trim() !== '') {
                suggestions = suggestions.filter(s => s.kind !== monaco.languages.CompletionItemKind.Snippet);
            }
             // Filter out fields if triggered by '@op ' (only show full snippets initially)
            if (triggerBasedOnCurrentLineWithSpace) {
                 suggestions = suggestions.filter(s => s.kind === monaco.languages.CompletionItemKind.Snippet);
            }

        }

        // --- Operation Suggestions ---
        // Trigger ONLY if the line starts with @ and NO parameter/snippet suggestions were added above.
        if (suggestions.length === 0 && textUntilPosition.match(/^@\w*$/)) {
          // ... (operation suggestions logic remains the same) ...
          const operationRange = {
            startLineNumber: currentLineNumber,
            endLineNumber: currentLineNumber,
            startColumn: 1, // Start from the beginning of the line (where '@' is)
            endColumn: position.column // End at the current cursor position
          };
          suggestions = [
            // Add back all operations
            { label: "@llm", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Send prompts...", insertText: "@llm", range: operationRange },
            { label: "@shell", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Execute commands...", insertText: "@shell", range: operationRange },
            { label: "@import", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Import content...", insertText: "@import", range: operationRange },
            { label: "@run", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Execute workflow...", insertText: "@run", range: operationRange },
            { label: "@return", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Produce output...", insertText: "@return", range: operationRange },
            { label: "@goto", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Navigate sections...", insertText: "@goto", range: operationRange } // Add space
          ];
        }

        // Return the generated suggestions (or an empty list)
        return { suggestions };
      } catch (error) {
        // Log errors but return empty suggestions to avoid breaking editor
        console.warn('Error in completion provider:', error);
        return { suggestions: [] };
      }
    }
  });
}

// Set default language for .md files to Fractalic
export function setDefaultLanguageForMarkdown(monaco: any) {
  // Register a filename pattern for .md files
  monaco.languages.register({
    id: 'fractalic',
    extensions: ['.md', '.markdown']
  });
}

// Initialize all Fractalic language features
export function setupFractalicLanguage(monaco: any) {
  try {
    console.log("Setting up Fractalic language and theme..."); // Add log

    // Clean up existing models (optional, might help in some cases)
    // monaco.editor.getModels().forEach((model: any) => {
    //   if (model.getLanguageId() === 'fractalic') {
    //     model.dispose();
    //   }
    // });

    // Register all language features
    registerFractalicLanguage(monaco);
    registerFractalicFolding(monaco);
    registerFractalicHoverProvider(monaco);
    registerFractalicCompletionProvider(monaco);
    setDefaultLanguageForMarkdown(monaco); // Ensure .md uses fractalic

    // Force theme application
    monaco.editor.setTheme('fractalicDarkTheme');
    console.log("Fractalic theme applied."); // Add log
  } catch (error) {
    console.error("Error setting up Fractalic language:", error);
  }
} 
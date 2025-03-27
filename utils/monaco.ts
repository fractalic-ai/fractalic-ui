/**
 * Monaco editor configuration for Fractalic
 */

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

        // Simple literal values (numbers, true/false) after a colon
        [/(:\s+)(\d+(\.\d+)?|true|false)\b/, ["punctuation.colon", "literal-value"]],

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
      { token: "punctuation.colon", foreground: "#D4D4D4" },
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

// Register auto-completion provider for Fractalic
export function registerFractalicCompletionProvider(monaco: any) {
  monaco.languages.registerCompletionItemProvider("fractalic", {
    // --- Add Trigger Characters ---
    triggerCharacters: ['@', '#', ' '], // Trigger on @, #, and space (for params after indent)
    // --- End Add Trigger Characters ---
    provideCompletionItems: (model: any, position: any) => {
      try {
        const currentLineNumber = position.lineNumber;
        const textUntilPosition = model.getValueInRange({
          startLineNumber: currentLineNumber,
          startColumn: 1,
          endLineNumber: currentLineNumber,
          endColumn: position.column
        });
        const currentLine = model.getLineContent(currentLineNumber);
        const word = model.getWordUntilPosition(position);
        const currentWordRange = {
          startLineNumber: currentLineNumber,
          endLineNumber: currentLineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        interface Suggestion {
          label: string;
          kind: any; // Monaco.languages.CompletionItemKind
          documentation?: string;
          insertText: string;
          range: any;
          insertTextRules?: any;
        }
        let suggestions: Suggestion[] = [];
        let operationOnPreviousLine: string | null = null;

        // Check previous line for an operation keyword
        if (currentLineNumber > 1) {
          const prevLine = model.getLineContent(currentLineNumber - 1);
          const opMatch = prevLine.match(/^@(llm|shell|import|run|return|goto)\s*$/);
          if (opMatch) {
            operationOnPreviousLine = opMatch[1];
          }
        }

        // --- Parameter Suggestions ---
        // Trigger if previous line had an operation AND current line starts with whitespace
        if (operationOnPreviousLine && currentLine.match(/^\s+/)) {
          const paramRange = currentWordRange; // Use word range for replacing typed param name
          // Populate suggestions based on the operation found on the previous line
          if (operationOnPreviousLine === 'llm') {
            suggestions = [
              { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Direct text prompt...", insertText: "prompt: ", range: paramRange },
              { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference to blocks...", insertText: "block: ", range: paramRange },
              // ... Add ALL other llm params back ...
              { label: "media", kind: monaco.languages.CompletionItemKind.Field, documentation: "File paths for media context", insertText: "media: ", range: paramRange },
              { label: "save-to-file", kind: monaco.languages.CompletionItemKind.Field, documentation: "File path to save raw response", insertText: "save-to-file: ", range: paramRange },
              { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for LLM response", insertText: "use-header: ", range: paramRange },
              { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode (append, prepend, replace)", insertText: "mode: ", range: paramRange },
              { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
              { label: "provider", kind: monaco.languages.CompletionItemKind.Field, documentation: "Override LLM provider", insertText: "provider: ", range: paramRange },
              { label: "model", kind: monaco.languages.CompletionItemKind.Field, documentation: "Override specific model", insertText: "model: ", range: paramRange },
              { label: "temperature", kind: monaco.languages.CompletionItemKind.Field, documentation: "Controls randomness (0.0-1.0)", insertText: "temperature: ", range: paramRange },
              // Snippets
              { label: "prompt-multiline", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Multiline prompt", insertText: "prompt: |\n  ${1:Your multi-line prompt here}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange },
              { label: "full-llm-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete LLM operation", insertText: ["prompt: ${1:Your prompt here}", "block: ${2:block-reference}", "temperature: ${3:0.7}", "use-header: \"${4:# LLM Response}\"", "mode: ${5:append}"].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
            ];
          } else if (operationOnPreviousLine === 'shell') {
             suggestions = [
                { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Shell command...", insertText: "prompt: ", range: paramRange },
                { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for output", insertText: "use-header: \"# Shell Output\"", range: paramRange },
                // ... Add ALL other shell params back ...
                { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode", insertText: "mode: ", range: paramRange },
                { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
                // Snippets
                { label: "full-shell-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete shell operation", insertText: ["prompt: ${1:command to execute}", "use-header: \"${2:# Shell Output}\"", "mode: ${3:append}"].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
             ];
          } else if (operationOnPreviousLine === 'import') {
             suggestions = [
                { label: "file", kind: monaco.languages.CompletionItemKind.Field, documentation: "File path to import...", insertText: "file: ", range: paramRange },
                { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Specific section...", insertText: "block: ", range: paramRange },
                // ... Add ALL other import params back ...
                { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "How content is merged", insertText: "mode: ", range: paramRange },
                { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
                // Snippets
                { label: "full-import-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete import operation", insertText: ["file: ${1:path/to/file.md}", "block: ${2:section/subsection}", "mode: ${3:append}", "to: ${4:target-block}"].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
             ];
          } else if (operationOnPreviousLine === 'run') {
             suggestions = [
                { label: "file", kind: monaco.languages.CompletionItemKind.Field, documentation: "Path to file to execute", insertText: "file: ", range: paramRange },
                { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Literal text input...", insertText: "prompt: ", range: paramRange },
                // ... Add ALL other run params back ...
                { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference(s) to blocks for input", insertText: "block: ", range: paramRange },
                { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for workflow output", insertText: "use-header: ", range: paramRange },
                { label: "mode", kind: monaco.languages.CompletionItemKind.Field, documentation: "Merge mode", insertText: "mode: ", range: paramRange },
                { label: "to", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block reference", insertText: "to: ", range: paramRange },
                // Snippets
                { label: "full-run-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete run operation", insertText: ["file: ${1:path/to/file.md}", "prompt: ${2:Input for workflow}", "use-header: \"${3:# Workflow Output}\""].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
             ];
          } else if (operationOnPreviousLine === 'return') {
             suggestions = [
                { label: "prompt", kind: monaco.languages.CompletionItemKind.Field, documentation: "Literal text to return", insertText: "prompt: ", range: paramRange },
                { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Reference(s) to blocks...", insertText: "block: ", range: paramRange },
                // ... Add ALL other return params back ...
                 { label: "use-header", kind: monaco.languages.CompletionItemKind.Field, documentation: "Header for returned content", insertText: "use-header: ", range: paramRange },
                // Snippets
                { label: "full-return-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete return operation", insertText: ["block: ${1:block-reference}", "use-header: \"${2:# Return Block}\""].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange },
                { label: "return-array-blocks", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Return multiple blocks", insertText: ["block:", "  - ${1:first-block}", "  - ${2:second-block}", "use-header: \"${3:# Return Block}\""].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
             ];
          } else if (operationOnPreviousLine === 'goto') {
             suggestions = [
                { label: "block", kind: monaco.languages.CompletionItemKind.Field, documentation: "Target block...", insertText: "block: ", range: paramRange },
                // Snippets
                { label: "full-goto-operation", kind: monaco.languages.CompletionItemKind.Snippet, documentation: "Complete goto operation", insertText: ["block: ${1:target-block-id}"].join("\n"), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: paramRange }
             ];
          }
        }

        // --- Operation Suggestions ---
        // Trigger if the line starts with @ and no parameter suggestions were added.
        if (suggestions.length === 0 && textUntilPosition.match(/^@\w*$/)) {
          // --- Define Specific Range for Operations ---
          const operationRange = {
            startLineNumber: currentLineNumber,
            endLineNumber: currentLineNumber,
            startColumn: 1, // Start from the beginning of the line (where '@' is)
            endColumn: position.column // End at the current cursor position
          };
          // --- End Define Specific Range ---
          suggestions = [
            // Use operationRange for all operation suggestions
            { label: "@llm", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Send prompts...", insertText: "@llm\n", range: operationRange },
            { label: "@shell", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Execute commands...", insertText: "@shell\n", range: operationRange },
            { label: "@import", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Import content...", insertText: "@import\n", range: operationRange },
            { label: "@run", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Execute workflow...", insertText: "@run\n", range: operationRange },
            { label: "@return", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Produce output...", insertText: "@return\n", range: operationRange },
            { label: "@goto", kind: monaco.languages.CompletionItemKind.Keyword, documentation: "Navigate sections...", insertText: "@goto\n", range: operationRange }
          ];
        }
        // --- Header Suggestions ---
        // Trigger if the line starts with # and no other suggestions were added.
        else if (suggestions.length === 0 && textUntilPosition.match(/^#*\s*$/)) {
           // --- Define Specific Range for Headers ---
           const headerRange = {
             startLineNumber: currentLineNumber,
             endLineNumber: currentLineNumber,
             startColumn: 1, // Start from the beginning of the line
             endColumn: position.column // End at the current cursor position
           };
           // --- End Define Specific Range ---
          suggestions.push({
            label: "header-with-id",
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: "Markdown header with custom ID",
            insertText: "# ${1:Heading Title} {id=${2:custom-id}}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: headerRange // Use headerRange
          });
        }

        return { suggestions };
      } catch (error) {
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
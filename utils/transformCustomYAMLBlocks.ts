export function transformCustomYAMLBlocks(content: string): string {
    const targetTags = ['@run', '@llm', '@goto', '@shell', '@import', '@return', '@operation'];
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;
  
    while (i < lines.length) {
      const line = lines[i];
      const prevEmpty = i === 0 || lines[i - 1].trim() === '';
  
      if (prevEmpty && targetTags.some(tag => line.startsWith(tag))) {
        result.push('```yaml');
        // Append the current line and subsequent non-empty lines
        while (i < lines.length && lines[i].trim() !== '') {
          result.push(lines[i]);
          i++;
        }
        result.push('```');
        // Skip any empty lines (these will be added normally)
        continue;
      }
      result.push(line);
      i++;
    }
  
    return result.join('\n');
  }
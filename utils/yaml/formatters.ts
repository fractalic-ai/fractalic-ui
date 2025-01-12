// Using 'yaml' library options instead of js-yaml
// The yaml library provides separate functions for parse and stringify,
// and while it doesn't directly support all the same options, we try to 
// replicate similar behavior.

export const getYamlDumpOptions = () => {
  return {
    indent: 2,
    lineWidth: -1, 
    // The yaml library doesn't have a direct equivalent of quotingType = '"', 
    // but you can specify double quote preference via 'scalarOptions'.
    // Also, 'forceQuotes' doesn't exist as-is. The library uses heuristics for quotes.
    // You can force all strings to quote by using the 'defaultStringType' option set to 'QUOTE_DOUBLE'.
    scalarOptions: {
      defaultStringType: "QUOTE_DOUBLE"
    }
  };
};

export const getYamlLoadOptions = () => {
  // For 'yaml', parse does not need a schema like js-yaml did.
  // YAML 1.2 parsing is the default. The 'strict' option doesn't exist as in js-yaml.
  // If you need strict parsing, consider validating the parsed result or using custom tags.
  return {
    // Typically no special options are required for parsing.
    // If you had custom tags or needed JSON mode, you could set them here.
    // The 'yaml' library does not support a 'schema' option like js-yaml, 
    // and it doesn't have a direct 'json' or 'strict' option.
  };
};

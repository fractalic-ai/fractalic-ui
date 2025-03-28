const https = require('https');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/assets/seti-icons');

// Create directory if it doesn't exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Define icon mappings with their extensions and SETI dark theme colors
const ICON_MAPPINGS = {
  // Folders
  'folder': {
    extensions: ['dir'],
    color: '#4E72A4', // SETI folder blue
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // Markdown
  'markdown': {
    extensions: ['md', 'ctx'],
    color: '#51B6C3', // SETI markdown blue
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // JavaScript
  'javascript': {
    extensions: ['js', 'jsx', 'mjs'],
    color: '#F1E05A', // SETI JS yellow
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // TypeScript
  'typescript': {
    extensions: ['ts', 'tsx'],
    color: '#51B6C3', // SETI TS blue
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // Python
  'python': {
    extensions: ['py', 'pyc', 'pyo', 'pyd'],
    color: '#3572A5', // SETI Python blue
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // HTML
  'html': {
    extensions: ['html', 'htm'],
    color: '#E34F26', // SETI HTML orange
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // CSS
  'css': {
    extensions: ['css', 'scss', 'sass', 'less'],
    color: '#1572B6', // SETI CSS blue
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // JSON
  'json': {
    extensions: ['json'],
    color: '#F1E05A', // SETI JSON yellow
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // Shell
  'shell': {
    extensions: ['sh', 'bash', 'zsh'],
    color: '#C0C0C0', // SETI shell gray
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // Images
  'image': {
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'],
    color: '#A0A0A0', // SETI image gray
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  },
  // Default
  'default': {
    extensions: ['*'],
    color: '#C0C0C0', // SETI default gray
    filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1231%) hue-rotate(199deg) brightness(97%) contrast(101%)'
  }
};

// List of all SETI icons to download
const ALL_SETI_ICONS = [
  'actionscript',
  'applescript',
  'asm',
  'atom',
  'audio',
  'babel',
  'bower',
  'c',
  'c++',
  'cake',
  'cake_php',
  'cc',
  'cfm',
  'clojure',
  'coffee',
  'coffee_erb',
  'coldfusion',
  'config',
  'cpp',
  'csharp',
  'css',
  'csv',
  'cxx',
  'd',
  'db',
  'default',
  'deprecation-cop',
  'doc',
  'docker',
  'editorconfig',
  'ejs',
  'elixir',
  'elm',
  'emacs',
  'erb',
  'erlang',
  'eslint',
  'fsharp',
  'git',
  'go',
  'gradle',
  'graphql',
  'grunt',
  'gulp',
  'h',
  'haml',
  'haskell',
  'haxe',
  'heroku',
  'hex',
  'html',
  'ignored',
  'illustrator',
  'image',
  'info',
  'ionic',
  'jade',
  'java',
  'javascript',
  'jquery',
  'json',
  'julia',
  'karma',
  'kotlin',
  'less',
  'license',
  'liquid',
  'livescript',
  'lua',
  'makefile',
  'markdown',
  'maven',
  'mjs',
  'mustache',
  'nim',
  'notebook',
  'npm',
  'nunjucks',
  'ocaml',
  'pddl',
  'pdf',
  'perl',
  'photoshop',
  'php',
  'play_arrow',
  'powershell',
  'project',
  'prolog',
  'pug',
  'puppet',
  'python',
  'r',
  'rails',
  'react',
  'reasonml',
  'rescript',
  'rollup',
  'ruby',
  'rust',
  'sass',
  'sbt',
  'scala',
  'search',
  'settings',
  'shell',
  'slim',
  'smarty',
  'spring',
  'sql',
  'stylus',
  'sublime',
  'svg',
  'swift',
  'terraform',
  'tex',
  'text',
  'toml',
  'tsconfig',
  'twig',
  'typescript',
  'vala',
  'video',
  'vue',
  'webpack',
  'wxml',
  'wxss',
  'xml',
  'yarn',
  'yml',
  'zip'
];

const downloadIcon = (iconName) => {
  const url = `https://raw.githubusercontent.com/jesseweed/seti-ui/master/icons/${iconName}.svg`;
  const filePath = path.join(ICONS_DIR, `${iconName}.svg`);

  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(fs.createWriteStream(filePath));
      console.log(`Downloaded: ${iconName}.svg`);
    } else {
      console.error(`Failed to download ${iconName}.svg: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${iconName}.svg:`, err);
  });
};

// Download all SETI icons
ALL_SETI_ICONS.forEach(downloadIcon);

// Create a mapping file for the frontend
fs.writeFileSync(
  path.join(ICONS_DIR, 'mappings.json'),
  JSON.stringify(ICON_MAPPINGS, null, 2)
); 
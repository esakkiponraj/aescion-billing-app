const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo workspace (preserving Expo defaults)
config.watchFolders = Array.from(
  new Set([...(config.watchFolders || []), projectRoot, workspaceRoot])
);

// 2. Resolve modules from both local and workspace root node_modules
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
    ...(config.resolver.nodeModulesPaths || [])
  ])
);

// 3. Support WASM files for expo-sqlite web worker and web assembly assets
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;

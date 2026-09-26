const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-constants': path.join(projectRoot, 'node_modules', 'expo-constants'),
}

// B5 : permet require('../assets/*.svg') (routePattern dans theme/tokens.ts).
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
}
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg')
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg']

module.exports = config

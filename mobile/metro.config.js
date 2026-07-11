const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-constants': path.join(projectRoot, 'node_modules', 'expo-constants'),
}

module.exports = config

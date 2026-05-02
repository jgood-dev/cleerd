const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Allow importing from packages/shared
config.watchFolders = [path.resolve(__dirname, '../../packages')]

module.exports = withNativeWind(config, { input: './global.css' })

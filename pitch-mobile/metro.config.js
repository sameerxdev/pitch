const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const reanimatedStub = path.resolve(__dirname, "src/utils/reanimated-stub.js");

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Stub react-native-reanimated for all third-party packages (css-interop,
    // gesture-handler, etc.) — we removed the native module to stay compatible
    // with Expo Go. Our app code doesn't use reanimated directly.
    if (
      moduleName === "react-native-reanimated" &&
      context.originModulePath?.includes("node_modules")
    ) {
      return { type: "sourceFile", filePath: reanimatedStub };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });

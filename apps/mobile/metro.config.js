const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: resolve the shared @coop/tax workspace package.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// npm workspaces can leave a second copy of react/react-native nested under
// apps/mobile/node_modules. Bundling react-native twice breaks the native
// view registry ("View config getter callback for RCTText must be a
// function"), so force every import of these singletons to the hoisted
// workspace-root copy.
const SINGLETONS = ["react", "react-native"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = SINGLETONS.some(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`)
  );
  const resolutionContext = isSingleton
    ? { ...context, originModulePath: path.join(workspaceRoot, "package.json") }
    : context;
  return context.resolveRequest(resolutionContext, moduleName, platform);
};

module.exports = config;

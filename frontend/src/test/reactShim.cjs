const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react" || request === "react-dom" || request === "react/jsx-runtime") {
    if (request === "react/jsx-runtime") {
      return originalResolveFilename.call(this, "preact/jsx-runtime", parent, isMain, options);
    }
    return originalResolveFilename.call(this, "preact/compat", parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

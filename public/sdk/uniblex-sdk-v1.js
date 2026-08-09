(function (window) {
  "use strict";

  if (window.UniblexSDK) return;

  var initialized = false;
  var allowedParents = ["https://www.uniblex.com", "https://uniblex.com"];

  function post(type, detail) {
    var payload = { source: "uniblex-sdk", version: "1.0.0", type: type, detail: detail || {}, timestamp: Date.now() };
    if (window.parent === window) return payload;
    allowedParents.forEach(function (origin) {
      try { window.parent.postMessage(payload, origin); } catch (_) { /* host may not match this origin */ }
    });
    return payload;
  }

  function lifecycle(type) { return function (detail) { return post(type, detail); }; }

  var sdk = {
    version: "1.0.0",
    init: function () {
      if (!initialized) {
        initialized = true;
        document.addEventListener("visibilitychange", function () {
          post(document.hidden ? "host:pause" : "host:resume", { reason: "visibility" });
        });
        post("sdk:initialized");
      }
      return Promise.resolve({ version: sdk.version, embedded: window.parent !== window });
    },
    game: {
      ready: lifecycle("game:ready"),
      gameplayStart: lifecycle("gameplay:start"),
      gameplayStop: lifecycle("gameplay:stop"),
      loadingStart: lifecycle("loading:start"),
      loadingStop: lifecycle("loading:stop")
    }
  };

  Object.defineProperty(window, "UniblexSDK", { value: sdk, writable: false, configurable: false });
})(window);

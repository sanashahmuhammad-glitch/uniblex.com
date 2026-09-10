(function (window) {
  "use strict";
  if (window.UniblexSDK) return;
  var session = "", origin = "", pending = new Map(), listeners = new Map(), serial = 0;
  var capabilities = { interstitial: false, rewarded: false }, initialization;
  var prefix = Math.random().toString(36).slice(2);
  function emit(name, detail) { (listeners.get(name) || []).forEach(function (fn) { try { fn(detail); } catch (_) {} }); }
  function fallback() { return { status: "unavailable", rewardGranted: false }; }
  function call(method, payload, timeout) {
    if (!origin || window.parent === window || pending.size >= 32) return Promise.resolve(fallback());
    return new Promise(function (resolve) {
      var id = prefix + "_" + (++serial), timer = window.setTimeout(function () { pending.delete(id); resolve(fallback()); }, timeout || 2500);
      pending.set(id, { method: method, resolve: resolve, timer: timer });
      try { window.parent.postMessage({ protocol: "uniblex", version: 2, type: "request", requestId: id, session: session || undefined, method: method, payload: payload || {} }, origin); }
      catch (_) { window.clearTimeout(timer); pending.delete(id); resolve(fallback()); }
    });
  }
  window.addEventListener("message", function (event) {
    if (!origin || event.origin !== origin || event.source !== window.parent) return;
    var m = event.data;
    if (!m || m.protocol !== "uniblex" || m.version !== 2) return;
    if (m.type === "event") {
      if (m.session === session && m.event === "adStarted" && m.payload && typeof m.payload === "object") emit("adStarted", { adType: m.payload.adType, placement: m.payload.placement });
      return;
    }
    if (m.type !== "response" || typeof m.requestId !== "string") return;
    var item = pending.get(m.requestId);
    if (!item || !m.payload || typeof m.payload !== "object") return;
    if (item.method === "init") {
      if (typeof m.session !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(m.session) || m.payload.session !== m.session) return;
      session = m.session;
    } else if (m.session !== session) return;
    var payload = m.payload;
    if (item.method === "showRewarded" || item.method === "showInterstitial") {
      if (["completed", "skipped", "failed", "unavailable", "blocked"].indexOf(payload.status) < 0 || typeof payload.rewardGranted !== "boolean") return;
      payload = { status: payload.status, rewardGranted: item.method === "showRewarded" && payload.status === "completed" && payload.rewardGranted };
    }
    pending.delete(m.requestId); window.clearTimeout(item.timer); item.resolve(payload);
  });
  window.addEventListener("pagehide", function () { pending.forEach(function (p) { window.clearTimeout(p.timer); p.resolve(fallback()); }); pending.clear(); session = ""; initialization = null; });
  function lifecycle(method) { return function () { if (session) void call(method); }; }
  function show(method, options) {
    options = options || {};
    if (!session || typeof options.placement !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(options.placement)) return Promise.resolve(fallback());
    if (options.reward !== undefined && (typeof options.reward !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(options.reward))) return Promise.resolve(fallback());
    emit("adRequested", { placement: options.placement });
    // Pause at request time. An unavailable or blocked result also closes the request.
    return call(method, { placement: options.placement, ...(options.reward !== undefined ? { reward: options.reward } : {}) }, 65000).then(function (result) {
      emit(result.status === "completed" ? "adCompleted" : result.status === "skipped" ? "adSkipped" : "adFailed", result); emit("adClosed", result); return result;
    });
  }
  var sdk = {
    version: "2.0.0",
    init: function (options) {
      if (initialization) return initialization;
      try {
        var candidate = options && options.hostOrigin || new URL(document.referrer).origin;
        var url = new URL(candidate);
        if (url.origin !== candidate || !(url.protocol === "https:" || url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))) return Promise.resolve(fallback());
        origin = url.origin;
      } catch (_) { return Promise.resolve(fallback()); }
      initialization = call("init").then(function (reply) { capabilities = { interstitial: reply.interstitial === true, rewarded: reply.rewarded === true }; return { version: sdk.version, embedded: window.parent !== window, connected: !!session }; });
      return initialization;
    },
    game: { loadingStart: lifecycle("game_loading_start"), loadingStop: lifecycle("game_loading_stop"), ready: lifecycle("game_ready"), gameplayStart: lifecycle("gameplay_start"), gameplayStop: lifecycle("gameplay_stop") },
    ads: {
      isAvailable: function (type) { return !!session && (type === "interstitial" ? capabilities.interstitial : type === "rewarded" ? capabilities.rewarded : capabilities.interstitial || capabilities.rewarded); },
      getCapabilities: function () { return session ? call("getCapabilities").then(function (v) { capabilities = { interstitial: v.interstitial === true, rewarded: v.rewarded === true }; return { ...capabilities }; }) : Promise.resolve({ ...capabilities }); },
      showInterstitial: function (options) { return show("showInterstitial", options); },
      showRewarded: function (options) { return show("showRewarded", options); }
    },
    on: function (name, callback) { if (typeof callback !== "function") return function () {}; var set = listeners.get(name) || new Set(); set.add(callback); listeners.set(name, set); return function () { set.delete(callback); }; }
  };
  Object.defineProperty(window, "UniblexSDK", { value: sdk, writable: false, configurable: false });
})(window);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create2, deps);
        }
        function useInsertionEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create2, deps);
        }
        function useLayoutEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create2, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create2, deps);
        }
        function useImperativeHandle(ref, create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create2, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// .check-display.ts
import fs from "node:fs";

// src/lib/geometry.ts
var M_PER_DEG_LAT = 110574;
var mPerDegLng = (lat) => 111320 * Math.cos(lat * Math.PI / 180);
function ringAreaHa(coords) {
  const n = coords.length;
  if (n < 3) return 0;
  const [la0, lo0] = coords[0];
  const kx = mPerDegLng(la0);
  const pts = coords.map(([la, lo]) => [(lo - lo0) * kx, (la - la0) * M_PER_DEG_LAT]);
  let a = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 1e4;
}
function isDuplicateVhrParcel(a, b) {
  if (a.id === b.id) return true;
  if (!a.coords?.length || !b.coords?.length || a.areaHa <= 0 || b.areaHa <= 0) return false;
  const areaA = a.areaHa * 1e4;
  const areaB = b.areaHa * 1e4;
  const minArea = Math.min(areaA, areaB);
  const maxArea = Math.max(areaA, areaB);
  const areaRatio = minArea / maxArea;
  const degMargin = 25 / M_PER_DEG_LAT;
  const [[minLaA, minLoA], [maxLaA, maxLoA]] = bboxOf(a.coords);
  const [[minLaB, minLoB], [maxLaB, maxLoB]] = bboxOf(b.coords);
  if (minLaA > maxLaB + degMargin || maxLaA < minLaB - degMargin || minLoA > maxLoB + degMargin || maxLoA < minLoB - degMargin) {
    return false;
  }
  if (areaRatio >= 0.25) {
    if (pointInPolygon(a.centroid, b.coords) || pointInPolygon(b.centroid, a.coords)) {
      return true;
    }
  }
  const latitude = (a.centroid[0] + b.centroid[0]) / 2;
  const east = (a.centroid[1] - b.centroid[1]) * mPerDegLng(latitude);
  const north = (a.centroid[0] - b.centroid[0]) * M_PER_DEG_LAT;
  const centerDistM = Math.hypot(north, east);
  const centerToleranceM = Math.max(18, Math.min(45, Math.sqrt(maxArea) * 0.22));
  if (areaRatio >= 0.4 && centerDistM <= centerToleranceM) {
    return true;
  }
  return false;
}
function centroidOf(coords) {
  const n = coords.length;
  return [coords.reduce((s, c) => s + c[0], 0) / n, coords.reduce((s, c) => s + c[1], 0) / n];
}
function pointInPolygon(pt, poly) {
  const [y, x] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function bboxOf(coords) {
  let minLa = Infinity, minLo = Infinity, maxLa = -Infinity, maxLo = -Infinity;
  for (const [la, lo] of coords) {
    if (la < minLa) minLa = la;
    if (la > maxLa) maxLa = la;
    if (lo < minLo) minLo = lo;
    if (lo > maxLo) maxLo = lo;
  }
  return [[minLa, minLo], [maxLa, maxLo]];
}
function convexHull(points) {
  const p = points.map(([la, lo]) => [lo, la]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper].map(([lo, la]) => [la, lo]);
}
function scaleAround(poly, center, k) {
  return poly.map(([la, lo]) => [center[0] + (la - center[0]) * k, center[1] + (lo - center[1]) * k]);
}

// src/api/http.ts
var envLike = import.meta.env ?? globalThis.__AGRI_ENV__ ?? {};
var API_BASE = envLike.VITE_MALTO_API_URL?.replace(/\/+$/, "") ?? "";
var DEFAULT_TIMEOUT_MS = 12e4;
async function request(path, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const external = init.signal ?? null;
  const onAbort = () => ctrl.abort();
  if (external?.aborted) ctrl.abort();
  else external?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...init.body ? { "Content-Type": "application/json" } : null,
        ...init.headers
      }
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      const reason = detail?.detail ?? detail?.error;
      throw new Error(`Malto ${res.status} ${res.statusText}${reason ? ` \u2014 ${reason}` : ""}`);
    }
    return res.status === 204 ? void 0 : await res.json();
  } catch (err) {
    if (external?.aborted) throw new Error(`Requ\xEAte annul\xE9e : ${path}`);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Malto \u2014 d\xE9lai d\xE9pass\xE9 sur ${path} (${timeoutMs / 1e3}s).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

// src/data/constants.ts
var CULTURES = [
  { id: "orge", label: "Orge", color: "#E3B505", kind: "culture" },
  { id: "riz", label: "Riz", color: "#3E9B4F", kind: "culture" },
  { id: "haricot", label: "Haricot", color: "#3A6EDC", kind: "culture" },
  { id: "mais", label: "Ma\xEFs", color: "#E8793A", kind: "culture" },
  { id: "manioc", label: "Manioc", color: "#8C6A4F", kind: "culture" },
  { id: "pomme_de_terre", label: "Pomme de terre", color: "#B34FA0", kind: "culture" },
  { id: "autre", label: "Autre culture", color: "#7B5FC6", kind: "culture" },
  { id: "jachere", label: "Jach\xE8re", color: "#CDB892", kind: "couverture" },
  { id: "sol_nu", label: "Sol nu", color: "#A59D93", kind: "couverture" },
  { id: "vegetation", label: "V\xE9g\xE9tation naturelle", color: "#1E6B4B", kind: "couverture" },
  { id: "eau", label: "Eau", color: "#5BB9E6", kind: "couverture" },
  { id: "inconnue", label: "Inconnue", color: "#8A9199", kind: "couverture" }
];
var CULTURE_BY_ID = Object.fromEntries(CULTURES.map((c) => [c.id, c]));
var DEFAULT_COLORS = Object.fromEntries(CULTURES.map((c) => [c.id, c.color]));
var SEASONS = [
  { id: "2026-C", label: "2026 \xB7 Contre-saison (mai\u2013oct.)", short: "Contre-saison 2026", start: "2026-05-01", end: "2026-10-31", type: "C", modelVersion: "RF 1.1.0 / ResUNet 1.2.0", note: "Acquisition en cours" },
  { id: "2025-2026-P", label: "2025\u20132026 \xB7 Saison des pluies (nov.\u2013avr.)", short: "Pluies 2025\u201326", start: "2025-11-01", end: "2026-04-30", type: "P", modelVersion: "RF 1.1.0 / ResUNet 1.2.0" },
  { id: "2025-C", label: "2025 \xB7 Contre-saison (mai\u2013oct.)", short: "Contre-saison 2025", start: "2025-05-01", end: "2025-10-31", type: "C", modelVersion: "RF 0.9.2 / U-Net 0.9.0" },
  { id: "2024-2025-P", label: "2024\u20132025 \xB7 Saison des pluies (nov.\u2013avr.)", short: "Pluies 2024\u201325", start: "2024-11-01", end: "2025-04-30", type: "P", modelVersion: "RF 0.9.2 / U-Net 0.9.0" }
];
var SEASON_BY_ID = Object.fromEntries(SEASONS.map((s) => [s.id, s]));
var DEFAULT_SEASON = "2026-C";
var CURRENT_MODEL = "RF 1.1.0 / ResUNet 1.2.0";
var PIPELINE_STEPS = [
  "R\xE9cup\xE9ration des images Sentinel-2 et Sentinel-1",
  "Masquage des nuages et ombres",
  "Composites temporels et indices de v\xE9g\xE9tation",
  "D\xE9coupage en tuiles g\xE9or\xE9f\xE9renc\xE9es",
  "Segmentation des parcelles (ResUNet)",
  "Vectorisation et contr\xF4le des g\xE9om\xE9tries",
  "Classification des cultures (Random Forest)",
  "Enregistrement et publication des r\xE9sultats"
];
var ROLES = {
  admin: {
    label: "Administrateur",
    description: "Comptes, r\xF4les, param\xE8tres, mod\xE8les et journaux.",
    can: { correct: true, observe: true, launch: true, export: true, admin: true, models: true, analyses: true }
  },
  analyste: {
    label: "Analyste SIG/agricole",
    description: "Lance les analyses, valide les parcelles, exporte.",
    can: { correct: true, observe: true, launch: true, export: true, admin: false, models: true, analyses: true }
  },
  terrain: {
    label: "Agent de terrain",
    description: "Saisit et v\xE9rifie les cultures observ\xE9es.",
    can: { correct: false, observe: true, launch: false, export: false, admin: false, models: false, analyses: false }
  },
  lecteur: {
    label: "Utilisateur lecteur",
    description: "Consulte la carte, filtre et t\xE9l\xE9charge les exports autoris\xE9s.",
    can: { correct: false, observe: false, launch: false, export: true, admin: false, models: false, analyses: false }
  },
  gestionnaire: {
    label: "Gestionnaire de projet",
    description: "Suit les analyses, la qualit\xE9 et la couverture.",
    can: { correct: false, observe: false, launch: false, export: true, admin: false, models: true, analyses: true }
  }
};
var AREA_MAX = 10;

// src/api/maltoAdapter.ts
var CULTURE_MAP = {
  "orge": "orge",
  "barley": "orge",
  "riz": "riz",
  "rice": "riz",
  "paddy": "riz",
  "haricot": "haricot",
  "bean": "haricot",
  "haricots": "haricot",
  "ma\xEFs": "mais",
  "mais": "mais",
  "corn": "mais",
  "maize": "mais",
  "manioc": "manioc",
  "cassava": "manioc",
  "pomme de terre": "pomme_de_terre",
  "potato": "pomme_de_terre",
  "pdt": "pomme_de_terre",
  "jach\xE8re": "jachere",
  "jachere": "jachere",
  "fallow": "jachere",
  "sol nu": "sol_nu",
  "bare": "sol_nu",
  "bare soil": "sol_nu",
  "v\xE9g\xE9tation": "vegetation",
  "vegetation": "vegetation",
  "eau": "eau",
  "water": "eau",
  "unknown": "inconnue",
  "inconnue": "inconnue"
};
function mapCulture(raw) {
  if (!raw) return "inconnue";
  return CULTURE_MAP[raw.trim().toLowerCase()] ?? "autre";
}
function orgeProbFromVerdict(verdict) {
  if (!verdict) return null;
  const m = verdict.match(/probabilit[ée]\s*d['’]orge\s*(\d+(?:[.,]\d+)?)\s*%/i);
  return m ? Number(m[1].replace(",", ".")) / 100 : null;
}
function isNonOrge(p) {
  const raw = (p.culture_detected ?? "").toLowerCase();
  return raw.includes("non-orge") || raw.includes("non orge");
}
function mapConfidence(p) {
  const declared = (p.culture_detected ?? "").trim() !== "";
  if (!declared) return 0.05;
  let conf = p.confidence ?? orgeProbFromVerdict(p.verdict);
  if (conf == null) conf = p.ndvi_percentage != null ? p.ndvi_percentage / 100 : 0.5;
  else if (conf > 1) conf /= 100;
  return Math.min(0.99, Math.max(0.05, conf));
}
function mapStatus(p, conf) {
  const v = (p.verdict ?? "").toLowerCase();
  if (v.includes("valid\xE9") || v.includes("valide") || v.includes("terrain")) return "verifie_terrain";
  if (v.includes("corrig")) return "corrige";
  if (v.includes("obsol")) return "obsolete";
  if (conf < 0.5) return "incertain";
  return "non_verifie";
}
function mapSeason(raw) {
  const s = raw?.trim() ?? "";
  if (s && SEASON_BY_ID[s]) return { id: s, stage: s };
  return { id: DEFAULT_SEASON, stage: s };
}
var EMPTY_CULTURE_LABELS = /* @__PURE__ */ new Set(["", "inconnue", "inconnu", "unknown", "non d\xE9termin\xE9", "non determine", "n/a"]);
function mapCultureDetail(p) {
  const declared = p.culture_declared?.trim() || null;
  const detected = p.culture_detected?.trim() || null;
  const declaredCulture = declared && !EMPTY_CULTURE_LABELS.has(declared.toLowerCase()) ? declared : null;
  const hasCulture = Boolean(
    detected || declaredCulture || p.ndvi_percentage != null || p.confidence != null
  );
  if (!hasCulture) return void 0;
  const timeSeries = (p.time_series_s2 ?? []).flatMap((point) => {
    const date = typeof point?.date === "string" ? point.date.trim() : "";
    if (!date) return [];
    return [{ date, ndvi: typeof point.ndvi === "number" ? point.ndvi : null }];
  });
  return {
    declared: declaredCulture,
    detected,
    confidence: p.confidence ?? null,
    verdict: p.verdict ?? null,
    details: p.details ?? null,
    ndvi: p.ndvi_percentage ?? null,
    ndre: p.ndre ?? null,
    evi: p.evi ?? null,
    savi: p.savi ?? null,
    ndwi: p.ndwi ?? null,
    spectralBands: p.spectral_bands ?? null,
    seasonLabel: p.saison ?? null,
    growthStage: p.growth_stage ?? null,
    plantingDate: p.estimated_planting_date ?? null,
    harvestDate: p.estimated_harvest_date ?? null,
    daysSincePlanting: p.days_since_planting ?? null,
    plantingConfidence: p.planting_confidence ?? null,
    soilType: p.soil_type ?? null,
    riskFactors: p.risk_factors ?? [],
    recommendations: p.recommendations ?? null,
    ownerName: p.owner_name ?? null,
    notes: p.notes ?? null,
    source: p.data_source ?? null,
    timeSeries,
    agroScore: p.agro_score ?? null,
    hybridScore: p.hybrid_score ?? null,
    cnnProbBarley: p.cnn_prob_barley ?? null,
    cnnProbNonBarley: p.cnn_prob_non_barley ?? null,
    createdAt: p.created_at ?? null
  };
}
function maltoToFrontend(parcels2, zones) {
  return parcels2.filter((p) => Array.isArray(p.coordinates) && p.coordinates.length >= 3).map((p) => {
    const coords = (p.coordinates ?? []).map((c) => [c.lat, c.lng]);
    const centroid = p.center_lat != null && p.center_lng != null ? [p.center_lat, p.center_lng] : avgPoint(coords);
    const season = mapSeason(p.saison);
    const isBarley = !isNonOrge(p);
    const culture = !isBarley ? "autre" : (p.culture_detected ?? "").trim() !== "" ? "orge" : mapCulture(p.culture_declared) || "inconnue";
    const conf = mapConfidence(p);
    const processedAt = p.created_at || (/* @__PURE__ */ new Date()).toISOString();
    const result = {
      seasonId: season.id,
      culture,
      confidence: conf,
      probs: { [culture]: conf },
      status: mapStatus(p, conf),
      analysisId: `MALTO-${p.id.slice(0, 8)}`,
      modelVersion: `Malto FTW${season.stage !== season.id ? ` \xB7 ${season.stage}` : ""} (RF ${CURRENT_MODEL.includes("RF") ? CURRENT_MODEL : ""})`.trim(),
      processedAt,
      observedFrom: processedAt.slice(0, 10),
      observedTo: processedAt.slice(0, 10)
    };
    let regionId = "";
    let communeId = "";
    if (zones) {
      regionId = zones.regions.find((r) => pointInPolygon(centroid, r.outline))?.id ?? "";
      communeId = zones.communes.find((c) => pointInPolygon(centroid, c.outline))?.id ?? "";
    }
    const areaHa = p.surface_ha && p.surface_ha > 0 ? p.surface_ha : ringAreaHa(coords);
    return {
      id: p.id,
      communeId,
      regionId,
      coords,
      centroid,
      areaHa,
      detectionConfidence: conf,
      createdAt: processedAt,
      results: { [season.id]: result },
      corrections: [],
      dataSource: p.data_source ?? void 0,
      cultureDetail: mapCultureDetail(p),
      rejected: false
    };
  });
}
function avgPoint(coords) {
  if (!coords.length) return [0, 0];
  let x = 0;
  let y = 0;
  for (const [a, b] of coords) {
    x += a;
    y += b;
  }
  return [x / coords.length, y / coords.length];
}
function maltoVhrToFrontend(features, zones, idPrefix = "") {
  return features.map((f) => {
    let ring = [];
    if (f.geometry?.type === "Polygon") {
      ring = f.geometry.coordinates[0] ?? [];
    } else if (f.geometry?.type === "MultiPolygon") {
      const polygons = f.geometry.coordinates;
      ring = polygons.flat().reduce((best, r) => r.length > best.length ? r : best, []);
    }
    const coords = ring.map(([lng, lat]) => [lat, lng]);
    if (coords.length < 3) return null;
    const centroid = avgPoint(coords);
    const rawConf = f.properties.confidence != null ? f.properties.confidence : 50;
    const conf = Math.min(0.99, Math.max(0.01, rawConf > 1 ? rawConf / 100 : rawConf));
    const processedAt = (/* @__PURE__ */ new Date()).toISOString();
    const result = {
      seasonId: DEFAULT_SEASON,
      culture: "inconnue",
      // pas de classification de culture sur les tracés VHR
      confidence: conf,
      probs: { inconnue: conf },
      status: "incertain",
      // équiv. « non classé » (contours pointillés, REC-09)
      analysisId: "MALTO-VHR",
      modelVersion: `Delineate Anything${f.properties.source ? ` \xB7 ${f.properties.source}` : ""}`,
      processedAt,
      observedFrom: processedAt.slice(0, 10),
      observedTo: processedAt.slice(0, 10)
    };
    let regionId = "";
    let communeId = "";
    if (zones) {
      regionId = zones.regions.find((r) => pointInPolygon(centroid, r.outline))?.id ?? "";
      communeId = zones.communes.find((c) => pointInPolygon(centroid, c.outline))?.id ?? "";
    }
    const p = {
      // Le modèle redémarre sa numérotation (VHR-0001, …) à chaque requête.
      // Préfixer avec la tuile empêche le store de confondre deux parcelles distinctes.
      id: f.properties.parcel_id ? `${idPrefix ? `${idPrefix}-` : ""}${f.properties.parcel_id}` : `${idPrefix ? `${idPrefix}-` : "VHR-"}${Math.random().toString(36).slice(2, 10)}`,
      communeId,
      regionId,
      coords,
      centroid,
      areaHa: f.properties.area_ha ?? ringAreaHa(coords),
      detectionConfidence: conf,
      createdAt: processedAt,
      results: { [DEFAULT_SEASON]: result },
      corrections: [],
      rejected: false
    };
    return p;
  }).filter((p) => p !== null);
}

// src/lib/filter.ts
function baseFilter(parcels2, f, zone) {
  const out = [];
  for (const p of parcels2) {
    if (p.rejected) continue;
    if (f.regionId && p.regionId !== f.regionId) continue;
    if (f.communeId && p.communeId !== f.communeId) continue;
    const r = p.results[f.seasonId];
    if (!r) continue;
    if (f.dateFrom && r.processedAt.slice(0, 10) < f.dateFrom) continue;
    if (f.dateTo && r.processedAt.slice(0, 10) > f.dateTo) continue;
    if (p.areaHa < f.areaMin) continue;
    if (f.areaMax < AREA_MAX && p.areaHa > f.areaMax) continue;
    if (r.confidence * 100 < f.confMin) continue;
    if (f.statuses.length && !f.statuses.includes(r.status)) continue;
    if (zone && !pointInPolygon(p.centroid, zone)) continue;
    out.push({ p, r });
  }
  return out;
}

// node_modules/zustand/esm/vanilla.mjs
var createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api2 = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api2);
  return api2;
};
var createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;

// node_modules/zustand/esm/react.mjs
var import_react = __toESM(require_react(), 1);
var identity = (arg) => arg;
function useStore(api2, selector = identity) {
  const slice = import_react.default.useSyncExternalStore(
    api2.subscribe,
    import_react.default.useCallback(() => selector(api2.getState()), [api2, selector]),
    import_react.default.useCallback(() => selector(api2.getInitialState()), [api2, selector])
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
var createImpl = (createState) => {
  const api2 = createStore(createState);
  const useBoundStore = (selector) => useStore(api2, selector);
  Object.assign(useBoundStore, api2);
  return useBoundStore;
};
var create = (createState) => createState ? createImpl(createState) : createImpl;

// node_modules/zustand/esm/middleware.mjs
function createJSONStorage(getStorage, options) {
  let storage;
  try {
    storage = getStorage();
  } catch (e) {
    return;
  }
  const persistStorage = {
    getItem: (name) => {
      var _a;
      const parse = (str2) => {
        if (str2 === null) {
          return null;
        }
        return JSON.parse(str2, options == null ? void 0 : options.reviver);
      };
      const str = (_a = storage.getItem(name)) != null ? _a : null;
      if (str instanceof Promise) {
        return str.then(parse);
      }
      return parse(str);
    },
    setItem: (name, newValue) => storage.setItem(name, JSON.stringify(newValue, options == null ? void 0 : options.replacer)),
    removeItem: (name) => storage.removeItem(name)
  };
  return persistStorage;
}
var toThenable = (fn) => (input) => {
  try {
    const result = fn(input);
    if (result instanceof Promise) {
      return result;
    }
    return {
      then(onFulfilled) {
        return toThenable(onFulfilled)(result);
      },
      catch(_onRejected) {
        return this;
      }
    };
  } catch (e) {
    return {
      then(_onFulfilled) {
        return this;
      },
      catch(onRejected) {
        return toThenable(onRejected)(e);
      }
    };
  }
};
var persistImpl = (config, baseOptions) => (set, get, api2) => {
  let options = {
    storage: createJSONStorage(() => window.localStorage),
    partialize: (state) => state,
    version: 0,
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...persistedState
    }),
    ...baseOptions
  };
  let hasHydrated = false;
  let hydrationVersion = 0;
  const hydrationListeners = /* @__PURE__ */ new Set();
  const finishHydrationListeners = /* @__PURE__ */ new Set();
  let storage = options.storage;
  if (!storage) {
    return config(
      (...args) => {
        console.warn(
          `[zustand persist middleware] Unable to update item '${options.name}', the given storage is currently unavailable.`
        );
        set(...args);
      },
      get,
      api2
    );
  }
  const setItem = () => {
    const state = options.partialize({ ...get() });
    return storage.setItem(options.name, {
      state,
      version: options.version
    });
  };
  const savedSetState = api2.setState;
  api2.setState = (state, replace) => {
    savedSetState(state, replace);
    return setItem();
  };
  const configResult = config(
    (...args) => {
      set(...args);
      return setItem();
    },
    get,
    api2
  );
  api2.getInitialState = () => configResult;
  let stateFromStorage;
  const hydrate = () => {
    var _a, _b;
    if (!storage) return;
    const currentVersion = ++hydrationVersion;
    hasHydrated = false;
    hydrationListeners.forEach((cb) => {
      var _a2;
      return cb((_a2 = get()) != null ? _a2 : configResult);
    });
    const postRehydrationCallback = ((_b = options.onRehydrateStorage) == null ? void 0 : _b.call(options, (_a = get()) != null ? _a : configResult)) || void 0;
    return toThenable(storage.getItem.bind(storage))(options.name).then((deserializedStorageValue) => {
      if (deserializedStorageValue) {
        if (typeof deserializedStorageValue.version === "number" && deserializedStorageValue.version !== options.version) {
          if (options.migrate) {
            const migration = options.migrate(
              deserializedStorageValue.state,
              deserializedStorageValue.version
            );
            if (migration instanceof Promise) {
              return migration.then((result) => [true, result]);
            }
            return [true, migration];
          }
          console.error(
            `State loaded from storage couldn't be migrated since no migrate function was provided`
          );
        } else {
          return [false, deserializedStorageValue.state];
        }
      }
      return [false, void 0];
    }).then((migrationResult) => {
      var _a2;
      if (currentVersion !== hydrationVersion) {
        return;
      }
      const [migrated, migratedState] = migrationResult;
      stateFromStorage = options.merge(
        migratedState,
        (_a2 = get()) != null ? _a2 : configResult
      );
      set(stateFromStorage, true);
      if (migrated) {
        return setItem();
      }
    }).then(() => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(get(), void 0);
      stateFromStorage = get();
      hasHydrated = true;
      finishHydrationListeners.forEach((cb) => cb(stateFromStorage));
    }).catch((e) => {
      if (currentVersion !== hydrationVersion) {
        return;
      }
      postRehydrationCallback == null ? void 0 : postRehydrationCallback(void 0, e);
    });
  };
  api2.persist = {
    setOptions: (newOptions) => {
      options = {
        ...options,
        ...newOptions
      };
      if (newOptions.storage) {
        storage = newOptions.storage;
      }
    },
    clearStorage: () => {
      ++hydrationVersion;
      storage == null ? void 0 : storage.removeItem(options.name);
    },
    getOptions: () => options,
    rehydrate: () => hydrate(),
    hasHydrated: () => hasHydrated,
    onHydrate: (cb) => {
      hydrationListeners.add(cb);
      return () => {
        hydrationListeners.delete(cb);
      };
    },
    onFinishHydration: (cb) => {
      finishHydrationListeners.add(cb);
      return () => {
        finishHydrationListeners.delete(cb);
      };
    }
  };
  if (!options.skipHydration) {
    hydrate();
  }
  return stateFromStorage || configResult;
};
var persist = persistImpl;

// src/lib/parcel-sources.ts
var MANUAL_PARCEL_SOURCE = "Trac\xE9 manuel";
var REJECTED_PARCEL_SOURCE = "Trac\xE9 automatique supprim\xE9";
function isManualParcel(parcel) {
  return parcel.dataSource === MANUAL_PARCEL_SOURCE;
}
function isAutomaticOutline(parcel) {
  return Object.values(parcel.results).some((result) => result.modelVersion.includes("Delineate Anything"));
}

// src/api/realBootstrap.ts
function deriveZones(parcels2) {
  const centroids = parcels2.filter((p) => !p.rejected).map((p) => p.centroid);
  if (!centroids.length) return { regions: [], communes: [] };
  const hull = convexHull(centroids);
  const ctr = centroidOf(hull);
  const region = {
    id: "malto-zone",
    name: "Zone Malto (Vakinankaratra)",
    center: ctr,
    outline: scaleAround(hull, ctr, 1.12)
  };
  const commune = {
    id: "malto-antsirabe",
    regionId: region.id,
    name: "Antsirabe \u2014 donn\xE9es Malto",
    code: "MALTO",
    center: ctr,
    outline: scaleAround(hull, ctr, 1.06),
    coverage: "analysee",
    imageDate: null,
    cloudCover: 0
  };
  return { regions: [region], communes: [commune] };
}
function assignZones(parcels2, regions, communes) {
  return parcels2.map((p) => ({
    ...p,
    regionId: regions[0]?.id ?? "",
    communeId: communes[0]?.id ?? ""
  }));
}
var PARCELLES_TIMEOUT_MS = 12e4;
async function bootstrapReal() {
  if (!maltoConfigured()) {
    console.warn("[AgriSat] VITE_MALTO_API_URL non d\xE9fini \u2014 aucune donn\xE9e affich\xE9e (backend non configur\xE9).");
    return { regions: [], communes: [], parcels: [], rejectedParcels: [], analyses: [], users: [], audit: [] };
  }
  const rows2 = await request("/api/parcelles", {}, PARCELLES_TIMEOUT_MS);
  const kept = [];
  const rejectedParcels = [];
  for (const row of rows2) {
    if (row.data_source !== REJECTED_PARCEL_SOURCE) {
      kept.push(row);
      continue;
    }
    const coords = (row.coordinates ?? []).map((c) => [c.lat, c.lng]);
    if (coords.length < 3) continue;
    const centroid = row.center_lat != null && row.center_lng != null ? [row.center_lat, row.center_lng] : centroidOf(coords);
    rejectedParcels.push({
      id: row.id,
      coords,
      centroid,
      areaHa: row.surface_ha && row.surface_ha > 0 ? row.surface_ha : ringAreaHa(coords),
      at: row.created_at ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const ftw = maltoToFrontend(kept);
  const zones = deriveZones(ftw);
  const parcels2 = assignZones(ftw, zones.regions, zones.communes);
  console.info(`[AgriSat] Donn\xE9es r\xE9elles : ${parcels2.length} parcelles enregistr\xE9es, ${zones.regions.length} r\xE9gion(s), ${zones.communes.length} commune(s).`);
  return {
    regions: zones.regions,
    communes: zones.communes,
    parcels: parcels2,
    rejectedParcels,
    analyses: [],
    users: [],
    audit: []
  };
}

// src/api/services.ts
var maltoConfigured = () => API_BASE.length > 0;
var api = {
  /**
   * Charge les données réelles de la base au démarrage (aucune donnée fictive).
   *
   * L'échec est propagé : une base momentanément indisponible ne doit pas ressembler
   * à une base vide (carte sans parcelle, compteurs à zéro). L'appelant affiche
   * l'erreur et propose de réessayer.
   */
  async bootstrap() {
    return bootstrapReal();
  },
  /** Malto n'expose pas encore de route d'export — simulation locale conservée. */
  async createExport(format) {
    if (maltoConfigured()) {
      try {
        return await request("/api/exports", { method: "POST", body: JSON.stringify({ format }) });
      } catch (err) {
        console.warn("[AgriSat] Export via Malto indisponible, simulation locale :", err);
      }
    }
    await wait(EXPORT_FALLBACK_MS);
    return { id: `EX-${Date.now().toString(36).toUpperCase()}`, url: "" };
  },
  /** Inventaire des modèles IA réellement déployés (RF orge + délimitation VHR). */
  async getDeployedModels() {
    return request("/api/modeles");
  },
  /** Analyse simple (modèles IA Malto : classification RF orge + traitement Sentinel-2). */
  async analyzeSimple(payload) {
    return request("/api/analyze", {
      method: "POST",
      body: JSON.stringify(payload)
    }, ANALYZE_TIMEOUT_MS);
  },
  /** Détection automatique de parcelles (GDD + base parcelles). */
  async detectParcels(payload) {
    return request("/api/detect-parcels", {
      method: "POST",
      body: JSON.stringify(payload)
    }, DETECT_PARCELS_TIMEOUT_MS);
  },
  /**
   * Analyse **une seule** parcelle (bouton « Analyser » de la fiche parcel).
   *
   * Le contour transmis est le seul objet analysé : les parcelles voisines ne sont
   * ni cherchées ni modifiées. Le résultat est enregistré en base ; une parcelle
   * déjà analysée conserve ses données (le serveur répond 409) sauf si
   * `force` est demandé (relance explicite de l'utilisateur).
   */
  async analyzeParcel(payload) {
    return request("/api/parcelles/analyze", {
      method: "POST",
      body: JSON.stringify(payload)
    }, ANALYZE_PARCEL_TIMEOUT_MS);
  },
  /**
   * Tracés VHR (modèle Delineate Anything JECAM) — délimitation automatique de parcelles.
   * `signal` permet d'annuler la requête (démontage, changement de zone).
   */
  async zoneParcels(payload, signal) {
    return request("/api/zone-parcels", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: signal ?? null
    }, ZONE_PARCELS_TIMEOUT_MS);
  },
  /** Enregistre dans Malto une parcelle dessinée manuellement sur la carte. */
  async createParcel(payload) {
    return request("/api/parcelles", {
      method: "POST",
      body: JSON.stringify(payload)
    }, 3e4);
  },
  /** Supprime définitivement une parcelle enregistrée (ligne de la table `parcelles`). */
  async deleteParcel(id) {
    await request(`/api/parcelles/${encodeURIComponent(id)}`, { method: "DELETE" }, 3e4);
  },
  /**
   * Supprime uniquement la culture d'une parcelle : le contour, la superficie et
   * l'identité de la parcelle restent en base et sur la carte.
   */
  async deleteParcelCulture(id) {
    await request(`/api/parcelles/${encodeURIComponent(id)}/culture`, { method: "DELETE" }, 3e4);
  },
  /** Route absente côté Malto — simulation locale conservée. */
  async reportParcel(id, message) {
    if (!maltoConfigured()) {
      await wait(EXPORT_REPORT_FALLBACK_MS);
      return;
    }
    try {
      await request(`/api/parcelles/${encodeURIComponent(id)}/signalements`, {
        method: "POST",
        body: JSON.stringify({ message })
      });
    } catch (err) {
      console.warn("[AgriSat] Signalement non envoy\xE9 (route Malto absente) :", err);
    }
  },
  /** Modifie une parcelle (correction humaine de la culture détectée). */
  async correctParcelle(id, payload) {
    return request(`/api/parcelles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }, 3e4);
  },
  /** Envoie une entrée d'audit au backend. */
  async logAudit(payload) {
    return request("/api/audit", {
      method: "POST",
      body: JSON.stringify(payload)
    }, 3e4);
  },
  /** Liste les entrées d'audit récentes. */
  async getAudit() {
    return request("/api/audit");
  }
};
var wait = (ms) => new Promise((r) => setTimeout(r, ms));
var EXPORT_FALLBACK_MS = 700;
var EXPORT_REPORT_FALLBACK_MS = 400;
var ANALYZE_TIMEOUT_MS = 24e4;
var DETECT_PARCELS_TIMEOUT_MS = 6e5;
var ANALYZE_PARCEL_TIMEOUT_MS = 24e4;
var ZONE_PARCELS_TIMEOUT_MS = 6e5;

// src/lib/rejections.ts
var MAX_CENTROID_DISTANCE_M = 8;
var MIN_AREA_RATIO = 0.5;
function rejectionFromParcel(parcel) {
  return {
    id: parcel.id,
    coords: parcel.coords.map(([lat, lng]) => [lat, lng]),
    centroid: [parcel.centroid[0], parcel.centroid[1]],
    areaHa: parcel.areaHa,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function isRejectedParcel(parcel, rejections) {
  return rejections.some((rejection) => {
    if (rejection.id === parcel.id) return true;
    const maxArea = Math.max(rejection.areaHa, parcel.areaHa);
    const minArea = Math.min(rejection.areaHa, parcel.areaHa);
    if (maxArea <= 0 || minArea / maxArea < MIN_AREA_RATIO) return false;
    const latitude = (rejection.centroid[0] + parcel.centroid[0]) / 2;
    const east = (rejection.centroid[1] - parcel.centroid[1]) * mPerDegLng(latitude);
    const north = (rejection.centroid[0] - parcel.centroid[0]) * M_PER_DEG_LAT;
    return Math.hypot(east, north) <= MAX_CENTROID_DISTANCE_M;
  });
}
function addRejection(rejections, parcel) {
  if (isRejectedParcel(parcel, rejections)) return rejections;
  return [...rejections, rejectionFromParcel(parcel)];
}
function mergeRejections(local, fromServer) {
  return fromServer.reduce((acc, rejection) => {
    if (isRejectedParcel(rejection, acc)) return acc;
    return [...acc, rejection];
  }, local);
}
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isDatabaseParcelId(id) {
  return UUID_RE.test(id);
}

// src/lib/analysis-parcels.ts
var MAX_ANALYSIS_PARCELS = 500;
var RADIUS_MARGIN_M = 300;
function isAnalyzedParcel(parcel) {
  const detail = parcel.cultureDetail;
  if (detail) {
    if (detail.detected && detail.detected.trim()) return true;
    if (detail.ndvi != null || detail.confidence != null) return true;
  }
  return Object.values(parcel.results).some((result) => result.culture !== "inconnue");
}
function analyzedParcelIds(parcels2) {
  return new Set(parcels2.filter(isAnalyzedParcel).map((parcel) => parcel.id));
}
function parcelsForAnalysis(parcels2, scope, rejections = []) {
  const maxDistanceM = scope.radiusM + RADIUS_MARGIN_M;
  return parcels2.flatMap((parcel) => {
    const manual = isManualParcel(parcel);
    if (parcel.rejected) return [];
    if (!manual && isRejectedParcel(parcel, rejections)) return [];
    if (!manual && !isAutomaticOutline(parcel)) return [];
    if (isAnalyzedParcel(parcel)) return [];
    if (scope.zone && scope.zone.length >= 3) {
      if (!pointInPolygon(parcel.centroid, scope.zone)) return [];
    }
    const east = (parcel.centroid[1] - scope.lng) * mPerDegLng(scope.lat);
    const north = (parcel.centroid[0] - scope.lat) * M_PER_DEG_LAT;
    const distanceM = Math.hypot(east, north);
    if (distanceM > maxDistanceM) return [];
    return [{ parcel, distanceM }];
  }).sort((a, b) => a.distanceM - b.distanceM).slice(0, scope.limit ?? MAX_ANALYSIS_PARCELS).map(({ parcel }) => parcel);
}
function toTracedParcelInput(parcel) {
  return {
    coordinates: parcel.coords.map(([lat, lng]) => ({ lat, lng }))
  };
}

// src/store/useApp.ts
var DEFAULT_FILTERS = {
  cultures: [],
  mode: "general",
  othersStyle: "grise",
  regionId: null,
  communeId: null,
  seasonId: DEFAULT_SEASON,
  dateFrom: "",
  dateTo: "",
  areaMin: 0,
  areaMax: AREA_MAX,
  confMin: 0,
  statuses: []
};
var toastSeq = 1;
var flySeq = 1;
var rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
var useApp = create()(
  persist(
    (set, get) => ({
      ready: false,
      loadError: null,
      parcels: [],
      regions: [],
      communes: [],
      analyses: [],
      users: [],
      audit: [],
      user: null,
      colors: { ...DEFAULT_COLORS },
      colorsByUser: {},
      threshold: 0.55,
      basemap: "satellite",
      showCoverage: true,
      filters: DEFAULT_FILTERS,
      selectedId: null,
      fly: null,
      filtersOpen: false,
      setFiltersOpen: (v) => set({ filtersOpen: v }),
      drawing: false,
      drawMode: "zone",
      draft: [],
      zone: null,
      manualParcelDraft: null,
      analyzingParcelId: null,
      toasts: [],
      traceInfo: null,
      rejectedParcels: [],
      automaticDetection: null,
      automaticSearchCenter: null,
      selectedAutomaticParcelId: null,
      editingParcelId: null,
      editingCoords: null,
      init: async () => {
        if (get().ready) return;
        await get().reload();
      },
      reload: async () => {
        set({ loadError: null });
        let db;
        try {
          db = await api.bootstrap();
        } catch (error) {
          console.error("[AgriSat] Chargement de la base impossible :", error);
          set({
            ready: true,
            loadError: error instanceof Error ? error.message : String(error)
          });
          return;
        }
        let audit = [];
        try {
          const remoteAudit = await api.getAudit();
          audit = remoteAudit.map((a) => ({
            id: a.id,
            at: a.at,
            userName: a.user_name,
            action: a.action,
            object: a.object
          }));
        } catch (err) {
          console.warn("[AgriSat] \xC9chec du chargement de l'audit :", err);
        }
        const rejectedParcels = mergeRejections(get().rejectedParcels, db.rejectedParcels);
        set({
          // Filet de sécurité si la suppression serveur avait échoué : un contour
          // automatique retiré ne réapparaît pas. Les parcelles manuelles sont
          // conservées telles quelles (l'utilisateur peut redessiner au même endroit).
          parcels: db.parcels.filter((p) => isManualParcel(p) || !isRejectedParcel(p, rejectedParcels)),
          regions: db.regions,
          communes: db.communes,
          analyses: db.analyses,
          users: db.users,
          audit,
          rejectedParcels,
          ready: true
        });
        if (!get().user) get().login("analyste");
      },
      login: (role) => {
        const s = get();
        let u = s.users.find((x) => x.role === role && x.active) ?? { id: `local-${role}`, name: `Session ${role}`, email: "", role, active: true, lastLogin: (/* @__PURE__ */ new Date()).toISOString() };
        if (!s.users.some((x) => x.id === u.id)) {
          set((st) => ({ users: [u, ...st.users] }));
        }
        set((s2) => ({ user: u, colors: s2.colorsByUser[u.id] ?? { ...DEFAULT_COLORS } }));
        get().logAudit("Connexion", "Session");
      },
      logout: () => set({ user: null, selectedId: null }),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, seasonId: s.filters.seasonId }, zone: null })),
      toggleCulture: (id) => set((s) => {
        const has = s.filters.cultures.includes(id);
        const cultures = has ? s.filters.cultures.filter((c) => c !== id) : [...s.filters.cultures, id];
        let mode = s.filters.mode;
        if (cultures.length === 0) mode = "general";
        else if (mode === "general") mode = "filtre";
        return { filters: { ...s.filters, cultures, mode } };
      }),
      setColor: (id, color) => set((s) => {
        const colors = { ...s.colors, [id]: color };
        return { colors, colorsByUser: s.user ? { ...s.colorsByUser, [s.user.id]: colors } : s.colorsByUser };
      }),
      resetColors: () => set((s) => ({
        colors: { ...DEFAULT_COLORS },
        colorsByUser: s.user ? { ...s.colorsByUser, [s.user.id]: { ...DEFAULT_COLORS } } : s.colorsByUser
      })),
      setThreshold: (v) => set({ threshold: v }),
      setBasemap: (b) => set({ basemap: b }),
      setShowCoverage: (v) => set({ showCoverage: v }),
      // Changer de sélection (ou fermer la fiche) met fin à une édition en cours.
      select: (id) => set((s) => ({
        selectedId: id,
        ...s.editingParcelId && s.editingParcelId !== id ? { editingParcelId: null, editingCoords: null } : {}
      })),
      flyTo: (t) => set({ fly: { ...t, nonce: flySeq++ } }),
      startEditParcel: (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        if (!s.user || !ROLES[s.user.role].can.correct) {
          s.toast("Votre profil ne permet pas de modifier le contour d\u2019une parcelle.", "warn");
          return;
        }
        set({
          selectedId: id,
          editingParcelId: id,
          editingCoords: parcel.coords.map(([lat, lng]) => [lat, lng])
        });
      },
      setEditingCoords: (coords) => set({ editingCoords: coords }),
      cancelEditParcel: () => {
        set({ editingParcelId: null, editingCoords: null });
        get().toast("\xC9dition annul\xE9e \u2014 contour inchang\xE9.", "info");
      },
      saveEditParcel: () => {
        const s = get();
        const id = s.editingParcelId;
        const coords = s.editingCoords;
        if (!id || !coords) return;
        if (coords.length < 3) {
          s.toast("Le contour doit compter au moins 3 sommets.", "warn");
          return;
        }
        const before = s.parcels.find((p) => p.id === id);
        if (!before) {
          set({ editingParcelId: null, editingCoords: null });
          return;
        }
        const centroid = centroidOf(coords);
        const areaHa = ringAreaHa(coords);
        set({
          parcels: s.parcels.map((p) => p.id === id ? { ...p, coords, centroid, areaHa } : p),
          editingParcelId: null,
          editingCoords: null
        });
        get().logAudit("Modification du contour", `Parcelle ${id}`);
        get().toast(
          `Contour de ${id} mis \xE0 jour : ${before.areaHa.toFixed(2)} \u2192 ${areaHa.toFixed(2)} ha.`,
          "ok"
        );
      },
      startDraw: () => set({ drawing: true, drawMode: "zone", draft: [], manualParcelDraft: null, selectedId: null }),
      startParcelDraw: () => set({ drawing: true, drawMode: "parcel", draft: [], manualParcelDraft: null, selectedId: null }),
      addDraftPoint: (p) => set((s) => ({ draft: [...s.draft, p] })),
      undoDraft: () => set((s) => ({ draft: s.draft.slice(0, -1) })),
      finishDraw: () => {
        const { draft, drawMode } = get();
        if (draft.length < 3) {
          get().toast("Placez au moins 3 points pour fermer le contour.", "warn");
          return;
        }
        if (drawMode === "parcel") {
          set({ manualParcelDraft: draft, draft: [], drawing: false });
          return;
        }
        set({ zone: draft, draft: [], drawing: false });
        get().toast("Zone d\u2019\xE9tude cr\xE9\xE9e. Les filtres et statistiques s\u2019y limitent.", "ok");
      },
      cancelDraw: () => set((s) => ({ drawing: false, draft: [], manualParcelDraft: s.drawMode === "parcel" ? null : s.manualParcelDraft })),
      clearManualParcelDraft: () => set({ manualParcelDraft: null }),
      addManualParcel: (parcel) => set((s) => ({
        parcels: [parcel, ...s.parcels.filter((p) => !isDuplicateVhrParcel(p, parcel))],
        selectedId: parcel.id,
        manualParcelDraft: null
      })),
      setZone: (z) => set({ zone: z }),
      addTracedParcels: (added, info) => {
        const known = [...get().parcels];
        const rejections = get().rejectedParcels;
        const fresh = [];
        for (const candidate of added) {
          if (isRejectedParcel(candidate, rejections)) continue;
          if (known.some((parcel) => isDuplicateVhrParcel(parcel, candidate))) continue;
          fresh.push(candidate);
          known.push(candidate);
        }
        set((s) => ({ parcels: [...s.parcels, ...fresh], traceInfo: { ...info, added: fresh.length } }));
        return fresh.length;
      },
      setAutomaticDetection: (result) => set({ automaticDetection: result }),
      setAutomaticSearchCenter: (center) => set({ automaticSearchCenter: center }),
      selectAutomaticParcel: (id) => set({ selectedAutomaticParcelId: id }),
      toast: (msg, tone = "info") => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
      },
      logAudit: async (action, object) => {
        const s = get();
        const u = s.user;
        if (!u) return;
        const e = { id: `au${Date.now()}${Math.random()}`, at: (/* @__PURE__ */ new Date()).toISOString(), userName: u.name, action, object };
        set((s2) => ({ audit: [e, ...s2.audit] }));
        try {
          await api.logAudit({ user_name: u.name, action, object });
        } catch (err) {
          console.warn("[AgriSat] \xC9chec de l'enregistrement d'audit :", err);
        }
      },
      correctParcel: async (id, to, note, kind) => {
        const s = get();
        const seasonId = s.filters.seasonId;
        const by = s.user?.name ?? "Inconnu";
        set({
          parcels: s.parcels.map((p) => {
            if (p.id !== id) return p;
            const r = p.results[seasonId];
            if (!r) return p;
            return {
              ...p,
              results: {
                ...p.results,
                [seasonId]: { ...r, culture: to, status: kind === "observation" ? "verifie_terrain" : "corrige", correctedBy: by }
              },
              corrections: [...p.corrections, { at: (/* @__PURE__ */ new Date()).toISOString(), by, seasonId, from: r.culture, to, note, kind }]
            };
          })
        });
        try {
          const r = s.parcels.find((p) => p.id === id)?.results[seasonId];
          await api.correctParcelle(id, {
            culture_detected: to,
            confidence: r ? Math.round(r.confidence * 100) : void 0,
            verdict: kind === "observation" ? "Observation terrain" : "Correction humaine",
            saison: seasonId
          });
        } catch (err) {
          console.warn("[AgriSat] \xC9chec de la correction de parcelle :", err);
        }
        get().logAudit(kind === "observation" ? "Saisie d\u2019observation terrain" : "Correction de classe", `Parcelle ${id}`);
      },
      rejectParcel: async (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        set({
          parcels: s.parcels.map((p) => p.id === id ? { ...p, rejected: true } : p),
          rejectedParcels: addRejection(s.rejectedParcels, parcel),
          selectedId: null
        });
        get().logAudit("Rejet de polygone", `Parcelle ${id}`);
        if (isDatabaseParcelId(id)) {
          try {
            await api.deleteParcel(id);
            get().toast("Parcelle supprim\xE9e d\xE9finitivement.", "ok");
          } catch (err) {
            console.warn("[AgriSat] Suppression de la parcelle en base impossible :", err);
            get().toast("Parcelle masqu\xE9e, mais la suppression en base a \xE9chou\xE9.", "warn");
          }
          return;
        }
        try {
          await api.createParcel({
            label: "",
            coordinates: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
            center_lat: parcel.centroid[0],
            center_lng: parcel.centroid[1],
            surface_ha: parcel.areaHa,
            culture_declared: "",
            culture_detected: null,
            ndvi_percentage: null,
            ndre: null,
            spectral_bands: null,
            confidence: null,
            verdict: "Contour automatique supprim\xE9",
            details: "Suppression persist\xE9e : ce contour ne doit plus \xEAtre r\xE9affich\xE9.",
            saison: null,
            soil_type: null,
            risk_factors: [],
            recommendations: null,
            data_source: REJECTED_PARCEL_SOURCE,
            owner_name: "",
            notes: "Contour automatique supprim\xE9 par l\u2019utilisateur.",
            time_series_s2: [],
            time_series_s1: [],
            time_series_rain: [],
            estimated_planting_date: null,
            estimated_harvest_date: null,
            days_since_planting: null,
            growth_stage: null,
            planting_confidence: null,
            evi: null,
            savi: null,
            ndwi: null,
            agro_score: null,
            hybrid_score: null,
            cnn_prob_barley: null,
            cnn_prob_non_barley: null
          });
          get().toast("Contour supprim\xE9 d\xE9finitivement.", "ok");
        } catch (err) {
          console.warn("[AgriSat] Suppression du contour non enregistr\xE9e c\xF4t\xE9 serveur :", err);
          get().toast("Contour masqu\xE9 sur cet appareil ; la suppression serveur a \xE9chou\xE9.", "warn");
        }
      },
      removeParcelCulture: async (id) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) return;
        const hasCulture = !!parcel.cultureDetail || Object.values(parcel.results).some((result) => result.culture !== "inconnue");
        if (!hasCulture) {
          s.toast("Aucune culture enregistr\xE9e \xE0 supprimer sur cette parcelle.", "warn");
          return;
        }
        const seasonIds = Object.keys(parcel.results);
        const cleared = {
          ...parcel,
          cultureDetail: void 0,
          results: Object.fromEntries(
            (seasonIds.length ? seasonIds : [s.filters.seasonId]).map((seasonId) => [seasonId, clearedCultureResult(seasonId)])
          )
        };
        set({ parcels: s.parcels.map((p) => p.id === id ? cleared : p) });
        get().logAudit("Suppression de la culture", `Parcelle ${id}`);
        if (!isDatabaseParcelId(id)) {
          get().toast("Culture retir\xE9e. La parcelle reste sur la carte.", "ok");
          return;
        }
        try {
          await api.deleteParcelCulture(id);
          get().toast("Culture supprim\xE9e en base \u2014 la parcelle est conserv\xE9e.", "ok");
        } catch (err) {
          console.warn("[AgriSat] Suppression de la culture impossible :", err);
          set((st) => ({ parcels: st.parcels.map((p) => p.id === id ? parcel : p) }));
          get().toast("Suppression de la culture impossible : la parcelle est inchang\xE9e.", "danger");
        }
      },
      analyzeParcel: async (id, options) => {
        const s = get();
        const parcel = s.parcels.find((p) => p.id === id);
        if (!parcel) {
          s.toast("Parcelle introuvable.", "warn");
          return;
        }
        if (s.analyzingParcelId) {
          s.toast("Une analyse de parcelle est d\xE9j\xE0 en cours.", "warn");
          return;
        }
        set({ analyzingParcelId: id });
        try {
          const result = await api.analyzeParcel({
            lat: parcel.centroid[0],
            lng: parcel.centroid[1],
            zoom: 17,
            polygon: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
            parcelId: isDatabaseParcelId(parcel.id) ? parcel.id : null,
            force: options?.force ?? false
          });
          const [updated] = maltoToFrontend([result.parcelle], { regions: s.regions, communes: s.communes });
          if (updated) {
            const newResult = Object.values(updated.results)[0];
            const merged = {
              ...updated,
              corrections: parcel.corrections,
              results: {
                ...parcel.results,
                ...newResult ? { [s.filters.seasonId]: { ...newResult, seasonId: s.filters.seasonId } } : {}
              }
            };
            set((st) => ({
              parcels: [...st.parcels.filter((p) => p.id !== parcel.id), merged],
              selectedId: merged.id
            }));
            get().logAudit("Analyse de parcelle", `Parcelle ${merged.id}`);
          }
          get().toast(
            result.created ? "Parcelle analys\xE9e et enregistr\xE9e en base." : "Analyse termin\xE9e \u2014 les donn\xE9es de la parcelle sont \xE0 jour.",
            "ok"
          );
        } catch (err) {
          console.warn("[AgriSat] Analyse de parcelle impossible :", err);
          get().toast(err instanceof Error ? err.message : "Analyse de parcelle impossible.", "danger");
        } finally {
          set({ analyzingParcelId: null });
        }
      },
      createAnalysis: ({ zoneLabel, regionId, communeId, seasonId, zone }) => {
        const s = get();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const id = `AN-2026-${String(s.analyses.length + 40).padStart(3, "0")}`;
        const cached = s.analyses.find(
          (a) => a.seasonId === seasonId && (a.status === "terminee" || a.status === "terminee_avertissements") && (communeId && a.communeId === communeId || !communeId && regionId && a.regionId === regionId && !a.communeId)
        );
        const inScope = s.parcels.filter(
          (p) => p.results[seasonId] && (communeId ? p.communeId === communeId : regionId ? p.regionId === regionId : true) && (!zone || pointInPolygon(p.centroid, zone))
        );
        const base = {
          id,
          zoneLabel,
          regionId,
          communeId,
          seasonId,
          status: "en_attente",
          progress: 0,
          createdBy: s.user?.name ?? "\u2014",
          createdAt: now,
          pipelineVersion: CURRENT_MODEL,
          scenes: 0,
          warnings: [],
          logs: []
        };
        if (cached) {
          const a = {
            ...base,
            status: "terminee",
            progress: 100,
            cached: true,
            startedAt: now,
            finishedAt: now,
            parcelCount: inScope.length,
            areaHa: inScope.reduce((t, p) => t + p.areaHa, 0),
            scenes: cached.scenes,
            logs: [{ at: now, level: "info", msg: `Entr\xE9es identiques d\xE9j\xE0 trait\xE9es (${cached.id}) \u2014 r\xE9sultats r\xE9utilis\xE9s depuis le cache, aucun calcul relanc\xE9.` }]
          };
          set({ analyses: [a, ...s.analyses] });
          get().logAudit("Lancement d\u2019analyse (cache)", zoneLabel);
          return a;
        }
        set({ analyses: [base, ...s.analyses] });
        get().logAudit("Lancement d\u2019analyse", `${zoneLabel} \xB7 ${seasonId}`);
        if (api && "analyzeSimple" in api) {
          try {
            if (maltoConfigured()) {
              const center = pickCenter(s, { zoneLabel, regionId, communeId, zone });
              const radiusM = pickRadiusM({ zone, center });
              void runMaltoPipeline(id, center, radiusM, seasonId, zone ?? null).then((res) => {
                const warns = res.warnings;
                const ended = (/* @__PURE__ */ new Date()).toISOString();
                set((st) => ({
                  analyses: st.analyses.map((x) => x.id === id ? {
                    ...x,
                    status: warns.length ? "terminee_avertissements" : "terminee",
                    progress: 100,
                    startedAt: x.startedAt ?? now,
                    finishedAt: ended,
                    pipelineVersion: "Malto \xB7 trac\xE9 JECAM-VHR + RF orge",
                    scenes: res.scenes,
                    warnings: warns,
                    parcelCount: res.parcelCount,
                    areaHa: res.areaHa,
                    logs: [...x.logs, { at: ended, level: "info", msg: "Pipeline Malto termin\xE9 \u2014 trac\xE9 automatique + classification orge (mod\xE8les existants)." }]
                  } : x)
                }));
                get().toast(
                  `Analyse ${id} termin\xE9e (Malto) : ${res.tracedCount} contour(s) automatique(s), ${res.manualCount} parcelle(s) manuelle(s), ${res.barleyCount} orge.`,
                  "ok"
                );
              }).catch((err) => {
                const ended = (/* @__PURE__ */ new Date()).toISOString();
                set((st) => ({
                  analyses: st.analyses.map((x) => x.id === id ? {
                    ...x,
                    status: "echec",
                    progress: 100,
                    startedAt: x.startedAt ?? now,
                    finishedAt: ended,
                    error: err instanceof Error ? err.message : String(err),
                    logs: [...x.logs, { at: ended, level: "warn", msg: "Appel Malto \xE9chou\xE9 \u2014 repli sur simulation." }]
                  } : x)
                }));
                setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), true), 400);
              });
              set((st) => ({
                analyses: st.analyses.map((x) => x.id === id ? { ...x, status: "en_cours", startedAt: now, pipelineVersion: "Malto /api/analyze (mod\xE8les IA r\xE9els)" } : x)
              }));
              return base;
            }
          } catch (e) {
            console.warn("[AgriSat] Pr\xE9paration de l'analyse Malto impossible, repli simulation :", e);
          }
        }
        setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), false), 1200);
        return base;
      },
      relaunchAnalysis: (id) => {
        const s = get();
        const a = s.analyses.find((x) => x.id === id);
        if (!a) return;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const inScope = s.parcels.filter((p) => p.results[a.seasonId] && (a.communeId ? p.communeId === a.communeId : true));
        set({
          analyses: s.analyses.map((x) => x.id === id ? { ...x, status: "en_attente", progress: 0, error: void 0, logs: [...x.logs, { at: now, level: "info", msg: `Relance contr\xF4l\xE9e par ${s.user?.name ?? "\u2014"}.` }] } : x)
        });
        get().logAudit("Relance d\u2019analyse", id);
        setTimeout(() => runSimulation(id, inScope.length, inScope.reduce((t, p) => t + p.areaHa, 0), true), 1200);
      },
      setUserRole: (id, role) => {
        set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, role } : u) }));
        get().logAudit("Modification de r\xF4le", `Compte ${get().users.find((u) => u.id === id)?.name}`);
      },
      toggleUserActive: (id) => {
        set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, active: !u.active } : u) }));
        get().logAudit("Changement de statut de compte", `Compte ${get().users.find((u) => u.id === id)?.name}`);
      }
    }),
    {
      name: "agri-mada-v1",
      version: 3,
      migrate: (persistedState) => ({
        ...persistedState,
        rejectedParcels: persistedState.rejectedParcels ?? [],
        basemap: "satellite"
      }),
      partialize: (s) => ({
        user: s.user,
        colors: s.colors,
        colorsByUser: s.colorsByUser,
        threshold: s.threshold,
        basemap: s.basemap,
        showCoverage: s.showCoverage,
        rejectedParcels: s.rejectedParcels
      })
    }
  )
);
function clearedCultureResult(seasonId) {
  const at = (/* @__PURE__ */ new Date()).toISOString();
  return {
    seasonId,
    culture: "inconnue",
    confidence: 0,
    probs: {},
    status: "incertain",
    analysisId: "\u2014",
    modelVersion: "Aucune culture enregistr\xE9e",
    processedAt: at,
    observedFrom: at.slice(0, 10),
    observedTo: at.slice(0, 10)
  };
}
function avgPoint2(coords) {
  if (!coords.length) return [0, 0];
  let x = 0, y = 0;
  for (const [a, b] of coords) {
    x += a;
    y += b;
  }
  return [x / coords.length, y / coords.length];
}
function bboxRadiusM(coords, center) {
  if (!coords.length) return 800;
  let max = 0;
  const [cx, cy] = center;
  for (const [a, b] of coords) {
    const dLat = (a - cx) * 111e3;
    const dLon = (b - cy) * 111e3 * Math.cos(cx * Math.PI / 180);
    const d = Math.sqrt(dLat * dLat + dLon * dLon);
    if (d > max) max = d;
  }
  return Math.max(200, Math.min(5e3, Math.round(max * 1.2)));
}
function pickCenter(s, ctx) {
  if (ctx.zone && ctx.zone.length >= 3) return avgPoint2(ctx.zone);
  if (ctx.communeId) {
    const c = s.communes.find((x) => x.id === ctx.communeId);
    if (c && c.outline?.length) return avgPoint2(c.outline);
  }
  if (ctx.regionId) {
    const r = s.regions.find((x) => x.id === ctx.regionId);
    if (r && r.outline?.length) return avgPoint2(r.outline);
  }
  return [-19.87, 47.03];
}
function pickRadiusM(ctx) {
  if (ctx.zone && ctx.zone.length >= 3) return bboxRadiusM(ctx.zone, ctx.center);
  return 1e3;
}
async function runMaltoPipeline(id, center, radiusM, seasonId, zone) {
  const { getState, setState } = useApp;
  const stamp = () => (/* @__PURE__ */ new Date()).toISOString();
  const patchLog = (msg, level = "info") => setState((s) => ({
    analyses: s.analyses.map((a) => a.id === id ? { ...a, logs: [...a.logs, { at: stamp(), level, msg }] } : a)
  }));
  patchLog("Trac\xE9 automatique des parcelles (mod\xE8le VHR JECAM)\u2026");
  let traced = [];
  try {
    const traceRadius = Math.min(1e3, Math.max(200, radiusM));
    const zp = await api.zoneParcels({ latitude: center[0], longitude: center[1], radius_m: traceRadius });
    const features = zp.geojson?.features ?? [];
    const st2 = getState();
    traced = maltoVhrToFrontend(features, { regions: st2.regions, communes: st2.communes }).map((p) => ({
      ...p,
      results: { ...p.results, [seasonId]: { ...p.results[DEFAULT_SEASON], seasonId } }
    })).filter((p) => !isRejectedParcel(p, st2.rejectedParcels));
    if (traced.length) {
      const existing = new Set(st2.parcels.map((p) => p.id));
      const added = traced.filter((p) => !existing.has(p.id));
      setState((s2) => ({ parcels: [...s2.parcels, ...added] }));
      patchLog(
        added.length === 0 ? `${traced.length} contours trac\xE9s (${traceRadius} m) \u2014 tous d\xE9j\xE0 pr\xE9sents. Le service de tracage sert actuellement sa base pr\xE9calcul\xE9e quel que soit le lieu ; une remesure c\xF4t\xE9 service VHR est n\xE9cessaire pour obtenir de nouveaux contours.` : `${traced.length} contours trac\xE9s (${traceRadius} m), dont ${added.length} nouvelles parcelles.`
      );
    } else {
      patchLog("Aucune parcelle trac\xE9e dans ce rayon (image ou service de tracage indisponible).", "warn");
    }
  } catch (err) {
    patchLog(`Trac\xE9 automatique indisponible : ${err instanceof Error ? err.message : String(err)}`, "warn");
  }
  const current = getState();
  const manualParcels = parcelsForAnalysis(
    current.parcels,
    { lat: center[0], lng: center[1], radiusM, zone },
    current.rejectedParcels
  ).filter(isManualParcel);
  const alreadyAnalyzed = analyzedParcelIds(current.parcels);
  const analysisParcels = [...manualParcels, ...traced].filter((p) => !alreadyAnalyzed.has(p.id));
  const skippedCount = manualParcels.length + traced.length - analysisParcels.length;
  patchLog(
    `Classification orge/non-orge (RF Sentinel-2) sur ${traced.length} contour(s) automatique(s) et ${manualParcels.length} parcelle(s) trac\xE9e(s) manuellement\u2026`
  );
  if (skippedCount > 0) {
    patchLog(
      `${skippedCount} parcelle(s) d\xE9j\xE0 analys\xE9e(s) ignor\xE9e(s) : leurs donn\xE9es enregistr\xE9es restent inchang\xE9es.`,
      "warn"
    );
  }
  if (analysisParcels.length === 0) {
    return {
      warnings: ["Toutes les parcelles du p\xE9rim\xE8tre ont d\xE9j\xE0 \xE9t\xE9 analys\xE9es : aucune nouvelle analyse n\xE9cessaire."],
      scenes: 0,
      tracedCount: traced.length,
      manualCount: manualParcels.length,
      barleyCount: 0,
      parcelCount: current.parcels.filter((p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone))).length,
      areaHa: current.parcels.filter((p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone))).reduce((t, p) => t + p.areaHa, 0)
    };
  }
  const traced_parcels = analysisParcels.slice(0, 500).map(toTracedParcelInput);
  const res = await api.analyzeSimple({
    latitude: center[0],
    longitude: center[1],
    radius: radiusM,
    traced_parcels
  });
  const feats = res.features ?? [];
  const classified = /* @__PURE__ */ new Map();
  for (const f of feats) {
    const ring = f.geometry?.type === "Polygon" ? (f.geometry?.coordinates ?? [])[0] : void 0;
    if (!ring || ring.length < 3) continue;
    let fx = 0, fy = 0;
    for (const [lng, lat] of ring) {
      fx += lng;
      fy += lat;
    }
    const flat = [fy / ring.length, fx / ring.length];
    let best = null;
    let bestD = Infinity;
    for (const p of analysisParcels) {
      const dLat = (p.centroid[0] - flat[0]) * 111e3;
      const dLon = (p.centroid[1] - flat[1]) * 111e3 * Math.cos(flat[0] * Math.PI / 180);
      const d = Math.hypot(dLat, dLon);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best && bestD < 100) {
      const raw = f.properties?.confidence ?? 50;
      classified.set(best.id, {
        conf: Math.min(0.99, Math.max(0.05, raw > 1 ? raw / 100 : raw)),
        ndvi: typeof f.properties?.meanNDVI === "number" ? f.properties.meanNDVI : null
      });
    }
  }
  let barleyCount = 0;
  if (classified.size) {
    setState((s2) => ({
      parcels: s2.parcels.map((p) => {
        const c = classified.get(p.id);
        if (!c) return p;
        barleyCount++;
        return {
          ...p,
          results: {
            ...p.results,
            [seasonId]: {
              seasonId,
              culture: "orge",
              confidence: c.conf,
              probs: { orge: c.conf },
              status: "non_verifie",
              analysisId: id,
              modelVersion: `Malto RF orge${c.ndvi != null ? ` \xB7 NDVI ${Math.round(c.ndvi)} %` : ""}`,
              processedAt: stamp(),
              observedFrom: stamp().slice(0, 10),
              observedTo: stamp().slice(0, 10)
            }
          }
        };
      })
    }));
  }
  patchLog(`${barleyCount} parcelle(s) class\xE9e(s) ORGE (confiance du mod\xE8le, seuil backend).`);
  const st = getState();
  const scoped = st.parcels.filter(
    (p) => p.results[seasonId] && (!zone || pointInPolygon(p.centroid, zone))
  );
  return {
    warnings: res.warnings ?? [],
    scenes: typeof res.candidatesClassified === "number" ? res.candidatesClassified : analysisParcels.length,
    tracedCount: traced.length,
    manualCount: manualParcels.length,
    barleyCount,
    parcelCount: scoped.length,
    areaHa: scoped.reduce((t, p) => t + p.areaHa, 0)
  };
}
function runSimulation(id, count, area, partialOutcome) {
  const { getState, setState } = useApp;
  const patch = (fn) => setState((s) => ({ analyses: s.analyses.map((a) => a.id === id ? fn(a) : a) }));
  patch((a) => ({ ...a, status: "en_cours", startedAt: (/* @__PURE__ */ new Date()).toISOString(), scenes: rint(20, 80) }));
  const tick = () => {
    const a = getState().analyses.find((x) => x.id === id);
    if (!a || a.status !== "en_cours") return;
    const next = Math.min(100, a.progress + rint(6, 14));
    const before = Math.floor(a.progress / 100 * PIPELINE_STEPS.length);
    const after = Math.floor(next / 100 * PIPELINE_STEPS.length);
    const newLogs = PIPELINE_STEPS.slice(before, after).map((m) => ({ at: (/* @__PURE__ */ new Date()).toISOString(), level: "info", msg: `${m} \u2014 termin\xE9` }));
    if (next >= 100) {
      patch((x) => ({
        ...x,
        progress: 100,
        logs: [...x.logs, ...newLogs],
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: partialOutcome ? "terminee_avertissements" : "terminee",
        warnings: partialOutcome ? ["R\xE9sultat partiel : 2 sc\xE8nes seulement exploitables, confiance moyenne r\xE9duite."] : [],
        parcelCount: count,
        areaHa: area
      }));
      getState().toast(`Analyse ${id} termin\xE9e.`, "ok");
    } else {
      patch((x) => ({ ...x, progress: next, logs: [...x.logs, ...newLogs] }));
      setTimeout(tick, 900);
    }
  };
  setTimeout(tick, 900);
}

// .check-display.ts
var rows = JSON.parse(fs.readFileSync("../parcelles.json", "utf8"));
var parcels = maltoToFrontend(rows);
var views = baseFilter(parcels, DEFAULT_FILTERS, null);
var isVhr = (p) => Object.values(p.results).some((r) => r.modelVersion.includes("Delineate Anything")) || p.dataSource?.includes("Trac\xE9") || p.id.startsWith("jecam");
console.log("rows", rows.length, "mapped", parcels.length, "visible", views.length);
console.log("visible jecam/vhr", views.filter((v) => isVhr(v.p)).length);
console.log("hidden", parcels.length - views.length);
var hidden = parcels.filter((p) => !views.some((v) => v.p.id === p.id));
var reasons = hidden.map((p) => {
  const r = p.results[DEFAULT_FILTERS.seasonId];
  return { label: p.id.slice(0, 12), dataSource: p.dataSource?.slice(0, 30), hasResult: !!r, culture: r?.culture, conf: r?.confidence };
});
console.log("hidden sample", reasons.slice(0, 10));
var seasons = /* @__PURE__ */ new Map();
for (const p of parcels) for (const s of Object.keys(p.results)) seasons.set(s, (seasons.get(s) ?? 0) + 1);
console.log("result seasons", [...seasons.entries()]);
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

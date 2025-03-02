// Taken from generated emscripten
function getIndexedDB() {
  if (typeof indexedDB != 'undefined') return indexedDB;
  var ret = null;
  if (typeof window == 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, 'IDBFS used, but indexedDB not supported');
  return ret;
}

const db = getIndexedDB();
const channel = new BroadcastChannel("inotify");

export function proxyIndexedDB() {
  return {
    cmp: function (first, second) {
      return db.cmp(first, second);
    },
    databases: function () {
      return db.databases();
    },
    deleteDatabase: function (name, options) {
      return db.deleteDatabase(name, options);
    },
    open: function (name, version) {
      const req = db.open(name, version);
      return {
        // IDBRequest methods
        get(_target, prop, receiver) {
          return Reflect.get(req, prop, receiver);
        },
        addEventListener: function (type, listener, options) {
          return req.addEventListener(type, listener, options);
        },
        dispatchEvent: function (event) {
          return req.dispatchEvent(event);
        },
        removeEventListener: function (type, listener, options) {
          return req.removeEventListener(type, listener, options);
        }
      };
    }
  };
  // const px = new Proxy(db, {
  //   get(target, prop, receiver) {
  //     return Reflect.get(target, prop, receiver);
  //   },
  //   set(target, prop, value, receiver) {
  //     return Reflect.set(target, prop, value, receiver);
  //   },
  //   apply(target, thisArg, argArray) {
  //     return Reflect.apply(target, thisArg, argArray);
  //   },
  //   construct(target, args, newTarget) {
  //     return Reflect.construct(target, args, newTarget);
  //   },
  //   defineProperty(target, property, attributes) {
  //     return Reflect.defineProperty(target, property, attributes);
  //   },
  //   deleteProperty(target, p) {
  //     return Reflect.deleteProperty(target, p);
  //   },
  //   getOwnPropertyDescriptor(target, p) {
  //     return Reflect.getOwnPropertyDescriptor(target, p);
  //   },
  //   has(target, p) {
  //     return Reflect.has(target, p);
  //   },
  //   isExtensible(target) {
  //     return Reflect.isExtensible(target);
  //   },
  //   ownKeys(target) {
  //     return Reflect.ownKeys(target);
  //   },
  //   preventExtensions(target) {
  //     return Reflect.preventExtensions(target);
  //   },
  //   setPrototypeOf(target, v) {
  //     return Reflect.setPrototypeOf(target, v);
  //   }
  //   // apply: (target, thisArg, argumentsList) => {
  //     //   console.log("Indexdb call made: ", channel);
  //     //   return Reflect.apply(...arguments);
  //     // }
  // });
  //
  // Object.setPrototypeOf(px, Object.getPrototypeOf(db));
  //
  // const DBOpenRequest = px.open("toDoList", 4);
  // console.log(DBOpenRequest);
  //
  // return px;
}

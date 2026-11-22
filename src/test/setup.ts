import "@testing-library/jest-dom/vitest";

const store = new Map<string, string>();
Storage.prototype.setItem = function (key: string, val: string) {
  store.set(key, String(val));
};
Storage.prototype.getItem = function (key: string) {
  return store.has(key) ? store.get(key)! : null;
};
Storage.prototype.removeItem = function (key: string) {
  store.delete(key);
};
Storage.prototype.clear = function () {
  store.clear();
};
Storage.prototype.key = function (i: number) {
  return Array.from(store.keys())[i] ?? null;
};

const mockStorage = Object.create(Storage.prototype);
Object.defineProperty(mockStorage, "length", {
  get() {
    return store.size;
  },
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

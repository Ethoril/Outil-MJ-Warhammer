export const Bus = {
  _h: new Map(),
  on(e, f) {
    (this._h.get(e) || this._h.set(e, new Set()).get(e)).add(f);
  },
  emit(e, p) {
    this._h.get(e)?.forEach(fn => fn(p));
  }
};

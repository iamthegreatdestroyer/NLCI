// Polyfill File for Node 18 (undici@7 requires it)
if (typeof File === 'undefined') {
  const { Blob } = require('buffer');
  global.File = class File extends Blob {
    constructor(chunks, name, opts) {
      super(chunks, opts);
      this.name = name;
      this.lastModified = opts?.lastModified ?? Date.now();
    }
  };
}

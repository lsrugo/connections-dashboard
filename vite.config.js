/*global require,module,__dirname*/
const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        connections: resolve(__dirname, 'connections.html'),
        edit: resolve(__dirname, 'edit.html'),
      }
    }
  }
})
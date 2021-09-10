module.exports = {
  content: [
    '../build/spa/index.html',
    '../build/spa/statics/**/*.js',
    '../build/spa/js/*.js',
    './src/pages/**/*.vue',
    './src/layouts/**/*.vue',
    './src/components/**/*.vue'
  ],
  rejected: true,
  css: ['../build/spa/css/*.css'],
  output: ['../build/spa/css'],
  safelist: [/^q-/, /^bg/, /^main/]
}
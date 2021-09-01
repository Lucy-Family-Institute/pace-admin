module.exports = {
  content: ['../build/spa/js/*.js'],
  css: ['../build/spa/css/*.css'],
  output: ['../build/spa/css/'],
  fontFace: true,
  keyframes: true,
  variables: true,
  rejected: true,
  safelist: {
    standard: [/fixed-.*/, /absolute-.*/, /q-btn.*/, /justify-.*/]
  }
}
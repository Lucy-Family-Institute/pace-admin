export default {
  middleware: [
    (ctx) => {
      return ctx.express.static(ctx.path)
    }
  ]
}
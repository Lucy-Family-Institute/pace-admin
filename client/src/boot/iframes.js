import VueFriendlyIframe from 'vue-friendly-iframe'
import { boot } from 'quasar/wrappers'
export default boot(
  ({ app }) => {
    app.component('vue-friendly-iframe', VueFriendlyIframe)
  }
)

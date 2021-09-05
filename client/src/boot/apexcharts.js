import VueApexCharts from 'vue-apexcharts'
import { boot } from 'quasar/wrappers'
export default boot(
  ({ app }) => {
    app.component('apexchart', VueApexCharts)
  }
)

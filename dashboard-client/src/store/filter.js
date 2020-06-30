import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  institutionOptions: [],
  preferredPersonSort: 'Total',
  preferredPersonTotal: 'Pending',
  preferredPersonPubSort: 'Confidence',
  preferredCenterPubSort: 'Authors',
  preferredInstitutionReviewState: 'Accepted',
  preferredSelectedCenterAuthor: 'All',
  filterReviewStates: [],
  centerAuthorOptions: [
    'All'
  ],
  selectedPersonSort: undefined,
  selectedPersonPubSort: undefined,
  selectedCenterPubSort: undefined,
  selectedCenterAuthor: undefined,
  selectedPersonTotal: undefined,
  selectedInstitutionReviewState: undefined,
  yearPubStaticMin: 1900,
  yearPubStaticMax: 2200,
  changedPubYears: undefined,
  changedMemberYears: undefined,
  selectedPubYears: {
    min: 1900,
    max: 2200
  },
  yearMemberStaticMin: 1900,
  yearMemberStaticMax: 2200,
  selectedMemberYears: {
    min: 1900,
    max: 2200
  },
  pubSearch: '',
  yearOptions: {
    chart: {
      id: 'year-filter'
    },
    xaxis: {
      categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]
    }
  },
  yearSeries: [{
    name: 'series-1',
    data: [30, 40, 45, 50, 49, 60, 70, 91]
  }],
  journalTypeOptions: {
    chart: {
      type: 'pie'
    },
    tooltip: {
      enabled: false
    },
    dataLabels: {
      formatter: function (val, opt) {
        return opt.w.globals.labels[opt.seriesIndex]
      }
    },
    legend: {
      show: false
    },
    labels: ['Journal', 'Book Series']
  },
  journalTypeSeries: ['Journal', 'Book Series'],
  classificationOptions: {
    chart: {
      type: 'pie'
    },
    tooltip: {
      enabled: false
    },
    dataLabels: {
      formatter: function (val, opt) {
        return opt.w.globals.labels[opt.seriesIndex]
      }
    },
    legend: {
      show: false
    },
    labels: ['Journal', 'Book Series']
  },
  classificationSeries: ['Journal', 'Book Series'],
  refreshCharts: 0,
  journalOptions: {
    chart: {
      id: 'journal-subject'
    },
    xaxis: {
      categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]
    }
  },
  journalSeries: [{
    name: 'series-1',
    data: [30, 40, 45, 50, 49, 60, 70, 91]
  }],
  dashboardMiniState: false
}

const getters = {
  ...make.getters(state)
}

const mutations = {
  ...make.mutations(state)
}

const actions = {
  ...make.actions(state)
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}

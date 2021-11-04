<template>
  <q-select
    :options="organizations"
    class="white"
    label="Review For:"
  />
</template>

<script>
import gql from 'graphql-tag'
export default {
  name: 'CenterSelect',
  components: {
  },
  data: () => ({
    selected: null,
    organizations: []
  }),
  apollo: {
    organizations: gql`query {
      review_organization(
        where: {
          review_organization_levels: {
            level: {_gt: 1}
          }
        }
      ){
        value
      }
    }`,
    update: data => {
      console.log('data', data)
      return data
    }
  }
}
</script>

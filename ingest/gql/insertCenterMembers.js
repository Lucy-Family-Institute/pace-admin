import gql from 'graphql-tag'

export default function insertCenterMember (members) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [persons_organizations_insert_input!]!) {
        insert_persons_organizations(objects: $objects){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: members
    }
  }
}
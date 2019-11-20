import axios from 'axios'
import _ from 'lodash'

async function main() {
  const result = await axios({
    method: 'get',
    url: 'https://api.crossref.org/works?query.author=Ani+Aprahamian',
    headers: {
      'User-Agent': 'GroovyBib/1.1 (https://example.org/GroovyBib/; mailto:GroovyBib@example.org) BasedOnFunkyLib/1.4'
    }
  })
  _.map(result.data.message.items, (item) => {
    if(item.type === 'journal-article') {
      console.log(item.title, item.DOI, item)
    }
  })
}

main()
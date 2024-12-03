import _ from 'lodash'
import { ApiClient, ClarivateWosJournalsJsClient } from 'clarivate-wos-journals-js-client'

import time
import clarivate.wos_journals.client
from clarivate.wos_journals.client.api import categories_api
from clarivate.wos_journals.client.model.category_list import CategoryList
from pprint import pprint
# Defining the host is optional and defaults to https://api.clarivate.com/apis/wos-journals/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = clarivate.wos_journals.client.Configuration(
    host = "https://api.clarivate.com/apis/wos-journals/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: key
configuration.api_key['key'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['key'] = 'Bearer'

# Enter a context with an instance of the API client
with clarivate.wos_journals.client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = categories_api.CategoriesApi(api_client)
    q = "q_example" # str | Free-text search by category name.  Search logic is described in the section [Search](#search). (optional)
    edition = "edition_example" # str | Filter by Web of Sceince Citation Index. The following indexes (editions) are presented: - SCIE - Science Citation Index Expanded (ournals across more than 170 disciplines) - SSCI - Social Sciences Citation Index (journals across more than 50 social science disciplines)  Multiple values are allowed, separated by semicolon ( **;** ) (optional)
    jcr_year = 1 # int | Filter by Category Citation Report year (from 2003).  Only one value is allowed. (optional)
    page = 1 # int | Specifying a page to retrieve (optional) if omitted the server will use the default value of 1
    limit = 10 # int | Number of returned results, ranging from 0 to 50 (optional) if omitted the server will use the default value of 10

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Search and filter across the journal categories
        api_response = api_instance.categories_get(q=q, edition=edition, jcr_year=jcr_year, page=page, limit=limit)
        pprint(api_response)
    except clarivate.wos_journals.client.ApiException as e:
        print("Exception when calling CategoriesApi->categories_get: %s\n" % e)


async function main (): Promise<void> {

  

  let apiClient = new ApiClient()
  let apiInstance = new ClarivateWosJournalsJsClient(apiClient)
  let opts = {
    'q': "q_example", // String | Free-text search by category name.  Search logic is described in the section [Search](#search).
    'edition': "edition_example", // String | Filter by Web of Sceince Citation Index. The following indexes (editions) are presented: - SCIE - Science Citation Index Expanded (ournals across more than 170 disciplines) - SSCI - Social Sciences Citation Index (journals across more than 50 social science disciplines)  Multiple values are allowed, separated by semicolon ( **;** )
    'jcrYear': 56, // Number | Filter by Category Citation Report year (from 2003).  Only one value is allowed.
    'page': 1, // Number | Specifying a page to retrieve
    'limit': 10 // Number | Number of returned results, ranging from 0 to 50
  };
  apiInstance.categoriesGet(opts, (error, data, response) => {
    if (error) {
      console.error(error);
    } else {
      console.log('API called successfully. Returned data: ' + data);
    }
  });
}

main();
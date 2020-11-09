// the normalized simple form of a publication across all sources
interface NormedPublication {
  search_family_name: String,
  search_given_name: String,
  title: String,
  journal: String,
  doi: String,
  source_name: String,
  source_id?: String,
  source_metadata?: Object
}
#!/bin/bash

output=src/statics/edu.nd
url_re='(https?|ftp|file)://[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]\.[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]'
# rel_re='[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]\.[-A-Za-z0-9\+&@#/%?=~_|!:,.;]*[-A-Za-z0-9\+&@#/%=~_|]'
regex1="^.*url\([\'\"]{0,1}($url_re)[\'\"]{0,1}\).*$"
# regex2="^.*url\([\'\"]{0,1}(\/$rel_re)[\'\"]{0,1}\).*"

wget --mirror -P "${output}" https://conductor.nd.edu/stylesheets/themes/ndt/v3/ndt.css

while read line
do
  if [[ $line =~ $regex1 ]]
  then
    # echo ${BASH_REMATCH[1]} $line
    wget -q --mirror -P "${output}" "${BASH_REMATCH[1]}"
  fi
  # if [[ $line =~ $regex2 ]]
  # then
  #   wget --mirror -P src/statics/edu.nd/conductor.nd.edu "https://conductor.nd.edu${BASH_REMATCH[1]}"
  # fi
done < "./src/statics/edu.nd/conductor.nd.edu/stylesheets/themes/ndt/v3/ndt.css"


# Replace
# url('/
# url('/statics/edu.nd/conductor.nd.edu/

# Replace 
# url('https://
# url('/statics/edu.nd/


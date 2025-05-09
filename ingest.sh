#!/bin/bash

directory="/Users/rjohns14/git/pace3/pace-admin/data/ingester/staged"

if [ ! -d "$directory" ]; then
  echo "Error: Directory '$directory' not found."
  exit 1
fi

for dir in "$directory"/*; do
  if [ -d "$dir" ]; then
    # Your code to process the file goes here
    echo "Processing dir: $dir"
    make ingest_metadata_from_dir INGESTDIR=$dir
    # Example:
    # cat "$file"
  fi
done
# Ingest // PACE Admin

## Unit Tests

Before you get started, you will need a copy of `.env` with credentials; These belong in the root directory of the repository.

From the PACE Admin root directory:

1. `cd /path/to/pace-admin`
2. `make start_docker`
3. `cd ./ingest`
4. `yarn test`

You should see something like:

```sh
 PASS  test/getIngestFilePaths.test.js
 PASS  units/test/normalizer.test.ts

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        1.381 s, estimated 3 s
Ran all test suites.
✨  Done in 2.41s.
```
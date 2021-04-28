const getIngestFilePaths = require('../getIngestFilePaths');

test('reading file from file system', async () => {
  expect.hasAssertions();
  const subject = await getIngestFilePaths();

  Object.keys(subject).forEach(year => {
    expect(parseInt(year)).toBeGreaterThan(0)
  });
});
const updateConfidenceReviewStates = require('../updateConfidenceReviewStates');

test('reading file from file system', async () => {
  expect.hasAssertions();
  const subject = await getIngestFilePathsByYear();

  Object.keys(subject).forEach(year => {
    expect(parseInt(year)).toBeGreaterThan(0)
  });
});

// performauthorconfidencetests
// publicationauthormap
// performconfidencetests
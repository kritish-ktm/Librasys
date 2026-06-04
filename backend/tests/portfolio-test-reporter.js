class PortfolioTestReporter {
  onRunComplete(_contexts, results) {
    console.log('\nPortfolio Test Results - User Management / Member Management');
    console.log('='.repeat(64));

    results.testResults.forEach((suite) => {
      suite.testResults.forEach((test) => {
        const status = test.status.toUpperCase().padEnd(6, ' ');
        console.log(`${status} ${test.fullName}`);
      });
    });

    console.log('='.repeat(64));
    console.log(
      `Summary: ${results.numPassedTests} passed, ${results.numFailedTests} failed, ${results.numTotalTests} total`
    );
  }
}

module.exports = PortfolioTestReporter;

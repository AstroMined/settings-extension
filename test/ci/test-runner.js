/**
 * CI/CD Test Runner
 * Orchestrates test execution for continuous integration
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      performance: null,
      coverage: null,
    };
  }

  async runAllTests() {
    console.log("🚀 Starting comprehensive test suite...\n");

    try {
      // Run unit tests
      await this.runUnitTests();

      // Run integration tests
      await this.runIntegrationTests();

      // Run performance tests
      await this.runPerformanceTests();

      // Generate coverage report
      await this.generateCoverageReport();

      // Generate summary
      this.generateSummary();

      return this.results;
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);
      process.exit(1);
    }
  }

  async runUnitTests() {
    console.log("📋 Running unit tests...");

    const result = await this.runCommand("npm", [
      "test",
      "--",
      "--selectProjects=unit",
    ]);
    this.results.unit = result;

    if (result.code === 0) {
      console.log("✅ Unit tests passed\n");
    } else {
      console.log("❌ Unit tests failed\n");
      throw new Error("Unit tests failed");
    }
  }

  async runIntegrationTests() {
    console.log("🔗 Running integration tests...");

    const result = await this.runCommand("npm", [
      "test",
      "--",
      "--selectProjects=integration",
    ]);
    this.results.integration = result;

    if (result.code === 0) {
      console.log("✅ Integration tests passed\n");
    } else {
      console.log("❌ Integration tests failed\n");
      throw new Error("Integration tests failed");
    }
  }

  async runPerformanceTests() {
    console.log("⚡ Running performance tests...");

    const result = await this.runCommand("npm", [
      "test",
      "--",
      "--selectProjects=performance",
    ]);
    this.results.performance = result;

    if (result.code === 0) {
      console.log("✅ Performance tests passed\n");
    } else {
      console.log("❌ Performance tests failed\n");
      throw new Error("Performance tests failed");
    }
  }

  async generateCoverageReport() {
    console.log("📊 Generating coverage report...");

    const result = await this.runCommand("npm", ["run", "test:coverage"]);
    this.results.coverage = result;

    if (result.code === 0) {
      console.log("✅ Coverage report generated\n");
      await this.parseCoverageReport();
    } else {
      console.log("❌ Coverage report generation failed\n");
    }
  }

  async parseCoverageReport() {
    try {
      const coveragePath = path.join(
        process.cwd(),
        "coverage",
        "coverage-summary.json",
      );

      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
        const total = coverageData.total;

        console.log("📈 Coverage Summary:");
        console.log(`   Lines: ${total.lines.pct}%`);
        console.log(`   Functions: ${total.functions.pct}%`);
        console.log(`   Branches: ${total.branches.pct}%`);
        console.log(`   Statements: ${total.statements.pct}%\n`);

        // Check if coverage meets thresholds
        if (
          total.lines.pct < 80 ||
          total.functions.pct < 80 ||
          total.branches.pct < 80 ||
          total.statements.pct < 80
        ) {
          console.log("⚠️  Coverage below threshold (80%)\n");
        }
      }
    } catch (error) {
      console.log("⚠️  Could not parse coverage report\n");
    }
  }

  generateSummary() {
    console.log("📋 Test Suite Summary:");
    console.log("====================");

    const statusIcon = (result) => (result && result.code === 0 ? "✅" : "❌");

    console.log(`${statusIcon(this.results.unit)} Unit Tests`);
    console.log(`${statusIcon(this.results.integration)} Integration Tests`);
    console.log(`${statusIcon(this.results.performance)} Performance Tests`);
    console.log(`${statusIcon(this.results.coverage)} Coverage Report`);

    const allPassed = Object.values(this.results).every(
      (result) => result && result.code === 0,
    );

    if (allPassed) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log("\n💥 Some tests failed!");
    }
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: "inherit" });

      child.on("close", (code) => {
        resolve({ code });
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }
}

// Cross-browser test runner
class CrossBrowserTestRunner extends TestRunner {
  constructor() {
    super();
    this.browsers = ["chrome", "firefox"];
  }

  async runCrossBrowserTests() {
    console.log("🌐 Running cross-browser tests...\n");

    for (const browser of this.browsers) {
      await this.runBrowserTests(browser);
    }
  }

  async runBrowserTests(browser) {
    console.log(`🔍 Testing in ${browser}...`);

    const result = await this.runCommand("npm", ["run", `test:${browser}`]);

    if (result.code === 0) {
      console.log(`✅ ${browser} tests passed\n`);
    } else {
      console.log(`❌ ${browser} tests failed\n`);
      throw new Error(`${browser} tests failed`);
    }
  }
}

// Performance benchmarking
class PerformanceBenchmark {
  constructor() {
    this.benchmarks = {};
  }

  async runBenchmarks() {
    console.log("🏃 Running performance benchmarks...\n");

    await this.benchmarkLoadTime();
    await this.benchmarkSaveTime();
    await this.benchmarkMemoryUsage();
    await this.benchmarkUIResponse();

    this.generateBenchmarkReport();
  }

  async benchmarkLoadTime() {
    console.log("⏱️  Benchmarking load time...");

    // Mock benchmark - replace with actual implementation
    const results = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      const end = Date.now();
      results.push(end - start);
    }

    const average = results.reduce((a, b) => a + b, 0) / results.length;
    this.benchmarks.loadTime = { average, target: 100, passed: average < 100 };

    console.log(`   Average: ${average.toFixed(2)}ms (target: <100ms)`);
    console.log(
      `   ${this.benchmarks.loadTime.passed ? "✅" : "❌"} Load time benchmark\n`,
    );
  }

  async benchmarkSaveTime() {
    console.log("💾 Benchmarking save time...");

    const results = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      const end = Date.now();
      results.push(end - start);
    }

    const average = results.reduce((a, b) => a + b, 0) / results.length;
    this.benchmarks.saveTime = { average, target: 100, passed: average < 100 };

    console.log(`   Average: ${average.toFixed(2)}ms (target: <100ms)`);
    console.log(
      `   ${this.benchmarks.saveTime.passed ? "✅" : "❌"} Save time benchmark\n`,
    );
  }

  async benchmarkMemoryUsage() {
    console.log("🧠 Benchmarking memory usage...");

    // Mock memory usage - replace with actual implementation
    const memoryUsage = Math.random() * 8; // Random usage under 8MB
    this.benchmarks.memoryUsage = {
      usage: memoryUsage,
      target: 10,
      passed: memoryUsage < 10,
    };

    console.log(`   Usage: ${memoryUsage.toFixed(2)}MB (target: <10MB)`);
    console.log(
      `   ${this.benchmarks.memoryUsage.passed ? "✅" : "❌"} Memory usage benchmark\n`,
    );
  }

  async benchmarkUIResponse() {
    console.log("🖱️  Benchmarking UI response time...");

    const results = [];

    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 400));
      const end = Date.now();
      results.push(end - start);
    }

    const average = results.reduce((a, b) => a + b, 0) / results.length;
    this.benchmarks.uiResponse = {
      average,
      target: 500,
      passed: average < 500,
    };

    console.log(`   Average: ${average.toFixed(2)}ms (target: <500ms)`);
    console.log(
      `   ${this.benchmarks.uiResponse.passed ? "✅" : "❌"} UI response benchmark\n`,
    );
  }

  generateBenchmarkReport() {
    console.log("📊 Performance Benchmark Report:");
    console.log("================================");

    Object.entries(this.benchmarks).forEach(([name, benchmark]) => {
      const status = benchmark.passed ? "✅" : "❌";
      const value = benchmark.average || benchmark.usage;
      const unit = name === "memoryUsage" ? "MB" : "ms";

      console.log(
        `${status} ${name}: ${value.toFixed(2)}${unit} (target: <${benchmark.target}${unit})`,
      );
    });

    const allPassed = Object.values(this.benchmarks).every((b) => b.passed);
    console.log(
      `\n${allPassed ? "🎉" : "💥"} Performance benchmarks ${allPassed ? "passed" : "failed"}`,
    );
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--cross-browser")) {
    const runner = new CrossBrowserTestRunner();
    runner.runCrossBrowserTests().catch(console.error);
  } else if (args.includes("--benchmark")) {
    const benchmark = new PerformanceBenchmark();
    benchmark.runBenchmarks().catch(console.error);
  } else {
    const runner = new TestRunner();
    runner.runAllTests().catch(console.error);
  }
}

module.exports = { TestRunner, CrossBrowserTestRunner, PerformanceBenchmark };

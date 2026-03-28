Run Iran Watch tests. Pass "watch" for watch mode or "coverage" for a coverage report.

## Unit tests (Vitest)
```
npm test
```

## Watch mode
```
npm run test:watch
```

## Coverage report
```
npm run test:coverage
```

After running:
1. Report failures clearly — group by spec file, show the assertion that failed
2. For each failure, read the relevant source file and test to diagnose the cause
3. Determine whether the app code or the test expectation is wrong
4. Suggest the minimal fix

Use the `@test-runner` agent for deeper investigation of persistent failures.

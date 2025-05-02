# A Simple MCP Weather Server written in TypeScript

This is a Model Context Protocol (MCP) server that provides weather data tools using the National Weather Service (NWS) API.

See the [Quickstart](https://modelcontextprotocol.io/quickstart) tutorial for more information.

## Features

- Get weather alerts for a US state
- Get weather forecast for a location by latitude/longitude

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

## Usage

### Local Development

```bash
# Run the server
node build/index.js
```

### Global Installation

```bash
# Run the server using the global command
weather
```

## Testing

The project includes both unit tests and integration tests for the weather server functionality:

```bash
# Install test dependencies
npm install

# Run unit tests only
npm test

# Run integration tests (makes actual API calls)
npm run test:integration

# Run all tests (both unit and integration)
npm run test:all
```

### Unit Tests

The unit tests cover:
- API request handling with mocks
- Alert formatting
- Forecast formatting
- Error handling

### Integration Tests

The integration tests make actual API calls to the National Weather Service to verify:
- Real-world API connectivity
- Response structure validation
- End-to-end functionality

**Note:** Integration tests require internet connectivity and may occasionally fail if the NWS API is experiencing issues or rate limiting.

### Testing Configuration

This project uses:
- Jest for testing
- ES modules configuration
- TypeScript for type checking

The test configuration is set up in:
- `jest.config.js` - Jest configuration with ES modules support
- `tsconfig.jest.json` - TypeScript configuration for tests

### Troubleshooting Test Issues

If you encounter issues running the tests, try these solutions:

1. **Module not defined error**:
   - Make sure you're using the updated test script with `--experimental-vm-modules` flag
   - Check that jest.config.js is using ES modules syntax (export default)

2. **Mock function errors**:
   - Use `jest.clearAllMocks()` instead of calling mockClear() on individual mocks
   - Make sure mocks are properly defined with jest.fn() and mockImplementation()

3. **Import errors**:
   - Ensure all import paths in test files include the `.js` extension when importing from TypeScript files
   - Use proper ES modules import syntax

4. **TypeScript errors**:
   - The test file uses `// @ts-nocheck` to bypass TypeScript errors during development
   - For production code, you may want to properly type your tests

5. **Open handles in Jest**:
   - The project uses the `--forceExit` flag to ensure Jest exits cleanly after tests complete
   - A global teardown is configured in jest.config.js to handle any remaining open handles
   - The `--detectOpenHandles` flag is included in the test scripts to help identify issues

6. **General requirements**:
   - Node.js version 16 or higher is required
   - All dependencies must be installed with `npm install`

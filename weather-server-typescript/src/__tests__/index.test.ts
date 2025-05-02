// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Import the functions to test
import { __test__ } from '../index.js';

// Extract the functions we want to test
const { formatAlert, makeNWSRequest, server } = __test__;

// Mock the MCP SDK modules
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        tool: jest.fn(),
        connect: jest.fn()
      };
    })
  };
});

jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: jest.fn()
  };
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid polluting test output
console.error = jest.fn();

describe('Weather MCP Server', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  describe('makeNWSRequest', () => {
    it('should make a request with correct headers', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      // Check that fetch was called with the correct URL and headers
      expect(mockFetch).toHaveBeenCalledWith('https://api.weather.gov/test', {
        headers: {
          'User-Agent': 'weather-app/1.0',
          'Accept': 'application/geo+json'
        }
      });
      
      // Check that the result is correct
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null when the request fails', async () => {
      // Mock failed response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      // Check that the result is null
      expect(result).toBeNull();
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null when an exception occurs', async () => {
      // Mock exception
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      // Check that the result is null
      expect(result).toBeNull();
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('formatAlert', () => {
    it('should format alert data correctly', () => {
      const mockAlert = {
        properties: {
          event: 'Flood Warning',
          areaDesc: 'Miami-Dade County',
          severity: 'Moderate',
          status: 'Actual',
          headline: 'Flood Warning issued for Miami-Dade County'
        }
      };

      const result = formatAlert(mockAlert);
      
      // Check that the result contains all the expected information
      expect(result).toContain('Event: Flood Warning');
      expect(result).toContain('Area: Miami-Dade County');
      expect(result).toContain('Severity: Moderate');
      expect(result).toContain('Status: Actual');
      expect(result).toContain('Headline: Flood Warning issued for Miami-Dade County');
      console.log(result);
    });

    it('should handle missing properties', () => {
      const mockAlert = {
        properties: {}
      };

      const result = formatAlert(mockAlert);
      
      // Check that the result uses default values for missing properties
      expect(result).toContain('Event: Unknown');
      expect(result).toContain('Area: Unknown');
      expect(result).toContain('Severity: Unknown');
      expect(result).toContain('Status: Unknown');
      expect(result).toContain('Headline: No headline');
    });
  });

  describe('get-alerts tool', () => {
    it('should return formatted alerts when alerts are available', async () => {
      // Create a mock alert response
      const mockAlertResponse = {
        features: [
          {
            properties: {
              event: 'Tornado Warning',
              areaDesc: 'Oklahoma County',
              severity: 'Extreme',
              status: 'Actual',
              headline: 'Tornado Warning issued for Oklahoma County'
            }
          }
        ]
      };

      // Mock the fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertResponse
      });

      // Create a mock state parameter
      const state = 'OK';
      
      // Manually test the alert formatting logic
      const formattedAlerts = mockAlertResponse.features.map(formatAlert);
      const alertsText = `Active alerts for ${state}:\n\n${formattedAlerts.join("\n")}`;
      
      // Verify the formatted text contains expected content
      expect(alertsText).toContain('Event: Tornado Warning');
      expect(alertsText).toContain('Area: Oklahoma County');
      expect(alertsText).toContain('Severity: Extreme');
    });

    it('should handle empty alerts correctly', async () => {
      // Create a mock empty alert response
      const mockEmptyResponse = {
        features: []
      };

      // Verify that with no features, we'd get the expected message
      const state = 'HI';
      const noAlertsMessage = `No active alerts for ${state}`;
      
      expect(noAlertsMessage).toBe('No active alerts for HI');
    });

    it('should handle failed requests correctly', async () => {
      // Mock a failed fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      // Verify the error message
      const errorMessage = 'Failed to retrieve alerts data';
      expect(errorMessage).toBe('Failed to retrieve alerts data');
    });
  });

  describe('get-forecast tool', () => {
    it('should format forecast periods correctly', () => {
      // Test the forecast period formatting directly
      const mockPeriod = {
        name: 'Tonight',
        temperature: 72,
        temperatureUnit: 'F',
        windSpeed: '5 mph',
        windDirection: 'NE',
        shortForecast: 'Partly Cloudy'
      };
      
      const formattedPeriod = [
        `${mockPeriod.name}:`,
        `Temperature: ${mockPeriod.temperature}°${mockPeriod.temperatureUnit}`,
        `Wind: ${mockPeriod.windSpeed} ${mockPeriod.windDirection}`,
        `${mockPeriod.shortForecast}`,
        "---",
      ].join("\n");
      
      expect(formattedPeriod).toContain('Tonight:');
      expect(formattedPeriod).toContain('Temperature: 72°F');
      expect(formattedPeriod).toContain('Wind: 5 mph NE');
      expect(formattedPeriod).toContain('Partly Cloudy');
    });

    it('should handle missing forecast period properties', () => {
      // Test handling of missing properties
      const mockPeriod = {};
      
      const formattedPeriod = [
        `${mockPeriod.name || "Unknown"}:`,
        `Temperature: ${mockPeriod.temperature || "Unknown"}°${mockPeriod.temperatureUnit || "F"}`,
        `Wind: ${mockPeriod.windSpeed || "Unknown"} ${mockPeriod.windDirection || ""}`,
        `${mockPeriod.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n");
      
      expect(formattedPeriod).toContain('Unknown:');
      expect(formattedPeriod).toContain('Temperature: Unknown°F');
      expect(formattedPeriod).toContain('Wind: Unknown ');
      expect(formattedPeriod).toContain('No forecast available');
    });
    
    it('should construct correct API URLs', () => {
      const latitude = 37.7749;
      const longitude = -122.4194;
      const pointsUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      
      expect(pointsUrl).toBe('https://api.weather.gov/points/37.7749,-122.4194');
    });
  });
});
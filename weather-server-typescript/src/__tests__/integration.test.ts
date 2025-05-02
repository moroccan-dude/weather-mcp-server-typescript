// @ts-nocheck
import { jest, describe, it, expect } from '@jest/globals';
import { __test__ } from '../index.js';

// Extract the makeNWSRequest function for testing
const { makeNWSRequest } = __test__;

// This test file contains integration tests that make actual API calls
// These tests are marked with 'integration' to allow them to be skipped in CI environments

describe('Weather API Integration Tests', () => {
  // Set longer timeout for API calls
  jest.setTimeout(10000);

  it('should successfully fetch data from the NWS API', async () => {
    // Test a real API call to the National Weather Service
    // Using San Francisco coordinates
    const latitude = 37.7749;
    const longitude = -122.4194;
    const pointsUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Make the actual API call
    const result = await makeNWSRequest(pointsUrl);
    
    // Verify we got a successful response
    expect(result).not.toBeNull();
    
    // Verify the response has the expected structure
    expect(result).toHaveProperty('properties');
    expect(result.properties).toHaveProperty('forecast');
    
    // Get the forecast URL from the points response
    const forecastUrl = result.properties.forecast;
    expect(forecastUrl).toMatch(/^https:\/\/api\.weather\.gov\/gridpoints\/.*\/forecast/);
    
    // Now fetch the actual forecast
    const forecastResult = await makeNWSRequest(forecastUrl);
    
    // Verify we got a successful forecast response
    expect(forecastResult).not.toBeNull();
    expect(forecastResult).toHaveProperty('properties');
    expect(forecastResult.properties).toHaveProperty('periods');
    expect(Array.isArray(forecastResult.properties.periods)).toBe(true);
    
    // Check that we have at least one forecast period
    expect(forecastResult.properties.periods.length).toBeGreaterThan(0);
    
    // Check the structure of the first forecast period
    const firstPeriod = forecastResult.properties.periods[0];
    expect(firstPeriod).toHaveProperty('name');
    expect(firstPeriod).toHaveProperty('temperature');
    expect(firstPeriod).toHaveProperty('temperatureUnit');
    expect(firstPeriod).toHaveProperty('windSpeed');
    expect(firstPeriod).toHaveProperty('windDirection');
    expect(firstPeriod).toHaveProperty('shortForecast');
    
    console.log('Successfully fetched weather forecast for San Francisco:');
    console.log(`${firstPeriod.name}: ${firstPeriod.temperature}°${firstPeriod.temperatureUnit}, ${firstPeriod.shortForecast}`);
  });

  it('should successfully fetch weather alerts for a state', async () => {
    // Test a real API call to get weather alerts for California
    const stateCode = 'CA';
    const alertsUrl = `https://api.weather.gov/alerts?area=${stateCode}`;
    
    // Make the actual API call
    const result = await makeNWSRequest(alertsUrl);
    
    // Verify we got a successful response
    expect(result).not.toBeNull();
    
    // Verify the response has the expected structure
    expect(result).toHaveProperty('features');
    expect(Array.isArray(result.features)).toBe(true);
    
    // Log the number of active alerts
    console.log(`Successfully fetched weather alerts for ${stateCode}:`);
    console.log(`Number of active alerts: ${result.features.length}`);
    
    // If there are alerts, check the structure of the first one
    if (result.features.length > 0) {
      const firstAlert = result.features[0];
      expect(firstAlert).toHaveProperty('properties');
      expect(firstAlert.properties).toHaveProperty('event');
      expect(firstAlert.properties).toHaveProperty('areaDesc');
      
      console.log(`First alert: ${firstAlert.properties.event} for ${firstAlert.properties.areaDesc}`);
    } else {
      console.log('No active alerts at this time.');
    }
  });
});
/**
 * Weather service for fetching weather data from OpenWeatherMap API.
 * Alert history is stored in Supabase (`weatherAlertsStore.js`).
 */

import { storeWeatherAlert as storeAlert, getUserWeatherAlerts as getUserAlerts } from './weatherAlertsStore'

// OpenWeatherMap API key (should be stored in environment variable)
// For now, using a placeholder - in production, use process.env.VITE_WEATHER_API_KEY
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || 'your-api-key-here'
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5'

/**
 * Fetch current weather for given coordinates
 */
export async function getCurrentWeather(latitude, longitude) {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your-api-key-here') {
    console.warn('Weather API key not configured')
    // Return mock data for development
    return {
      condition: 'Clear',
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      description: 'Clear sky',
      icon: '01d',
    }
  }

  try {
    const response = await fetch(
      `${WEATHER_API_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
    )
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      condition: data.weather[0]?.main || 'Unknown',
      temperature: Math.round(data.main?.temp || 0),
      humidity: data.main?.humidity || 0,
      windSpeed: data.wind?.speed || 0,
      description: data.weather[0]?.description || '',
      icon: data.weather[0]?.icon || '',
      feelsLike: Math.round(data.main?.feels_like || 0),
      pressure: data.main?.pressure || 0,
      visibility: data.visibility ? data.visibility / 1000 : null, // Convert to km
      timestamp: Date.now(),
    }
  } catch (err) {
    console.error('Failed to fetch weather:', err)
    // Return mock data on error
    return {
      condition: 'Unknown',
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      description: 'Weather data unavailable',
      icon: '',
      error: err.message,
    }
  }
}

/**
 * Fetch weather forecast for given coordinates
 */
export async function getWeatherForecast(latitude, longitude) {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your-api-key-here') {
    return null
  }

  try {
    const response = await fetch(
      `${WEATHER_API_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
    )
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()
    return data.list?.slice(0, 5).map((item) => ({
      date: new Date(item.dt * 1000),
      condition: item.weather[0]?.main || 'Unknown',
      temperature: Math.round(item.main?.temp || 0),
      description: item.weather[0]?.description || '',
      icon: item.weather[0]?.icon || '',
    })) || []
  } catch (err) {
    console.error('Failed to fetch weather forecast:', err)
    return null
  }
}

/**
 * Check if weather conditions require an alert
 */
export function shouldSendWeatherAlert(weatherData) {
  if (!weatherData) return false

  const { condition, temperature, humidity, windSpeed } = weatherData

  // Alert conditions:
  // - Extreme temperatures (< 5°C or > 35°C)
  // - High humidity (> 80%)
  // - Strong winds (> 20 m/s)
  // - Severe weather conditions
  const severeConditions = ['Thunderstorm', 'Heavy Rain', 'Snow', 'Extreme']
  
  return (
    severeConditions.includes(condition) ||
    temperature < 5 ||
    temperature > 35 ||
    humidity > 80 ||
    windSpeed > 20
  )
}

/**
 * Store weather alert in Supabase
 */
export async function storeWeatherAlert(userId, weatherData, alertType = 'weather') {
  return storeAlert(userId, weatherData, alertType)
}

/**
 * Get weather alerts for a user
 */
export async function getUserWeatherAlerts(userId, limit = 10) {
  return getUserAlerts(userId, limit)
}

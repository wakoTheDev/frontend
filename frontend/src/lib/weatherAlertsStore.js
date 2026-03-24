/**
 * Weather alert history — Supabase (`public.weather_alerts`).
 * See docs/supabase_schema.sql for table + RLS.
 */
import { supabase } from './supabaseClient'

const TABLE = 'weather_alerts'

export async function storeWeatherAlert(userId, weatherData, alertType = 'weather') {
  if (!supabase || !userId) return

  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    weather_data: weatherData,
    alert_type: alertType,
    read: false,
  })

  if (error) {
    console.error('Supabase storeWeatherAlert error:', error)
  }
}

/**
 * @returns {Promise<Array<{ id: string, userId: string, weatherData: object, alertType: string, read: boolean, timestamp: string }>>}
 */
export async function getUserWeatherAlerts(userId, limit = 10) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Supabase getUserWeatherAlerts error:', error)
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    weatherData: row.weather_data,
    alertType: row.alert_type,
    read: row.read,
    timestamp: row.created_at,
  }))
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vzqygudwmdayjavyqemj.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cXlndWR3bWRheWphdnlxZW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTA4NDEsImV4cCI6MjA5MTYyNjg0MX0.hf-v7X7WJqCle-ljevjmnJ5zxkCA6johnFhrA9qV2CI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function fetchV200Stocks() {
  const { data, error } = await supabase
    .from('v200_stocks')
    .select('*')
    .order('quality_score', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchLastPipelineRun() {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

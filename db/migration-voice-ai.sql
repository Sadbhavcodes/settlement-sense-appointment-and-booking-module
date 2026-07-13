-- Store AI configuration
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_api_key TEXT,
  vapi_assistant_id TEXT,
  twilio_phone_number TEXT,
  custom_system_prompt TEXT,
  greeting_message TEXT DEFAULT 'Hello! Thank you for calling our clinic. I am your AI receptionist. How can I help you book your appointment today?',
  voice_id TEXT DEFAULT 'en-US-neutral-1',
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store call logs, recordings, and transcripts
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  call_sid TEXT UNIQUE,
  direction TEXT DEFAULT 'incoming',
  status TEXT DEFAULT 'completed',
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT,
  recording_url TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS call_logs_phone_idx ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS call_logs_call_sid_idx ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS call_logs_created_at_idx ON call_logs(created_at DESC);

-- Trigger to update updated_at on ai_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ai_settings_updated_at ON ai_settings;
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
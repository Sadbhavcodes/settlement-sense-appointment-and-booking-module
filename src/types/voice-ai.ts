export interface HospitalAISettings {
  id: string;
  hospital_id: string;
  vapi_api_key: string | null;
  vapi_assistant_id: string | null;
  twilio_phone_number: string | null;
  custom_system_prompt: string | null;
  greeting_message: string;
  voice_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  hospital_id: string;
  patient_id: string | null;
  booking_id: string | null;
  phone_number: string;
  call_sid: string | null;
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'busy' | 'no-answer' | 'failed' | 'in-progress';
  duration_seconds: number;
  transcript: string | null;
  recording_url: string | null;
  ai_summary: string | null;
  created_at: string;
  patient_name?: string;
  patient_phone?: string;
  booking_token?: string;
}

export interface VoiceBookingWebhookRequest {
  action: 'check_patient' | 'get_doctors' | 'register_patient' | 'create_booking' | 'save_call_log';
  hospitalId: string;
  phone_number?: string;
  patient_data?: {
    first_name: string;
    last_name?: string;
    gender: 'male' | 'female' | 'other';
    date_of_birth: string;
    phone: string;
    email?: string;
  };
  doctor_id?: string;
  department_id?: string;
  appointment_date?: string;
  call_log_data?: {
    call_sid: string;
    phone_number: string;
    direction: 'incoming' | 'outgoing';
    status: 'completed' | 'busy' | 'no-answer' | 'failed';
    duration_seconds: number;
    transcript: string;
    recording_url: string;
    ai_summary: string;
  };
}

export interface VoiceBookingWebhookResponse {
  success: boolean;
  data?: {
    patient?: {
      id: string;
      first_name: string;
      last_name: string;
      gender: string;
      date_of_birth: string;
      phone: string;
      email: string | null;
    };
    doctors?: Array<{
      id: string;
      name: string;
      specialization: string | null;
      consultation_fee: number;
      available: boolean;
    }>;
    booking?: {
      id: string;
      token: string;
      doctor_name: string;
      appointment_date: string;
      start_time: string;
      consultation_fee: number;
    };
    call_log?: {
      id: string;
    };
  };
  error?: string;
}

export interface VapiToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

export interface VapiToolResult {
  success: boolean;
  result: unknown;
  error?: string;
}
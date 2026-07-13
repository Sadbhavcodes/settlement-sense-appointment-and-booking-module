import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";

export async function GET() {
  try {
    const result = await query(`SELECT * FROM ai_settings LIMIT 1`);
    if (result.rows.length === 0) {
      // Create a default row if it doesn't exist
      const insertResult = await query(
        `INSERT INTO ai_settings (enabled) VALUES (false) RETURNING *`
      );
      return NextResponse.json({ success: true, settings: insertResult.rows[0] });
    }
    return NextResponse.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error("GET ai-settings error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      enabled,
      vapi_api_key,
      vapi_assistant_id,
      twilio_phone_number,
      greeting_message,
      custom_system_prompt,
      voice_id
    } = body;

    // Check if row exists
    const result = await query(`SELECT id FROM ai_settings LIMIT 1`);
    
    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO ai_settings (enabled, vapi_api_key, vapi_assistant_id, twilio_phone_number, greeting_message, custom_system_prompt, voice_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [enabled, vapi_api_key || null, vapi_assistant_id || null, twilio_phone_number || null, greeting_message || null, custom_system_prompt || null, voice_id || 'en-US-neutral-1']
      );
      return NextResponse.json({ success: true, settings: insertResult.rows[0] });
    } else {
      const id = result.rows[0].id;
      const updateResult = await query(
        `UPDATE ai_settings 
         SET enabled = $1, 
             vapi_api_key = $2, 
             vapi_assistant_id = $3, 
             twilio_phone_number = $4, 
             greeting_message = $5, 
             custom_system_prompt = $6, 
             voice_id = $7,
             updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [enabled, vapi_api_key || null, vapi_assistant_id || null, twilio_phone_number || null, greeting_message || null, custom_system_prompt || null, voice_id || 'en-US-neutral-1', id]
      );
      return NextResponse.json({ success: true, settings: updateResult.rows[0] });
    }
  } catch (error) {
    console.error("PUT ai-settings error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

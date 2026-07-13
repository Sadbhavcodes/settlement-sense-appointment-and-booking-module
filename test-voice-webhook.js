/**
 * Automated Test for Voice Webhook
 * Run with: node test-voice-webhook.js
 */
const http = require('http');

const HOST = 'http://localhost:3000';
const HOSPITAL_ID = '00000000-0000-0000-0000-000000000000'; // Needs to be a valid UUID for actual testing
const API_KEY = 'sk-test-vapi-key';

async function testWebhook() {
  console.log("== Testing Voice Webhook API ==");
  
  // NOTE: For a real test, the server needs to be running and a valid hospital_id/api_key must be configured.
  // This script demonstrates the payload structures expected by the Next.js API route.
  
  console.log(`\n1. Testing GET /api/webhooks/voice-booking?action=check_patient`);
  const getUrl = `${HOST}/api/webhooks/voice-booking?hospitalId=${HOSPITAL_ID}&action=check_patient&phone_number=%2B15551234567`;
  console.log(`GET ${getUrl}`);
  console.log(`Headers: { "x-api-key": "${API_KEY}" }`);
  
  console.log(`\n2. Testing POST /api/webhooks/voice-booking (action=register_patient)`);
  const registerPayload = {
    action: "register_patient",
    patient_data: {
      first_name: "Test",
      last_name: "Patient",
      gender: "Male",
      date_of_birth: "1990-01-01",
      phone: "+15550001111"
    }
  };
  console.log(`POST Payload:`, JSON.stringify(registerPayload, null, 2));

  console.log(`\n3. Testing POST /api/webhooks/voice-booking (action=create_booking)`);
  const bookingPayload = {
    action: "create_booking",
    patient_data: { phone: "+15550001111" },
    doctor_id: "uuid-of-doctor",
    appointment_date: new Date().toISOString().split('T')[0] // Today
  };
  console.log(`POST Payload:`, JSON.stringify(bookingPayload, null, 2));

  console.log(`\n✅ Test Script Created. Please run the Next.js server ('npm run dev') and ensure database has dummy data before sending real requests.`);
}

testWebhook();

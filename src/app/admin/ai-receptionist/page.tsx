import AIVoiceReceptionist from "@/components/admin/ai-voice-receptionist";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function Page() {
  return (
    <AuthGuard>
      <AIVoiceReceptionist />
    </AuthGuard>
  );
}
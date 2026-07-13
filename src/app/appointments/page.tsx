import AppointmentsPage from "@/components/appointments/appointments-page";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function Page() {
  return (
    <AuthGuard>
      <AppointmentsPage />
    </AuthGuard>
  );
}


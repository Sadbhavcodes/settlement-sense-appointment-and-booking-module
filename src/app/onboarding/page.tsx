import OnboardingWizard from "@/components/onboarding/onboarding-wizard";

export const metadata = {
  title: "Hospital Setup — Settlement Sense",
  description: "Configure your hospital profile to get started with the Appointment Journey module.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

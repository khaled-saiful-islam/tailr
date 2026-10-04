import { useMe } from "@/features/auth/api";
import { BriefView } from "./BriefView";
import { SetupView } from "./SetupView";

/** Today: the setup path until the radar is on, then the Morning Brief. */
export function TodayPage() {
  const { data: user } = useMe();
  return user?.onboarding_step === "done" ? <BriefView /> : <SetupView />;
}

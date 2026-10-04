import { useMe } from "@/features/auth/api";
import { BriefView } from "./BriefView";
import { SetupView } from "./SetupView";

/** Home: the three setup steps for a new account, then the latest jobs and what to do. */
export function TodayPage() {
  const { data: user } = useMe();
  return user?.onboarding_step === "done" ? <BriefView /> : <SetupView />;
}

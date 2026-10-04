import { ArrowRight, Scissors } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Spinner } from "@/components/ui/Spinner";
import { askToNotify } from "@/lib/browserNotifications";
import { useCreateKit, useKitForMatch, type Language } from "../api";
import { LANGUAGE_OPTIONS } from "../options";

/** Start a kit for this job, or open the one already made. */
export function TailorAction({ matchId }: { matchId: string }) {
  const existing = useKitForMatch(matchId);
  const create = useCreateKit();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");

  if (existing.isPending) {
    return (
      <Button className="w-full" variant="tape" loading>
        Tailor my application
      </Button>
    );
  }
  if (existing.data) {
    const building = existing.data.status === "building";
    return (
      <>
        <Button
          asChild
          className="w-full"
          variant={building ? "secondary" : "tape"}
        >
          <Link to={`/kits/${existing.data.id}`}>
            {building && <Spinner className="size-4" label="Tailoring" />}
            {building ? "Tailoring your application" : "Open my application"}
            {!building && <ArrowRight className="size-4" aria-hidden />}
          </Link>
        </Button>
        <p className="mt-2 text-center text-[0.8125rem] text-ink-3">
          {building
            ? "Keep browsing. Tailr will let you know when it's ready."
            : "Resume, cover letter, answers and interview prep."}
        </p>
      </>
    );
  }

  // Tailoring runs in the background; Tailr says when it's ready.
  const start = () => {
    askToNotify();
    create.mutate(
      { match_id: matchId, language, tone: "confident" },
      {
        onSuccess: (kit) =>
          toast.success("Tailoring your application", {
            description:
              "It takes about half a minute. Keep browsing; Tailr will let you know when it's ready.",
            action: {
              label: "Watch",
              onClick: () => navigate(`/kits/${kit.id}`),
            },
          }),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col items-stretch gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.875rem] text-ink-2">Write it in</span>
        <Segmented
          size="sm"
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={setLanguage}
        />
      </div>
      <Button
        className="w-full"
        variant="tape"
        icon={<Scissors className="size-4" />}
        loading={create.isPending}
        onClick={start}
      >
        Tailor my application
      </Button>
      <p className="text-center text-[0.8125rem] text-ink-3">
        A resume, cover letter and answers made for this job, using only what's
        in your profile.
      </p>
    </div>
  );
}

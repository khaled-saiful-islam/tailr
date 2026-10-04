import { useMatches, type Brief } from "@/features/brief/api";
import { SearchBanner } from "@/features/brief/components/BriefProgress";
import { BestMatches } from "./BestMatches";

/** While a search runs: a slim banner, and the jobs found before, still there to open. */
export function WhileSearching({ brief }: { brief: Brief }) {
  const earlier = useMatches("all");
  const page = earlier.data;
  const best = [...(page?.items ?? [])].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-col gap-6">
      <SearchBanner brief={brief} />
      {best.length > 0 && (
        <BestMatches
          matches={best}
          total={page?.total ?? best.length}
          note="From earlier searches"
        />
      )}
    </div>
  );
}

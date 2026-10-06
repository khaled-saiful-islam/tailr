import { useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Panel } from "@/components/ui/controls";
import { usePageSettings, useSavePage } from "@/features/public-page/api";
import { AddressField } from "@/features/public-page/components/PublishPanel";
import { copyText } from "@/lib/clipboard";
import { cvKey, type Cv } from "../api";

const EXPLAIN = {
  off: "Only you can see it. Download the PDF to send it yourself.",
  link: "Anyone with the link can view and download it. Search engines are asked not to list it.",
  public: "Anyone can find it, including search engines.",
} as const;

/** Share the CV as a link: a page that shows it and offers the PDF. */
export function SharePanel({
  cv,
  visibility,
  onVisibility,
}: {
  cv: Cv;
  visibility: Cv["visibility"];
  onVisibility: (visibility: Cv["visibility"]) => void;
}) {
  const identity = usePageSettings();
  const saveIdentity = useSavePage();
  const client = useQueryClient();
  const live = cv.visibility !== "off";

  return (
    <Panel
      title="Share"
      description="Send a link instead of an attachment. Your phone number never appears on a shared CV."
    >
      <Segmented
        label="Who can see your CV"
        options={[
          { value: "off", label: "Off" },
          { value: "link", label: "Anyone with the link" },
          { value: "public", label: "Public" },
        ]}
        value={visibility}
        onChange={onVisibility}
      />
      <p className="mt-3 text-[0.9375rem] text-ink-2">{EXPLAIN[visibility]}</p>

      {identity.data && (
        <AddressField
          path="cv"
          current={identity.data.slug}
          url={cv.url}
          onSave={(slug) => {
            if (!identity.data) return;
            saveIdentity.mutate(
              { version: identity.data.version, slug },
              {
                onSuccess: () => {
                  void client.invalidateQueries({ queryKey: cvKey });
                  toast.success("Address changed");
                },
                onError: (error) => toast.error(error.message),
              },
            );
          }}
        />
      )}

      {live && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy className="size-3.5" />}
            onClick={() => void copyText(cv.url, "Link")}
          >
            Copy link
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href={cv.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden />
              Open
            </a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href="/api/v1/public-profile/qr.svg?page=cv" download>
              <QrCode className="size-3.5" aria-hidden />
              QR code
            </a>
          </Button>
        </div>
      )}
    </Panel>
  );
}

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useUploadImage, type ImageOut } from "../api";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 8 * 1024 * 1024;

/** A button that uploads one picture (checked, cleaned and resized by the server). */
export function ImagePicker({
  purpose,
  label,
  onUploaded,
  size = "sm",
}: {
  purpose: "avatar" | "project";
  label: string;
  onUploaded: (image: ImageOut) => void;
  size?: "sm" | "md";
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("That picture is larger than 8 MB.");
      return;
    }
    upload.mutate(
      { file, purpose },
      {
        onSuccess: onUploaded,
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        size={size}
        variant="secondary"
        icon={<ImagePlus className="size-3.5" />}
        loading={upload.isPending}
        onClick={() => input.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

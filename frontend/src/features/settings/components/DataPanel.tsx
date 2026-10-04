import { Download, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { PasswordField } from "@/components/ui/Field";
import { EXPORT_URL, useDeleteAccount } from "../api";

const GOES = [
  "Your profile, uploaded CVs and job preferences",
  "Every job Tailr found for you, and every prepared application",
  "Your CV, your website and its messages",
  "My applications, your weekly goal and days in a row",
  "Every picture you uploaded",
];

function DeleteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const remove = useDeleteAccount();
  const navigate = useNavigate();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    if (!password) {
      setProblem("Enter your password to confirm.");
      return;
    }
    remove.mutate(password, {
      onSuccess: () => {
        toast("Your account and everything in it are deleted.");
        navigate("/sign-in", { replace: true });
      },
      onError: (error) => setProblem(error.message),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword("");
          setProblem(null);
        }
        onOpenChange(next);
      }}
      title="Delete your account?"
      description="This can't be undone. These go for good:"
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] text-ink-2">
          {GOES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-[0.875rem] text-ink-3">
          Want to keep a copy? Download it first. Shared links to your CV and
          website stop working straight away.
        </p>
        <PasswordField
          label="Your password"
          autoComplete="current-password"
          value={password}
          error={problem ?? undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Keep my account
          </Button>
          <Button type="submit" variant="danger" loading={remove.isPending}>
            Delete everything
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** A copy of everything, or nothing at all. */
export function DataPanel() {
  const [deleting, setDeleting] = useState(false);
  return (
    <Panel
      id="data"
      title="Your data"
      description="It's yours: take a copy any time, or delete your account."
    >
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="type-heading text-[1.0625rem]">Download a copy</h3>
          <p className="mt-1 max-w-[38rem] text-[0.9375rem] text-ink-2">
            One JSON file with your profile, the jobs Tailr found, your prepared
            applications, CV, website, My applications and AI use. Pictures are
            listed by their address.
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <a href={EXPORT_URL} download>
              <Download className="size-4" aria-hidden />
              Download my data
            </a>
          </Button>
        </div>
        <div className="border-t border-line pt-6">
          <h3 className="type-heading text-[1.0625rem]">Delete your account</h3>
          <p className="mt-1 max-w-[38rem] text-[0.9375rem] text-ink-2">
            Removes your account and everything in it, including your public CV
            and website.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDeleting(true)}
          >
            Delete my account
          </Button>
        </div>
      </div>
      <DeleteDialog open={deleting} onOpenChange={setDeleting} />
    </Panel>
  );
}

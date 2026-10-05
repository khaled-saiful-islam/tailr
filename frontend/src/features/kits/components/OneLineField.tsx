import { Labelled, TextArea } from "@/components/ui/controls";

/**
 * A one-line field that wraps instead of cutting long text off on a phone. Enter doesn't
 * add a line break, and pasted breaks become spaces.
 */
export function OneLineField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Labelled label={label} htmlFor={id}>
      <TextArea
        id={id}
        rows={1}
        value={value}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        onChange={(event) =>
          onChange(event.target.value.replace(/\s*\n\s*/g, " "))
        }
      />
    </Labelled>
  );
}

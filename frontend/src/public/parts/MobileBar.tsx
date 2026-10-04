import type { TemplateProps } from "../types";
import { ContactAction, CvAction, ShareAction } from "./actions";

/**
 * On phones the actions sit in a bar at the bottom, in reach of a thumb.
 * Sticky (not fixed), so it also stays inside the owner's preview frame.
 */
export function MobileBar({
  page,
  preview,
  bar,
  primary,
  secondary,
  menu,
  hideAt = "@5xl:hidden",
}: TemplateProps & {
  bar: string;
  primary: string;
  secondary: string;
  menu?: string;
  /** Container size from which the page shows its own actions instead. */
  hideAt?: string;
}) {
  const item =
    "inline-flex min-h-11 w-full items-center justify-center gap-1.5 px-2";
  return (
    <div className={`sticky bottom-0 z-20 px-3 py-2.5 ${bar} ${hideAt}`}>
      <div className="mx-auto grid max-w-[34rem] auto-cols-fr grid-flow-col gap-2">
        {page.has_contact && (
          <ContactAction
            page={page}
            preview={preview}
            className={`${item} ${primary}`}
          >
            Email
          </ContactAction>
        )}
        {page.cv_url && (
          <CvAction
            page={page}
            preview={preview}
            className={`${item} ${secondary}`}
          >
            CV
          </CvAction>
        )}
        <ShareAction
          page={page}
          up
          className={`${item} ${secondary}`}
          menuClassName={menu}
        />
      </div>
    </div>
  );
}

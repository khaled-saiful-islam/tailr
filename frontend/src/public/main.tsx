/**
 * Public pages: a portfolio (/p/<slug>) or a shared CV (/cv/<slug>). The server
 * writes the page data into the HTML, so this renders at once without another request.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CvViewer, type SharedCv } from "./CvViewer";
import { NotAvailable } from "./NotAvailable";
import { PageView } from "./PageView";
import type { PublicPage } from "./types";

type PageData =
  ({ kind: "portfolio" } & PublicPage) | ({ kind: "cv" } & SharedCv);
import "./public.css";

function readPage(): PageData | null {
  try {
    const raw = document.getElementById("page-data")?.textContent;
    return raw ? (JSON.parse(raw) as PageData | null) : null;
  } catch {
    return null;
  }
}

const root = document.getElementById("root");
if (root) {
  const page = readPage();
  createRoot(root).render(
    <StrictMode>
      {page === null ? (
        <NotAvailable />
      ) : page.kind === "cv" ? (
        <CvViewer cv={page} />
      ) : (
        <PageView page={page} />
      )}
    </StrictMode>,
  );
}

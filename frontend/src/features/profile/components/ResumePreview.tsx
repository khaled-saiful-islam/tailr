import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatRange, formatYearMonth, skillCategoryLabel, type ProfileDoc, type SkillCategory } from "../types";

const PAGE_WIDTH = 794; // A4 at 96 dpi
const PAGE_MIN_HEIGHT = 1123;
const CATEGORY_ORDER: SkillCategory[] = ["technical", "tool", "domain", "soft"];

/**
 * A live, to-scale resume page. It uses the same single-column, ATS-safe
 * structure as the PDFs Tailr generates, so what you see is what employers get.
 */
export function ResumePreview({ doc, className }: { doc: ProfileDoc; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(PAGE_MIN_HEIGHT);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setScale(el.clientWidth / PAGE_WIDTH);
      setHeight(Math.max(PAGE_MIN_HEIGHT, page.current?.scrollHeight ?? PAGE_MIN_HEIGHT));
    });
    observer.observe(el);
    if (page.current) observer.observe(page.current);
    return () => observer.disconnect();
  }, []);

  const b = doc.basics;
  const contact = [b.location, b.email, b.phone, ...b.links.map((l) => l.url)].filter(Boolean);
  const skillsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    names: doc.skills.filter((s) => s.category === category).map((s) => s.name),
  })).filter((group) => group.names.length);
  const empty = !b.full_name && !doc.experiences.length && !doc.education.length;

  return (
    <div ref={frame} className={cn("relative w-full", className)} style={{ height: height * scale }}>
      <div
        ref={page}
        aria-label="Resume preview"
        className="absolute left-0 top-0 origin-top-left rounded-doc bg-white text-[#14171f] shadow-sheet"
        style={{
          width: PAGE_WIDTH,
          minHeight: PAGE_MIN_HEIGHT,
          transform: `scale(${scale})`,
          padding: "56px 64px",
          fontFamily: '"Helvetica Neue", Arial, "Liberation Sans", sans-serif',
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        {empty ? (
          <PlaceholderLines />
        ) : (
          <>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>{b.full_name}</h2>
            {b.headline && <p style={{ fontSize: 16, color: "#3d4454", margin: "2px 0 0" }}>{b.headline}</p>}
            {contact.length > 0 && (
              <p style={{ fontSize: 12.5, color: "#545b6b", margin: "8px 0 0", overflowWrap: "anywhere" }}>
                {contact.join("  |  ")}
              </p>
            )}
            {b.summary && (
              <Section title="Summary">
                <p style={{ margin: 0 }}>{b.summary}</p>
              </Section>
            )}
            {doc.experiences.length > 0 && (
              <Section title="Work Experience">
                {doc.experiences.map((e) => (
                  <div key={e.id} style={{ marginBottom: 12 }}>
                    <Row
                      left={
                        <>
                          <strong>{e.title || "Role"}</strong>
                          {e.company ? `, ${e.company}` : ""}
                        </>
                      }
                      right={formatRange(e.start, e.end, e.current)}
                    />
                    {e.location && <p style={{ margin: 0, fontSize: 12.5, color: "#545b6b" }}>{e.location}</p>}
                    <Bullets items={e.bullets.map((x) => x.text)} />
                  </div>
                ))}
              </Section>
            )}
            {doc.projects.length > 0 && (
              <Section title="Projects">
                {doc.projects.map((p) => (
                  <div key={p.id} style={{ marginBottom: 10 }}>
                    <Row left={<strong>{p.name}</strong>} right={p.role ?? ""} />
                    {p.summary && <p style={{ margin: "2px 0 0" }}>{p.summary}</p>}
                    <Bullets items={p.bullets.map((x) => x.text)} />
                  </div>
                ))}
              </Section>
            )}
            {doc.education.length > 0 && (
              <Section title="Education">
                {doc.education.map((e) => (
                  <div key={e.id} style={{ marginBottom: 8 }}>
                    <Row
                      left={
                        <>
                          <strong>{[e.qualification, e.field].filter(Boolean).join(", ") || e.institution}</strong>
                          {e.qualification || e.field ? `, ${e.institution}` : ""}
                        </>
                      }
                      right={[e.start_year, e.end_year].filter(Boolean).join(" – ")}
                    />
                    {e.grade && <p style={{ margin: 0, fontSize: 12.5, color: "#545b6b" }}>{e.grade}</p>}
                  </div>
                ))}
              </Section>
            )}
            {skillsByCategory.length > 0 && (
              <Section title="Skills">
                {skillsByCategory.map((group) => (
                  <p key={group.category} style={{ margin: "0 0 4px" }}>
                    <strong>{skillCategoryLabel[group.category]}:</strong> {group.names.join(", ")}
                  </p>
                ))}
              </Section>
            )}
            {doc.certifications.length > 0 && (
              <Section title="Certifications">
                {doc.certifications.map((c) => (
                  <Row
                    key={c.id}
                    left={
                      <>
                        {c.name}
                        {c.issuer ? `, ${c.issuer}` : ""}
                      </>
                    }
                    right={formatYearMonth(c.issued)}
                  />
                ))}
              </Section>
            )}
            {doc.languages.length > 0 && (
              <Section title="Languages">
                <p style={{ margin: 0 }}>
                  {doc.languages.map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name)).join(", ")}
                </p>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: "#14213d",
          borderBottom: "1.5px solid #14213d",
          paddingBottom: 3,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
      <p style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{left}</p>
      {right && <span style={{ fontSize: 12.5, color: "#545b6b", whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  const filled = items.filter((text) => text.trim());
  if (!filled.length) return null;
  return (
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyleType: "disc" }}>
      {filled.map((text, index) => (
        <li key={index} style={{ marginBottom: 2 }}>
          {text}
        </li>
      ))}
    </ul>
  );
}

function PlaceholderLines() {
  const widths = [38, 24, 52, 0, 90, 84, 70, 0, 30, 88, 80, 86, 62, 0, 28, 75, 68];
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {widths.map((width, index) =>
        width === 0 ? (
          <div key={index} className="h-4" />
        ) : (
          <div key={index} className="h-3 rounded-full bg-[#e9edf3]" style={{ width: `${width}%` }} />
        ),
      )}
    </div>
  );
}

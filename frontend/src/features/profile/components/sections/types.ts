import type { BulletIssue, ProfileDoc } from "../../types";

export interface SectionProps {
  doc: ProfileDoc;
  update: (recipe: (doc: ProfileDoc) => ProfileDoc) => void;
  issues: Map<string, BulletIssue[]>;
}

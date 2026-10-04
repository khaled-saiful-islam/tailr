import type { PortfolioKit } from "../../portfolio/PortfolioSite";
import { Frame } from "./Frame";
import { Project } from "./Project";
import {
  About,
  Achievements,
  Contact,
  Expertise,
  Hero,
  Testimonials,
  Timeline,
  Work,
} from "./sections";

/** Blueprint: a technical spec sheet. For engineers, data and IT people. */
export const blueprint: PortfolioKit = {
  Frame,
  Hero,
  About,
  Expertise,
  Achievements,
  Work,
  Timeline,
  Testimonials,
  Contact,
  Project,
};

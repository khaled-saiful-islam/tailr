/**
 * Shared motion. Pages pick one moment to animate; everything respects reduced motion
 * (MotionConfig reducedMotion="user" in the app's providers).
 *
 * - Reveal: fade and rise into view, once.
 * - Stagger / StaggerItem: list items arriving one after another.
 * - CountUp: a number counting up to its value when it comes into view ("93%", "RM 12,000").
 * - CSS utilities: `hover-lift` (cards rise a little on hover), `press` (a quick give when
 *   pressed), `animate-pop` (menus and popovers open from their trigger).
 */
export { Reveal, EASE } from "./Reveal";
export { Stagger, StaggerItem } from "./Stagger";
export { CountUp } from "@/public/motion";

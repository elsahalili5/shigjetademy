import { Hero } from "../components/Hero";
import { Patchwork } from "../components/Patchwork";
import { BeforeAfter } from "../components/BeforeAfter";
import { DayTimeline } from "../components/DayTimeline";
import { Workflow } from "../components/Workflow";
import { Roles } from "../components/Roles";
import { Anywhere } from "../components/Anywhere";
import { Testimonials } from "../components/Testimonials";
import { ClosingCta } from "../components/ClosingCta";
import { useTitle } from "../lib/router";

export function Home() {
  useTitle("Shigjetademy · Education management for schools and academies");
  return (
    <>
      <Hero />

      <BeforeAfter />
      <Roles />
      <Patchwork />

      <Anywhere />

      <DayTimeline />
      {/* <Workflow /> */}
      <Testimonials />
      <ClosingCta />
    </>
  );
}

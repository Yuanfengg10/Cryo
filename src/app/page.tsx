import { Activity, ArrowRight, CalendarClock, CircleDollarSign, Sparkles } from "lucide-react";

import { AddLeadForm } from "@/components/forms/add-lead-form";
import { RunDailySourcingForm } from "@/components/forms/run-daily-sourcing-form";
import { LeadCard } from "@/components/lead-card";
import { getAutomationStatus, getDashboardData } from "@/lib/lead-repository";
import { getSourcingSnapshot } from "@/lib/sourcing";

export const dynamic = "force-dynamic";

const sourcingLanes = [
  {
    key: "end_user",
    title: "Direct buyers",
    nextAction: "Start outreach"
  },
  {
    key: "competitor_customer",
    title: "Upgrade watchlist",
    nextAction: "Approach as upgrade lead"
  },
  {
    key: "distributor",
    title: "Distributors",
    nextAction: "Review internally first"
  },
  {
    key: "reseller_platform",
    title: "Platforms",
    nextAction: "Request listing terms"
  },
  {
    key: "monitor_only_competitor",
    title: "Monitor-only",
    nextAction: "Watch only"
  }
] as const;

const statusPriority: Record<string, number> = {
  ready_to_close: 0,
  warm: 1,
  followup_due: 2,
  contacted: 3,
  new: 4,
  closed: 5,
  dead: 6
};

export default async function Home() {
  const { activeLeads, dueToday } = await getDashboardData();
  const automationStatus = await getAutomationStatus();
  const sourcingSnapshot = await getSourcingSnapshot();
  const sortedLeads = [...activeLeads].sort((left, right) => {
    const statusDelta = (statusPriority[left.status] ?? 99) - (statusPriority[right.status] ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.businessName.localeCompare(right.businessName);
  });
  const readyToCloseCount = activeLeads.filter((lead) => lead.status === "ready_to_close").length;
  const directBuyerCount = sourcingSnapshot.candidates.filter((candidate) => candidate.leadCategory === "end_user").length;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">CryoLeads</p>
          <h1>Run sourcing, review the lead list, then work each lead from its own page.</h1>
          <p className="hero-text">
            The homepage is now intentionally simple. Let the agent source and organise leads here, then click into any lead to
            handle outreach, replies, follow-ups, and handoff decisions.
          </p>

          <div className="hero-actions">
            <RunDailySourcingForm />
            <a className="button button-secondary" href="#lead-list">
              Open lead list
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <aside className="hero-aside">
          <div className="hero-badge">
            <Sparkles size={18} />
            <span>Simple operating mode</span>
          </div>

          <div className="hero-stat-stack">
            <div className="hero-stat">
              <Activity size={18} />
              <div>
                <strong>{activeLeads.length}</strong>
                <span>leads in the working list</span>
              </div>
            </div>
            <div className="hero-stat">
              <CalendarClock size={18} />
              <div>
                <strong>{dueToday.length}</strong>
                <span>follow-ups due today</span>
              </div>
            </div>
            <div className="hero-stat">
              <CircleDollarSign size={18} />
              <div>
                <strong>{readyToCloseCount}</strong>
                <span>ready for you to close</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Daily flow</p>
              <h2>How to use the app</h2>
            </div>
          </div>

          <ol className="number-list">
            <li>Run today&apos;s sourcing.</li>
            <li>Review the lead list below.</li>
            <li>Click into a lead.</li>
            <li>Do the next step from the lead page.</li>
          </ol>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Automation status</p>
              <h2>Today&apos;s sourcing summary</h2>
            </div>
          </div>

          <div className="stack compact-stack">
            <p className="muted">Live sourcing ready: {automationStatus.liveSourcingReady ? "Yes" : "No"}</p>
            <p className="muted">Last run added: {automationStatus.lastImportedCount}</p>
            <p className="muted">Imported today: {automationStatus.totalImportedToday}</p>
            <p className="muted">Direct buyer candidates found: {directBuyerCount}</p>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sourcing lanes</p>
            <h2>What came in from today&apos;s sourcing</h2>
          </div>
          <span className="panel-kicker">{sourcingSnapshot.candidates.length} candidates</span>
        </div>

        <div className="search-play-grid">
          {sourcingLanes.map((lane) => {
            const laneCandidates = sourcingSnapshot.candidates.filter((candidate) => candidate.leadCategory === lane.key);

            return (
              <article className="search-play-card" key={lane.key}>
                <h3>{lane.title}</h3>
                <p className="muted">{laneCandidates.length} found</p>
                <p className="muted">{lane.nextAction}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel" id="lead-list">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lead list</p>
            <h2>Your working leads</h2>
          </div>
          <span className="panel-kicker">{sortedLeads.length} active</span>
        </div>

        <div className="stack">
          {sortedLeads.length ? (
            sortedLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
          ) : (
            <div className="empty-state large-empty-state">No leads yet. Run sourcing to build the list.</div>
          )}
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Optional</p>
              <h2>Add a lead manually</h2>
            </div>
          </div>

          <AddLeadForm />
        </section>
      </section>
    </main>
  );
}

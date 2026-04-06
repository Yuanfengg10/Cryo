import { Activity, ArrowRight, CalendarClock, CircleDollarSign, Sparkles } from "lucide-react";

import { handoffRules, leadQualificationChecklist, searchPlays, weeklyOperatingStandard } from "@/lib/agent-config";
import { ApprovalCard } from "@/components/approval-card";
import { AddLeadForm } from "@/components/forms/add-lead-form";
import { KnowledgeCard } from "@/components/knowledge-card";
import { ResetLeadsForm } from "@/components/forms/reset-leads-form";
import { ResetWeeklyMessagesForm } from "@/components/forms/reset-weekly-messages-form";
import { RunDailySourcingForm } from "@/components/forms/run-daily-sourcing-form";
import { LeadCard } from "@/components/lead-card";
import { SourcingCandidateCard } from "@/components/sourcing-candidate-card";
import { StatCard } from "@/components/stat-card";
import { getLeadHandoffReason } from "@/lib/handoff";
import { getAutomationStatus, getDashboardData } from "@/lib/lead-repository";
import { buildApprovalDrafts } from "@/lib/message-generator";
import { getSourcingSnapshot } from "@/lib/sourcing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { activeLeads, cityPerformance, dueToday, pipeline, pipelineMetrics, segmentAngles, weeklySummary } =
    await getDashboardData();
  const automationStatus = await getAutomationStatus();
  const sourcingSnapshot = await getSourcingSnapshot();
  const approvalQueue = await buildApprovalDrafts(activeLeads);
  const readyForHandoff = activeLeads.filter((lead) => lead.status === "ready_to_close").slice(0, 6);
  const sourcingLanes = [
    {
      key: "end_user",
      title: "Direct buyers",
      description: "Main end-user sales opportunities that fit the core outreach pipeline.",
      nextAction: "Recommended next action: start outreach and move qualified names into the approval queue."
    },
    {
      key: "competitor_customer",
      title: "Upgrade watchlist",
      description: "Possible current users of similar equipment who may be ready for upgrade or expansion.",
      nextAction: "Recommended next action: approach as a replacement or expansion conversation with proof-led messaging."
    },
    {
      key: "distributor",
      title: "Distributor opportunities",
      description: "Partner-style leads that may need management approval before deeper sharing.",
      nextAction: "Recommended next action: review internally first and only share deeper materials after management approval."
    },
    {
      key: "reseller_platform",
      title: "Platform opportunities",
      description: "Listing sites and reseller platforms for exposure, supplier onboarding, or marketplace cooperation.",
      nextAction: "Recommended next action: ask about listing requirements, onboarding process, and cooperation terms."
    },
    {
      key: "monitor_only_competitor",
      title: "Monitor-only competitors",
      description: "Visible for market intelligence only. Do not treat them like normal commercial leads.",
      nextAction: "Recommended next action: monitor publicly, capture evidence, and do not share sensitive documents."
    }
  ] as const;
  const hasLeads = activeLeads.length > 0;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">CryoLeads command centre</p>
          <h1>Personalised WhatsApp outreach, follow-ups, and pipeline visibility in one mobile-first app.</h1>
          <p className="hero-text">
            Designed for a solo operator selling premium cryotherapy equipment into Singapore and Malaysia. The app now uses a
            real data layer with a Supabase-ready path and mock fallback, so we can keep building workflows without blocking on
            credentials.
          </p>
          {!hasLeads ? (
            <div className="inline-notice">
              Your Supabase database is connected but currently empty. Run the sample seed file in
              <code> supabase/seed.sql </code>
              or add your first lead.
            </div>
          ) : null}

          <div className="hero-actions">
            <a className="button button-primary" href="#action-queue">
              Review today&apos;s queue
              <ArrowRight size={16} />
            </a>
            <a className="button button-secondary" href="#pipeline">
              See pipeline
            </a>
          </div>
        </div>

        <aside className="hero-aside">
          <div className="hero-badge">
            <Sparkles size={18} />
            <span>MVP foundation ready</span>
          </div>

          <div className="hero-stat-stack">
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
                <strong>EUR 17.8k</strong>
                <span>weighted commission in flight</span>
              </div>
            </div>
            <div className="hero-stat">
              <Activity size={18} />
              <div>
                <strong>{activeLeads.length}</strong>
                <span>active leads across SG + MY</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="stats-grid" aria-label="Core metrics">
        {pipelineMetrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="content-grid">
        <KnowledgeCard />

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Weekly pulse</p>
              <h2>Momentum snapshot</h2>
            </div>
            <ResetWeeklyMessagesForm />
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <span>Messages sent</span>
              <strong>{weeklySummary.messagesSent}</strong>
            </article>
            <article className="summary-card">
              <span>Replies received</span>
              <strong>{weeklySummary.repliesReceived}</strong>
            </article>
            <article className="summary-card">
              <span>New warm leads</span>
              <strong>{weeklySummary.newWarmLeads}</strong>
            </article>
            <article className="summary-card">
              <span>Ready to close</span>
              <strong>{weeklySummary.readyToClose}</strong>
            </article>
          </div>

          <div className="insight-block">
            <h3>Best-performing angles</h3>
            <ul className="plain-list">
              {segmentAngles.map((segment) => (
                <li key={segment.label}>
                  <strong>{segment.label}:</strong> {segment.angle}
                </li>
              ))}
            </ul>
          </div>

          <div className="insight-block">
            <h3>City reply rate</h3>
            <ul className="plain-list">
              {cityPerformance.map((city) => (
                <li key={city.city}>
                  <strong>{city.city}:</strong> {city.replyRate} · {city.note}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </section>

      <section className="content-grid">
        <section className="panel" id="action-queue">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Action queue</p>
              <h2>Today&apos;s follow-up priorities</h2>
            </div>
            <span className="panel-kicker">{dueToday.length} due now</span>
          </div>

          <div className="stack">
            {dueToday.length ? (
              dueToday.map((lead) => <LeadCard key={lead.id} lead={lead} />)
            ) : (
              <div className="empty-state large-empty-state">
                No follow-ups are due yet because your database has no live leads.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sourcing review</p>
            <h2>What the agent has found</h2>
          </div>
          <span className="panel-kicker">{sourcingSnapshot.candidates.length} candidates</span>
        </div>

        <p className="muted sourcing-caption">
          Provider: {sourcingSnapshot.provider} · Mode: {sourcingSnapshot.mode} · Searches: {sourcingSnapshot.searchesRun.length}
          {" · "}
          Auto-added today: {sourcingSnapshot.autoAddedCount}/{sourcingSnapshot.dailyTarget} above score {sourcingSnapshot.threshold}
          {" · "}
          Remaining today: {sourcingSnapshot.remainingToday}
        </p>

        <div className="search-play-grid">
          {sourcingLanes.map((lane) => {
            const laneCandidates = sourcingSnapshot.candidates.filter((candidate) => candidate.leadCategory === lane.key);

            return (
              <section className="search-play-card" key={lane.key}>
                <div className="panel-header compact-panel-header">
                  <div>
                    <h3>{lane.title}</h3>
                    <p className="muted">{lane.description}</p>
                    <p className="muted">{lane.nextAction}</p>
                  </div>
                  <span className="panel-kicker">{laneCandidates.length}</span>
                </div>

                <div className="stack compact-stack">
                  {laneCandidates.length ? (
                    laneCandidates.map((candidate) => (
                      <SourcingCandidateCard candidate={candidate} key={`${candidate.id}-${candidate.businessName}-${candidate.city}`} />
                    ))
                  ) : (
                    <div className="empty-state">No candidates in this lane right now.</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lead intake</p>
              <h2>Add a real lead manually if needed</h2>
            </div>
          </div>

          <AddLeadForm />
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Daily target</p>
              <h2>Agent sourcing goal</h2>
            </div>
            <span className="panel-kicker">{sourcingSnapshot.dailyTarget} leads/day</span>
          </div>

          <ol className="number-list">
            <li>The agent searches Singapore and Malaysia every day.</li>
            <li>Only leads above the quality threshold are auto-added.</li>
            <li>Your involvement starts at message approval, not lead entry.</li>
            <li>After generic Q&amp;A and continued interest, the lead is handed to you.</li>
          </ol>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Automation</p>
              <h2>Run and monitor daily sourcing</h2>
            </div>
          </div>

          <div className="stack">
            <article className="search-play-card">
              <h3>Status</h3>
              <p className="muted">Live sourcing ready: {automationStatus.liveSourcingReady ? "Yes" : "No"}</p>
              <p className="muted">Last run added: {automationStatus.lastImportedCount}</p>
              <p className="muted">
                Last run at: {automationStatus.lastRunAt ? automationStatus.lastRunAt : "No run recorded yet"}
              </p>
              <p className="muted">Imported today: {automationStatus.totalImportedToday}</p>
            </article>

            <RunDailySourcingForm />
          </div>
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Reset</p>
              <h2>Refresh the lead list</h2>
            </div>
          </div>

          <ResetLeadsForm />
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Scheduling</p>
              <h2>Production note</h2>
            </div>
          </div>

          <ul className="plain-list">
            <li>The dashboard preview does not auto-import anymore, so simply refreshing the app is safe.</li>
            <li>Vercel Cron is set to call the daily automation route at 9:00 AM Singapore time.</li>
            <li>The daily cap stays at 20 qualified leads unless we change it.</li>
          </ul>
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Handoff queue</p>
              <h2>Leads ready for Yuan</h2>
            </div>
            <span className="panel-kicker">{readyForHandoff.length} ready now</span>
          </div>

          <div className="stack">
            {readyForHandoff.length ? (
              readyForHandoff.map((lead) => (
                <article className="approval-card" key={`handoff-${lead.id}`}>
                  <div className="approval-header">
                    <div>
                      <p className="eyebrow">Ready to close</p>
                      <h3>{lead.businessName}</h3>
                      <p className="muted">
                        {lead.city} · {lead.businessType.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="approval-type approval-followup">handoff</span>
                  </div>

                  <p className="approval-reason">{getLeadHandoffReason(lead)}</p>

                  <div className="lead-actions">
                    <a className="button button-primary" href={`/leads/${lead.id}`}>
                      Open lead
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No leads have crossed the handoff threshold yet.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Approval queue</p>
              <h2>What the agent wants you to approve</h2>
            </div>
            <span className="panel-kicker">{approvalQueue.length} waiting</span>
          </div>

          <div className="stack">
            {approvalQueue.map((draft) => (
              <ApprovalCard key={draft.id} draft={draft} />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Agent rules</p>
              <h2>Current operating boundaries</h2>
            </div>
          </div>

          <ul className="plain-list">
            {handoffRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      </section>

      <section className="panel" id="pipeline">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h2>Sales stages at a glance</h2>
          </div>
          <span className="panel-kicker">Mobile scroll enabled</span>
        </div>

        <div className="pipeline-scroll">
          {pipeline.map((column) => (
            <section className="pipeline-column" key={column.key}>
              <header className="pipeline-header">
                <h3>{column.label}</h3>
                <span>{column.leads.length}</span>
              </header>

              <div className="pipeline-cards">
                {column.leads.length ? (
                  column.leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                ) : (
                  <div className="empty-state">No leads in this stage right now.</div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Search plays</p>
              <h2>Where the agent should hunt next</h2>
            </div>
          </div>

          <div className="search-play-grid">
            {searchPlays.map((play) => (
              <article className="search-play-card" key={play.title}>
                <h3>{play.title}</h3>
                <p className="muted">{play.description}</p>
                <ul className="plain-list compact-list">
                  {play.searches.map((search) => (
                    <li key={search}>
                      <code>{search}</code>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Qualification</p>
              <h2>Lead checklist from the manual</h2>
            </div>
          </div>

          <ul className="plain-list">
            {leadQualificationChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Weekly discipline</p>
              <h2>Operator standard from the manual</h2>
            </div>
          </div>

          <ul className="plain-list">
            {weeklyOperatingStandard.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Next build steps</p>
              <h2>Most important backend integrations</h2>
            </div>
          </div>

          <ul className="plain-list">
            <li>Deeper catalog and price-sheet ingestion from product materials.</li>
            <li>More lead enrichment around decision-makers, distributor types, and competitor-customer signals.</li>
            <li>Approval-driven outbound and inbound messaging queue with stronger memory.</li>
            <li>Handoff scoring once leads stay engaged after generic Q&amp;A.</li>
            <li>Verified WhatsApp automation once Meta business setup is ready.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}

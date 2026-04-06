import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleDollarSign, MessageSquare, Phone } from "lucide-react";

import { ApprovalCard } from "@/components/approval-card";
import { InboundWorkbench } from "@/components/forms/inbound-workbench";
import { RevertLeadButton } from "@/components/forms/revert-lead-button";
import { StatusPill } from "@/components/status-pill";
import { formatFollowUpLabel, getLeadById } from "@/lib/lead-repository";
import { buildApprovalDrafts } from "@/lib/message-generator";
import { getLastTouchLabel, getWhatsappHref } from "@/lib/mock-data";
import type { ApprovalDraft, Lead } from "@/lib/types";

type LeadDetailPageProps = {
  params: Promise<{
    leadId: string;
  }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params;
  const lead = await getLeadById(leadId);

  if (!lead) {
    notFound();
  }

  const [approvalDraft] = await buildApprovalDrafts([lead]);
  const workflow = getLeadWorkflow(lead, approvalDraft);
  const whatsappMessage = approvalDraft?.message ?? lead.generatedMessage;

  return (
    <main className="page-shell">
      <div className="detail-topbar">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>

      <section className="detail-hero">
        <div className="detail-main">
          <div className="detail-header">
            <div>
              <p className="eyebrow">Lead detail</p>
              <h1>{lead.businessName}</h1>
              <p className="hero-text">
                {lead.city} · {lead.businessType.replaceAll("_", " ")} · {lead.contactName ?? "No named contact yet"}
              </p>
            </div>
            <StatusPill status={lead.status} />
          </div>

          <div className="detail-actions">
            <a className="button button-primary" href={getWhatsappHref(lead.phone, whatsappMessage)} rel="noreferrer" target="_blank">
              <MessageSquare size={16} />
              Open WhatsApp
            </a>
            <a className="button button-secondary" href={`tel:${lead.phone}`}>
              <Phone size={16} />
              Call lead
            </a>
            {lead.status === "contacted" ? <RevertLeadButton leadId={lead.id} /> : null}
          </div>
        </div>

        <aside className="detail-sidebar">
          <div className="detail-stat-card">
            <CalendarClock size={18} />
            <div>
              <strong>{formatFollowUpLabel(lead.followUpDueAt)}</strong>
              <span>Suggested window: {lead.sendWindow}</span>
            </div>
          </div>

          <div className="detail-stat-card">
            <CircleDollarSign size={18} />
            <div>
              <strong>EUR {lead.projectedCommission.toLocaleString()}</strong>
              <span>{Math.round(lead.probability * 100)}% close probability</span>
            </div>
          </div>

          <div className="detail-facts">
            <div>
              <span>Phone</span>
              <strong>{lead.phone}</strong>
            </div>
            <div>
              <span>Last touch</span>
              <strong>{getLastTouchLabel(lead.lastContactedAt ?? lead.firstContactedAt)}</strong>
            </div>
            <div>
              <span>Lead type</span>
              <strong>{lead.leadType}</strong>
            </div>
            <div>
              <span>Intent</span>
              <strong>{lead.intentScore ?? "Not scored yet"}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="content-grid detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Next step</p>
              <h2>{workflow.title}</h2>
            </div>
          </div>

          <p className="hero-text">{workflow.description}</p>

          {approvalDraft ? (
            <>
              <p className="muted">Approve the draft here, then send it manually in WhatsApp.</p>
              <ApprovalCard draft={approvalDraft} />
            </>
          ) : (
            <div className="detail-message-card">
              <p>{workflow.helperText}</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Notes</p>
              <h2>Lead context</h2>
            </div>
          </div>

          <p className="hero-text">{lead.notes}</p>
        </section>
      </section>

      <InboundWorkbench lead={lead} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Conversation history</p>
            <h2>Timeline</h2>
          </div>
        </div>

        <div className="timeline">
          {lead.conversationHistory.length ? (
            lead.conversationHistory.map((event) => (
              <article className="timeline-item" key={event.id}>
                <div className={`timeline-badge ${event.direction}`}>{event.direction === "inbound" ? "Reply" : "Sent"}</div>
                <div>
                  <p className="timeline-time">{getLastTouchLabel(event.timestamp)}</p>
                  <p className="timeline-message">{event.message}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No conversation history yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}

function getLeadWorkflow(lead: Lead, draft?: ApprovalDraft) {
  if (draft?.type === "outbound") {
    return {
      title: "Approve the first message",
      description: "This lead is ready for first outreach. Review the message below, adjust it if needed, then send it manually in WhatsApp.",
      helperText: ""
    };
  }

  if (draft?.type === "followup") {
    return {
      title: "Review the next follow-up",
      description: "This lead is due for a follow-up. Keep the next message light, send it manually in WhatsApp, then wait for the reply.",
      helperText: ""
    };
  }

  if (lead.status === "ready_to_close") {
    return {
      title: "Take over this conversation",
      description: "The lead is warm enough for you to handle personally now. Use WhatsApp or call to move it toward a close.",
      helperText: "No draft is needed right now. This lead is already in your handoff stage."
    };
  }

  if (lead.status === "contacted" || lead.status === "warm") {
    return {
      title: "Wait for the next reply",
      description: "There is no outbound action needed right now. If the lead replies, paste the message into the inbound workbench below.",
      helperText: "Use the inbound workbench when the lead replies so the app can log the message, draft your response, and refresh the lead status."
    };
  }

  if (lead.status === "closed") {
    return {
      title: "Closed lead",
      description: "This lead is already closed, so there is nothing else to action from the workflow.",
      helperText: "Keep this page as reference only."
    };
  }

  if (lead.status === "dead") {
    return {
      title: "Inactive lead",
      description: "This lead is currently marked inactive.",
      helperText: "No next action is required unless you decide to reopen it later."
    };
  }

  return {
    title: "Review this lead",
    description: "Open WhatsApp when you're ready, or use the inbound workbench below if the lead messages you first.",
    helperText: "This lead currently does not have a queued draft."
  };
}

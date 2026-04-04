import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleDollarSign, MessageSquare, Phone } from "lucide-react";

import { InboundWorkbench } from "@/components/forms/inbound-workbench";
import { StatusPill } from "@/components/status-pill";
import { formatFollowUpLabel, getLeadById } from "@/lib/lead-repository";
import { getLastTouchLabel, getWhatsappHref } from "@/lib/mock-data";

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
            <a className="button button-primary" href={getWhatsappHref(lead.phone, lead.generatedMessage)} rel="noreferrer" target="_blank">
              <MessageSquare size={16} />
              Open WhatsApp draft
            </a>
            <a className="button button-secondary" href={`tel:${lead.phone}`}>
              <Phone size={16} />
              Call lead
            </a>
          </div>

          <div className="detail-message-card">
            <p className="eyebrow">Current AI opener</p>
            <p>{lead.generatedMessage}</p>
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

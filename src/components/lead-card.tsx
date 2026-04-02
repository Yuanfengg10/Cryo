import Link from "next/link";
import { ArrowUpRight, Clock3, MessageSquare } from "lucide-react";

import { RevertLeadButton } from "@/components/forms/revert-lead-button";
import { getLastTouchLabel, getWhatsappHref } from "@/lib/mock-data";
import type { Lead } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

type LeadCardProps = {
  lead: Lead;
};

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <article className="lead-card">
      <div className="lead-card-header">
        <div>
          <h3>{lead.businessName}</h3>
          <p className="muted">
            {lead.city} · {lead.businessType.replaceAll("_", " ")}
          </p>
        </div>
        <StatusPill status={lead.status} />
      </div>

      <p className="lead-message-preview">{lead.generatedMessage}</p>

      <dl className="lead-meta-grid">
        <div>
          <dt>Last touch</dt>
          <dd>{getLastTouchLabel(lead.lastContactedAt ?? lead.firstContactedAt)}</dd>
        </div>
        <div>
          <dt>Best send</dt>
          <dd>{lead.sendWindow}</dd>
        </div>
        <div>
          <dt>Projected commission</dt>
          <dd>EUR {lead.projectedCommission.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(lead.probability * 100)}%</dd>
        </div>
      </dl>

      <p className="lead-notes">{lead.notes}</p>

      <div className="lead-actions">
        <a className="button button-primary" href={getWhatsappHref(lead.phone, lead.generatedMessage)} target="_blank" rel="noreferrer">
          <MessageSquare size={16} />
          Open WhatsApp
        </a>
        <Link className="button button-secondary" href={`/leads/${lead.id}`}>
          <Clock3 size={16} />
          Log reply
        </Link>
        <Link className="button button-secondary" href={`/leads/${lead.id}`}>
          <ArrowUpRight size={16} />
          View lead
        </Link>
        {lead.status === "contacted" ? <RevertLeadButton leadId={lead.id} /> : null}
      </div>
    </article>
  );
}

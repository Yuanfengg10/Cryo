import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatFollowUpLabel } from "@/lib/lead-repository";
import type { Lead } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

type LeadCardProps = {
  lead: Lead;
};

export function LeadCard({ lead }: LeadCardProps) {
  const nextStep = getNextStepLabel(lead);

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

      <dl className="lead-meta-grid">
        <div>
          <dt>Contact</dt>
          <dd>{lead.contactName ?? "No named contact yet"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{lead.phone}</dd>
        </div>
        <div>
          <dt>Follow-up</dt>
          <dd>{formatFollowUpLabel(lead.followUpDueAt)}</dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>{nextStep}</dd>
        </div>
      </dl>

      <p className="lead-notes">{lead.notes}</p>

      <div className="lead-actions">
        <Link className="button button-primary" href={`/leads/${lead.id}`}>
          <ArrowUpRight size={16} />
          Open lead
        </Link>
      </div>
    </article>
  );
}

function getNextStepLabel(lead: Lead) {
  if (lead.status === "ready_to_close") {
    return "Take over personally";
  }

  if (lead.status === "new") {
    return "Review the first message";
  }

  if (lead.status === "followup_due") {
    return "Review the next follow-up";
  }

  if (lead.status === "warm") {
    return "Keep the conversation moving";
  }

  if (lead.status === "contacted") {
    return "Wait for reply or next follow-up";
  }

  if (lead.status === "closed") {
    return "Closed";
  }

  return "No action needed";
}

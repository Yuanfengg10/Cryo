import type { SourcingCandidate } from "@/lib/types";

type SourcingCandidateCardProps = {
  candidate: SourcingCandidate;
};

export function SourcingCandidateCard({ candidate }: SourcingCandidateCardProps) {
  const badgeLabel =
    candidate.autoAddStatus === "auto_added"
      ? "auto-added"
      : candidate.autoAddStatus === "queued"
        ? "queued for run"
        : "below threshold";

  const badgeClass = candidate.autoAddStatus === "auto_added" ? "added" : candidate.autoAddStatus === "queued" ? "queued" : "pending";

  return (
    <article className="approval-card">
      <div className="approval-header">
        <div>
          <p className="eyebrow">Candidate lead</p>
          <h3>{candidate.businessName}</h3>
          <p className="muted">
            {candidate.city} · {candidate.businessType}
          </p>
        </div>
        <div className="candidate-score-stack">
          <span className="fit-score">{candidate.fitScore}</span>
          <span className={`auto-add-badge ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
      </div>

      <p className="approval-reason">{candidate.reason}</p>
      <div className="candidate-meta">
        <p className="muted">Source: {candidate.source}</p>
        {candidate.address ? <p className="muted">{candidate.address}</p> : null}
        {candidate.phone ? <p className="muted">Phone: {candidate.phone}</p> : null}
      </div>

      <div className="lead-actions">
        {candidate.mapsUrl ? (
          <a className="button button-secondary" href={candidate.mapsUrl} rel="noreferrer" target="_blank">
            Open map
          </a>
        ) : null}
      </div>
    </article>
  );
}

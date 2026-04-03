"use client";

import { useActionState, useState } from "react";

import { approveOutboundDraftAction, type ApprovalActionState } from "@/app/actions";
import type { ApprovalDraft } from "@/lib/types";

type ApprovalCardProps = {
  draft: ApprovalDraft;
};

const initialState: ApprovalActionState = {
  success: false,
  message: ""
};

export function ApprovalCard({ draft }: ApprovalCardProps) {
  const [state, formAction, isPending] = useActionState(approveOutboundDraftAction, initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(draft.message);
  const typeLabel = draft.type === "outbound" ? "outbound" : "follow-up";

  return (
    <article className="approval-card">
      <div className="approval-header">
        <div>
          <p className="eyebrow">{draft.type === "outbound" ? "Outbound draft" : "Follow-up draft"}</p>
          <h3>{draft.leadName}</h3>
          <p className="muted">
            {draft.city} · {draft.businessType}
          </p>
          <p className="muted">{draft.draftSource === "anthropic" ? "AI-crafted draft" : "Fallback draft"}</p>
        </div>
        <span className={`approval-type approval-${draft.type}`}>{typeLabel}</span>
      </div>

      <p className="approval-reason">{draft.reason}</p>
      <form action={formAction}>
        <input name="leadId" type="hidden" value={draft.leadId} />
        <input name="draftType" type="hidden" value={draft.type} />
        <input name="cadenceType" type="hidden" value={draft.cadenceType ?? ""} />
        <input name="nextStatus" type="hidden" value={draft.nextStatus ?? ""} />
        <input name="nextFollowUpDays" type="hidden" value={String(draft.nextFollowUpDays ?? "")} />
        <input name="sequenceNumber" type="hidden" value={String(draft.sequenceNumber ?? "")} />

        <label className="approval-editor">
          <span className="eyebrow">Message</span>
          <textarea
            className={`approval-textarea ${isEditing ? "editing" : ""}`}
            name="message"
            onChange={(event) => setMessage(event.target.value)}
            readOnly={!isEditing}
            rows={5}
            value={message}
          />
        </label>

        <div className="lead-actions">
          <button className="button button-primary" disabled={isPending} type="submit">
            {isPending ? "Approving..." : "Approve"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => setIsEditing((current) => !current)}
            type="button"
          >
            {isEditing ? "Lock message" : "Edit first"}
          </button>
        </div>

        {state.message ? (
          <p className={state.success ? "form-message success" : "form-message error"}>{state.message}</p>
        ) : null}
      </form>
    </article>
  );
}

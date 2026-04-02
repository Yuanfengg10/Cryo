import type { LeadStatus } from "@/lib/types";

const labelMap: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  followup_due: "Follow-up due",
  warm: "Warm",
  ready_to_close: "Ready to close",
  closed: "Closed",
  dead: "Dead"
};

type StatusPillProps = {
  status: LeadStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return <span className={`status-pill status-${status}`}>{labelMap[status]}</span>;
}

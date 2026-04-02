import type { PipelineMetric } from "@/lib/types";

type StatCardProps = {
  metric: PipelineMetric;
};

export function StatCard({ metric }: StatCardProps) {
  return (
    <article className="stat-card">
      <p className="eyebrow">{metric.label}</p>
      <h3>{metric.value}</h3>
      <p className="muted">{metric.detail}</p>
    </article>
  );
}

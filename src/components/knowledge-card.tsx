import { quickAnswerLibrary } from "@/lib/sales-knowledge";

export function KnowledgeCard() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sales knowledge</p>
          <h2>Generic answers the agent can handle</h2>
        </div>
      </div>

      <div className="stack">
        {quickAnswerLibrary.map((item) => (
          <article className="search-play-card" key={item.id}>
            <h3>{item.question}</h3>
            <p className="muted">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

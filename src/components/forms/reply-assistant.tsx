"use client";

import { useMemo, useState } from "react";

import { buildKnowledgeReplyDraft, quickAnswerLibrary } from "@/lib/sales-knowledge";
import type { Lead } from "@/lib/types";

type ReplyAssistantProps = {
  lead: Lead;
};

export function ReplyAssistant({ lead }: ReplyAssistantProps) {
  const [questionId, setQuestionId] = useState(quickAnswerLibrary[0]?.id ?? "pricing");
  const [customMessage, setCustomMessage] = useState("");

  const draft = useMemo(() => {
    const base = buildKnowledgeReplyDraft(lead, questionId);

    if (!customMessage.trim()) {
      return base;
    }

    return `${base}\n\n${customMessage.trim()}`;
  }, [customMessage, lead, questionId]);

  const whatsappHref = `https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(draft)}`;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Reply assistant</p>
          <h2>Draft a grounded answer</h2>
        </div>
      </div>

      <div className="reply-form">
        <label className="field">
          <span>Question type</span>
          <select onChange={(event) => setQuestionId(event.target.value)} value={questionId}>
            {quickAnswerLibrary.map((item) => (
              <option key={item.id} value={item.id}>
                {item.question}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Optional extra note</span>
          <textarea
            onChange={(event) => setCustomMessage(event.target.value)}
            placeholder="Add any extra context you want included in this reply."
            rows={3}
            value={customMessage}
          />
        </label>

        <label className="approval-editor">
          <span className="eyebrow">Reply draft</span>
          <textarea className="approval-textarea editing" readOnly rows={8} value={draft} />
        </label>

        <div className="lead-actions">
          <a className="button button-primary" href={whatsappHref} rel="noreferrer" target="_blank">
            Open in WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

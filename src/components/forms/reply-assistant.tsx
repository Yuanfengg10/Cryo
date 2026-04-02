"use client";

import { useEffect, useState } from "react";

import { buildKnowledgeReplyDraft, quickAnswerLibrary } from "@/lib/sales-knowledge";
import type { Lead } from "@/lib/types";

type ReplyAssistantProps = {
  lead: Lead;
};

export function ReplyAssistant({ lead }: ReplyAssistantProps) {
  const [questionId, setQuestionId] = useState(quickAnswerLibrary[0]?.id ?? "pricing");
  const [customMessage, setCustomMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState<"template" | "anthropic">("template");
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const templateDraft = buildTemplateDraft(lead, questionId, customMessage);

  useEffect(() => {
    setDraft(templateDraft);
    setDraftSource("template");
    setErrorMessage("");
  }, [templateDraft]);

  const whatsappHref = `https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(draft)}`;

  async function handleGenerateAiReply() {
    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/leads/${lead.id}/ai-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId,
          customMessage
        })
      });

      const payload = (await response.json()) as {
        draft?: string;
        source?: "template" | "anthropic";
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        setErrorMessage(payload.error ?? "Could not generate an AI reply right now.");
        return;
      }

      setDraft(payload.draft);
      setDraftSource(payload.source ?? "template");
    } catch (error) {
      console.error("Failed to generate AI reply:", error);
      setErrorMessage("Could not generate an AI reply right now.");
    } finally {
      setIsGenerating(false);
    }
  }

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
          <textarea className="approval-textarea editing" onChange={(event) => setDraft(event.target.value)} rows={8} value={draft} />
        </label>

        <p className="muted">
          Source: {draftSource === "anthropic" ? "Anthropic AI draft" : "Knowledge-base fallback"}
        </p>
        {errorMessage ? <p className="mini-message error">{errorMessage}</p> : null}

        <div className="lead-actions">
          <button className="button button-secondary" disabled={isGenerating} onClick={handleGenerateAiReply} type="button">
            {isGenerating ? "Generating..." : "Generate AI reply"}
          </button>
          <a className="button button-primary" href={whatsappHref} rel="noreferrer" target="_blank">
            Open in WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function buildTemplateDraft(lead: Lead, questionId: string, customMessage: string) {
  const base = buildKnowledgeReplyDraft(lead, questionId);

  if (!customMessage.trim()) {
    return base;
  }

  return `${base}\n\n${customMessage.trim()}`;
}

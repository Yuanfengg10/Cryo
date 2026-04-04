"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildKnowledgeReplyFromLeadMessage } from "@/lib/sales-knowledge";
import type { IntentScore, Lead } from "@/lib/types";

type InboundWorkbenchProps = {
  lead: Lead;
};

export function InboundWorkbench({ lead }: InboundWorkbenchProps) {
  const router = useRouter();
  const [inboundMessage, setInboundMessage] = useState("");
  const [intentScore, setIntentScore] = useState<IntentScore>("neutral");
  const [customMessage, setCustomMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState<"template" | "anthropic">("template");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const templateDraft = useMemo(() => {
    const trimmedInbound = inboundMessage.trim();

    if (!trimmedInbound) {
      return "Paste the lead's message below, then process it once to log the inbound and generate the reply.";
    }

    const base = buildKnowledgeReplyFromLeadMessage(lead, trimmedInbound);

    if (!customMessage.trim()) {
      return base;
    }

    return `${base}\n\n${customMessage.trim()}`;
  }, [customMessage, inboundMessage, lead]);

  const whatsappHref = `https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(draft || templateDraft)}`;

  async function handleProcessInbound() {
    if (!inboundMessage.trim()) {
      setErrorMessage("Paste the lead's message first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setStatusMessage("");
    setHandoffMessage("");

    try {
      const response = await fetch(`/api/leads/${lead.id}/inbound-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inboundMessage,
          intentScore,
          customMessage
        })
      });

      const payload = (await response.json()) as {
        draft?: string;
        source?: "template" | "anthropic";
        handoffReady?: boolean;
        handoffReason?: string;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        setErrorMessage(payload.error ?? "Could not process this inbound message right now.");
        return;
      }

      setDraft(payload.draft);
      setDraftSource(payload.source ?? "template");
      setStatusMessage("Inbound message logged and reply draft prepared.");
      setHandoffMessage(payload.handoffReady ? payload.handoffReason ?? "This lead is ready for your handoff." : "");
      router.refresh();
    } catch (error) {
      console.error("Failed to process inbound message:", error);
      setErrorMessage("Could not process this inbound message right now.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Inbound workbench</p>
          <h2>Log and answer in one step</h2>
        </div>
      </div>

      <div className="reply-form">
        <label className="field">
          <span>Lead&apos;s WhatsApp message</span>
          <textarea
            onChange={(event) => setInboundMessage(event.target.value)}
            placeholder="Paste the lead's actual WhatsApp message here."
            rows={5}
            value={inboundMessage}
          />
        </label>

        <label className="field">
          <span>Intent score</span>
          <select onChange={(event) => setIntentScore(event.target.value as IntentScore)} value={intentScore}>
            <option value="interested">Interested</option>
            <option value="neutral">Neutral</option>
            <option value="not_interested">Not interested</option>
          </select>
        </label>

        <label className="field">
          <span>Optional extra note</span>
          <textarea
            onChange={(event) => setCustomMessage(event.target.value)}
            placeholder="Add any extra context you want included in the reply."
            rows={3}
            value={customMessage}
          />
        </label>

        <label className="approval-editor">
          <span className="eyebrow">Reply draft</span>
          <textarea
            className="approval-textarea editing"
            onChange={(event) => setDraft(event.target.value)}
            rows={8}
            value={draft || templateDraft}
          />
        </label>

        <p className="muted">Source: {draftSource === "anthropic" ? "Anthropic AI draft" : "Knowledge-base fallback"}</p>
        {statusMessage ? <p className="mini-message success">{statusMessage}</p> : null}
        {handoffMessage ? <p className="mini-message success">{handoffMessage}</p> : null}
        {errorMessage ? <p className="mini-message error">{errorMessage}</p> : null}

        <div className="lead-actions">
          <button className="button button-secondary" disabled={isProcessing} onClick={handleProcessInbound} type="button">
            {isProcessing ? "Processing..." : "Log inbound and draft reply"}
          </button>
          <a className="button button-primary" href={whatsappHref} rel="noreferrer" target="_blank">
            Open in WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

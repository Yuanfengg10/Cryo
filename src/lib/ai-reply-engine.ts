import { getAnthropicKey, hasAnthropicEnv } from "@/lib/env";
import type { Lead } from "@/lib/types";
import {
  aiSalesGuardrails,
  buildKnowledgeReplyFromLeadMessage,
  buildSalesKnowledgeContext,
  inferQuestionIdFromMessage
} from "@/lib/sales-knowledge";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

type GenerateReplyDraftParams = {
  lead: Lead;
  inboundMessage: string;
  customMessage?: string;
};

export async function generateSalesReplyDraft({
  lead,
  inboundMessage,
  customMessage
}: GenerateReplyDraftParams) {
  const normalizedInboundMessage = inboundMessage.trim();
  const inferredQuestionId = inferQuestionIdFromMessage(normalizedInboundMessage);
  const fallbackDraft = appendCustomNote(buildKnowledgeReplyFromLeadMessage(lead, normalizedInboundMessage), customMessage);

  if (!hasAnthropicEnv()) {
    return {
      draft: fallbackDraft,
      source: "template" as const
    };
  }

  const apiKey = getAnthropicKey();

  if (!apiKey) {
    return {
      draft: fallbackDraft,
      source: "template" as const
    };
  }

  const systemPrompt = [
    "You are a sales reply assistant for Cryonick Wellness Factory.",
    ...aiSalesGuardrails.map((rule) => `- ${rule}`)
  ].join("\n");

  const userPrompt = [
    buildSalesKnowledgeContext(lead),
    `Lead's inbound message: ${normalizedInboundMessage}`,
    `Inferred category: ${inferredQuestionId}`,
    `Additional user note: ${customMessage?.trim() || "None"}`,
    "Write one WhatsApp reply only.",
    "Include a greeting.",
    "Introduce Yuan from Cryonick Wellness Factory naturally when useful.",
    "Keep it to roughly 70 to 140 words.",
    "Do not use bullet points.",
    "Do not use markdown.",
    "Answer the actual message rather than forcing a canned category.",
    "If pricing is asked, explain that final price depends on setup and needs before quoting properly.",
    "If demo is asked, include the YouTube channel link.",
    "Close with a soft next step."
  ].join("\n\n");

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 220,
        temperature: 0.5,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic reply generation failed:", errorText);
      return {
        draft: fallbackDraft,
        source: "template" as const
      };
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const draft = payload.content
      ?.filter((item) => item.type === "text" && item.text)
      .map((item) => item.text?.trim())
      .filter(Boolean)
      .join("\n\n");

    if (!draft) {
      return {
        draft: fallbackDraft,
        source: "template" as const
      };
    }

    return {
      draft,
      source: "anthropic" as const
    };
  } catch (error) {
    console.error("Anthropic reply generation crashed:", error);

    return {
      draft: fallbackDraft,
      source: "template" as const
    };
  }
}

function appendCustomNote(base: string, customMessage?: string) {
  if (!customMessage?.trim()) {
    return base;
  }

  return `${base}\n\n${customMessage.trim()}`;
}

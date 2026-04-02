"use client";

import { useActionState } from "react";

import { logReplyAction, type ReplyActionState } from "@/app/actions";

const initialState: ReplyActionState = {
  success: false,
  message: ""
};

type ReplyLogFormProps = {
  leadId: string;
};

export function ReplyLogForm({ leadId }: ReplyLogFormProps) {
  const [state, formAction, isPending] = useActionState(logReplyAction, initialState);

  return (
    <form className="reply-form" action={formAction}>
      <input name="leadId" type="hidden" value={leadId} />

      <label className="field">
        <span>Reply snippet</span>
        <textarea
          name="replySnippet"
          rows={5}
          placeholder="Paste the WhatsApp reply or summarise what they said."
          required
        />
      </label>

      <label className="field">
        <span>Intent score</span>
        <select defaultValue="neutral" name="intentScore">
          <option value="interested">Interested</option>
          <option value="neutral">Neutral</option>
          <option value="not_interested">Not interested</option>
        </select>
      </label>

      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Log reply"}
      </button>

      {state.message ? (
        <p className={state.success ? "form-message success" : "form-message error"}>{state.message}</p>
      ) : null}
    </form>
  );
}

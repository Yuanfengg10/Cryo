"use client";

import { useActionState } from "react";

import { resetLeadsAction, type ResetActionState } from "@/app/actions";

const initialState: ResetActionState = {
  success: false,
  message: ""
};

export function ResetLeadsForm() {
  const [state, formAction, isPending] = useActionState(resetLeadsAction, initialState);

  return (
    <form className="reply-form" action={formAction}>
      <p className="muted">
        This clears the current pipeline, conversation history, sourcing runs, and imported leads so the agent can rebuild a
        fresh list.
      </p>

      <button className="button button-danger" disabled={isPending} type="submit">
        {isPending ? "Clearing..." : "Clear all leads and start fresh"}
      </button>

      {state.message ? (
        <p className={state.success ? "form-message success" : "form-message error"}>{state.message}</p>
      ) : null}
    </form>
  );
}

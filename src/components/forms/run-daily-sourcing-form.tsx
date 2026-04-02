"use client";

import { useActionState } from "react";

import { runDailySourcingNowAction, type AutomationRunState } from "@/app/actions";

const initialState: AutomationRunState = {
  success: false,
  message: ""
};

export function RunDailySourcingForm() {
  const [state, formAction, isPending] = useActionState(runDailySourcingNowAction, initialState);

  return (
    <form className="inline-action-form" action={formAction}>
      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Running..." : "Run today's sourcing"}
      </button>
      {state.message ? <p className={state.success ? "mini-message success" : "mini-message error"}>{state.message}</p> : null}
    </form>
  );
}

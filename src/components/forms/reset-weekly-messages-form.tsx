"use client";

import { useActionState } from "react";

import { resetWeeklyMessagesAction, type WeeklyPulseResetState } from "@/app/actions";

const initialState: WeeklyPulseResetState = {
  success: false,
  message: ""
};

export function ResetWeeklyMessagesForm() {
  const [state, formAction, isPending] = useActionState(resetWeeklyMessagesAction, initialState);

  return (
    <form className="inline-action-form" action={formAction}>
      <button className="button button-secondary" disabled={isPending} type="submit">
        {isPending ? "Resetting..." : "Reset sent count"}
      </button>
      {state.message ? <p className={state.success ? "mini-message success" : "mini-message error"}>{state.message}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { revertLeadToNewAction, type RevertActionState } from "@/app/actions";

const initialState: RevertActionState = {
  success: false,
  message: ""
};

type RevertLeadButtonProps = {
  leadId: string;
};

export function RevertLeadButton({ leadId }: RevertLeadButtonProps) {
  const [state, formAction, isPending] = useActionState(revertLeadToNewAction, initialState);

  return (
    <form className="inline-action-form" action={formAction}>
      <input name="leadId" type="hidden" value={leadId} />
      <button className="button button-secondary" disabled={isPending} type="submit">
        {isPending ? "Reverting..." : "Move back to new"}
      </button>
      {state.message ? <p className={state.success ? "mini-message success" : "mini-message error"}>{state.message}</p> : null}
    </form>
  );
}

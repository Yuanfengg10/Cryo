"use client";

import { useActionState } from "react";

import { createLeadAction, type LeadActionState } from "@/app/actions";

const initialState: LeadActionState = {
  success: false,
  message: ""
};

export function AddLeadForm() {
  const [state, formAction, isPending] = useActionState(createLeadAction, initialState);

  return (
    <form className="reply-form" action={formAction}>
      <label className="field">
        <span>Business name</span>
        <input name="businessName" placeholder="Vital Age Longevity Clinic" required type="text" />
      </label>

      <label className="field">
        <span>Business type</span>
        <select defaultValue="longevity_clinic" name="businessType">
          <option value="longevity_clinic">Longevity clinic</option>
          <option value="biohacking_centre">Biohacking centre</option>
          <option value="clinic">Clinic</option>
          <option value="gym">Gym</option>
          <option value="spa">Spa</option>
          <option value="wellness_studio">Wellness studio</option>
          <option value="sports_centre">Sports centre</option>
        </select>
      </label>

      <div className="two-column-grid">
        <label className="field">
          <span>City</span>
          <input name="city" placeholder="Singapore" required type="text" />
        </label>

        <label className="field">
          <span>Phone</span>
          <input name="phone" placeholder="6591234567" required type="text" />
        </label>
      </div>

      <label className="field">
        <span>Contact name</span>
        <input name="contactName" placeholder="Founder or director" type="text" />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          name="notes"
          placeholder="Why this lead is interesting, what angle to use, and anything you know about them."
          rows={4}
        />
      </label>

      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Adding..." : "Add lead"}
      </button>

      {state.message ? (
        <p className={state.success ? "form-message success" : "form-message error"}>{state.message}</p>
      ) : null}
    </form>
  );
}

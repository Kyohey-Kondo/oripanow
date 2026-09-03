"use client";

import { useActionState } from "react";
import { triggerCheckAction, type CheckActionState } from "./actions";
import styles from "./admin-internal.module.css";

const initialState: CheckActionState = { status: "idle", message: "" };

export function CheckButton({
  label,
  storeId,
  area,
}: {
  label: string;
  storeId?: string;
  area?: string;
}) {
  const [state, formAction, isPending] = useActionState(triggerCheckAction, initialState);

  return (
    <form action={formAction} className={styles.inlineForm}>
      {storeId && <input type="hidden" name="storeId" value={storeId} />}
      {area && <input type="hidden" name="area" value={area} />}
      <button type="submit" disabled={isPending} className={styles.secondaryButton}>
        {isPending ? "実行中…" : label}
      </button>
      {state.status === "done" && <span className={styles.checkResultOk}>✓ {state.message}</span>}
      {state.status === "error" && <span className={styles.checkResultError}>✗ {state.message}</span>}
    </form>
  );
}

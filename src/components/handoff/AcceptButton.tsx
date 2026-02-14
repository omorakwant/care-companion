import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Shield, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type HandoffAcknowledgement = Tables<"handoff_acknowledgements">;

interface AcceptButtonProps {
  handoffId: string;
  className?: string;
}

type State = "loading" | "pending" | "accepting" | "accepted";

function generateSignatureHash(userId: string, handoffId: string): string {
  return btoa(userId + Date.now() + handoffId).slice(0, 24);
}

function formatAcceptedAt(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AcceptButton({ handoffId, className }: AcceptButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [state, setState] = useState<State>("loading");
  const [acknowledgement, setAcknowledgement] =
    useState<HandoffAcknowledgement | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAcknowledgement() {
      try {
        const { data, error } = await supabase
          .from("handoff_acknowledgements")
          .select("*")
          .eq("handoff_id", handoffId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // Table may not exist yet — show pending state
          setState("pending");
          return;
        }

        if (data) {
          setAcknowledgement(data as HandoffAcknowledgement);
          if (data.accepted_by) {
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", data.accepted_by)
                .single();
              if (!cancelled && profile?.display_name) {
                setDisplayName(profile.display_name);
              }
            } catch {
              // Profile lookup failed — use fallback name
            }
          }
          setState("accepted");
        } else {
          setState("pending");
        }
      } catch {
        // Table doesn't exist yet — show pending
        if (!cancelled) setState("pending");
      }
    }

    fetchAcknowledgement();
    return () => {
      cancelled = true;
    };
  }, [handoffId]);

  const handleAccept = async () => {
    if (!user) return;
    setState("accepting");

    const signatureHash = generateSignatureHash(user.id, handoffId);

    const { error } = await supabase.from("handoff_acknowledgements").insert({
      handoff_id: handoffId,
      accepted_by: user.id,
      signature_hash: signatureHash,
    });

    if (error) {
      setState("pending");
      toast.error(error.message);
      return;
    }

    const accepterName =
      (await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()
        .then((r) => r.data?.display_name)) ?? null;

    setAcknowledgement({
      id: "",
      handoff_id: handoffId,
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
      signature_hash: signatureHash,
    });
    setDisplayName(accepterName);
    setState("accepted");
    toast.success(t("acceptButton.handoffAccepted"));
  };

  if (state === "loading") {
    return (
      <div
        className={cn(
          "glass-card rounded-2xl p-6 flex items-center justify-center gap-3 border border-dashed border-[var(--c-border)] bg-[var(--c-surface-alt)]/50",
          className
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin text-[var(--c-text-muted)]" />
        <span className="text-[13px] text-[var(--c-text-muted)]">
          {t("acceptButton.loading")}
        </span>
      </div>
    );
  }

  if (state === "accepted" && acknowledgement) {
    const name = displayName ?? t("acceptButton.teamMember");
    return (
      <div
        className={cn(
          "glass-card rounded-2xl p-5 w-full border-2 border-[var(--c-accent)] bg-[var(--c-accent)]/10",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--c-accent)]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[var(--c-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground">
              {t("acceptButton.acceptedBy", { name })}
            </p>
            <p className="text-[12px] text-[var(--c-text-secondary)] mt-0.5">
              {t("acceptButton.acceptedAt", {
                time: formatAcceptedAt(acknowledgement.accepted_at),
              })}
            </p>
            <p
              className="text-[11px] font-mono text-[var(--c-text-muted)] mt-2 truncate"
              title={acknowledgement.signature_hash}
            >
              {acknowledgement.signature_hash}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6 w-full border-2 border-dashed border-[var(--c-border)] bg-[var(--c-surface-alt)]/50",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5 text-[var(--c-text-muted)]">
          <Clock className="w-5 h-5 shrink-0" />
          <span className="text-[13px] font-medium">
            {t("acceptButton.pendingReview")}
          </span>
        </div>
        <p className="text-[12px] text-[var(--c-text-muted)] text-center">
          {t("acceptButton.awaitingAcceptance")}
        </p>
        <button
          onClick={handleAccept}
          disabled={state === "accepting" || !user}
          className="w-full flex items-center justify-center gap-2.5 gradient-primary rounded-[10px] h-12 px-6 text-white text-[14px] font-bold hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-opacity"
        >
          {state === "accepting" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <span>{t("acceptButton.accepting")}</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 shrink-0" />
              <span>{t("acceptButton.acceptResponsibility")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

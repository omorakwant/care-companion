import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  Stethoscope,
  UserCog,
  ClipboardList,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const roles = [
    {
      value: "staff",
      label: "Medical Staff",
      description: t('auth.roles.staffDescription'),
      icon: Stethoscope,
    },
    {
      value: "receptionist",
      label: "Receptionist",
      description: t('auth.roles.receptionistDescription'),
      icon: ClipboardList,
    },
    {
      value: "admin",
      label: "Administrator",
      description: t('auth.roles.adminDescription'),
      icon: UserCog,
    },
  ];

  const features = [
    t('auth.features.voiceToReport'),
    t('auth.features.structuredData'),
    t('auth.features.multiLanguage'),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName, role },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success(t('auth.accountCreated'));
          navigate("/");
        } else {
          toast.success(t('auth.checkEmail'));
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-b from-background to-secondary text-white flex-col justify-between p-[60px]">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-[26px] font-semibold text-white">
              {t('app.name')}
            </span>
          </div>

          {/* Hero */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-4xl font-bold leading-[1.2] text-white">
              {t('auth.heroTitle')}
            </h2>
            <p className="text-[13px] text-[var(--c-text-secondary)] leading-[1.6] max-w-md">
              {t('auth.heroDescription')}
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-[13px] text-[var(--c-text-secondary)]"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--c-accent)] shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-[480px] bg-[var(--c-surface)] flex items-center justify-center px-12 py-[60px]">
        <div className="w-full max-w-[384px] flex flex-col gap-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              {t('app.name')}
            </span>
          </div>

          {/* Form header */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[28px] font-semibold text-foreground">
              {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h1>
            <p className="text-[13px] text-[var(--c-text-muted)]">
              {isLogin
                ? t('auth.signInDescription')
                : t('auth.registerDescription')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--c-text-secondary)]">
                  {t('auth.fullName')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                  className="h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--c-text-secondary)]">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-dim)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full h-[42px] pl-10 pr-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--c-text-secondary)]">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-dim)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full h-[42px] pl-10 pr-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--c-text-secondary)]">
                  {t('auth.selectRole')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-[10px] border transition-all text-center",
                        role === r.value
                          ? "border-primary bg-primary/10"
                          : "border-[var(--c-border)] bg-[var(--c-surface-alt)] hover:border-primary/25"
                      )}
                    >
                      <r.icon
                        className={cn(
                          "w-5 h-5",
                          role === r.value
                            ? "text-[var(--c-primary)]"
                            : "text-[var(--c-text-muted)]"
                        )}
                      />
                      <span className="text-[11px] font-medium text-foreground leading-tight">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] rounded-[10px] gradient-primary text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading
                ? t('auth.pleaseWait')
                : isLogin
                  ? t('auth.signIn')
                  : t('auth.createAccountBtn')}
            </button>
          </form>

          {/* Switch mode */}
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-[var(--c-text-muted)]">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-semibold text-[var(--c-primary)] hover:underline"
            >
              {isLogin ? t('auth.signUp') : t('auth.signInLink')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, Stethoscope, UserCog, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    value: "staff",
    label: "Medical Staff",
    description: "Doctors, nurses & care team",
    icon: Stethoscope,
  },
  {
    value: "receptionist",
    label: "Receptionist",
    description: "Front desk & admissions",
    icon: ClipboardList,
  },
  {
    value: "admin",
    label: "Administrator",
    description: "Full system access",
    icon: UserCog,
  },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
          toast.success("Account created! Welcome to CareFlow.");
          navigate("/");
        } else {
          toast.success("Check your email to confirm your account!");
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] bg-[hsl(218,30%,12%)] text-white flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">CareFlow</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Hospital operations,
            <br />
            simplified.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Manage patients, beds, and tasks from one place. Record voice notes
            and let AI generate actionable tasks automatically.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "Voice-to-task AI pipeline",
              "Real-time bed management",
              "Role-based access control",
              "Multilingual support (FR, EN, AR)",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-white/70">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(205,80%,52%)]" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">
          CareFlow v1.0 -- Built for healthcare teams
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">CareFlow</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin
                ? "Sign in to access your dashboard"
                : "Register as a new team member"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  required
                  className="h-10"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@hospital.com"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="h-10"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select your role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center",
                        role === r.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <r.icon
                        className={cn(
                          "w-5 h-5",
                          role === r.value
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                      <span className="text-xs font-medium leading-tight">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <span className="text-primary font-medium">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  Mail,
  Smartphone,
  ArrowLeft,
  Save,
  Check,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotificationPreferencesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  useSession();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState({
    emailOnTaskAssign: true,
    emailOnMention: true,
    emailOnMessage: false,
    emailDailyDigest: false,
    browserNotifications: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("notificationPreferences");
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem(
        "notificationPreferences",
        JSON.stringify(preferences),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const Toggle = ({
    checked,
    onChange,
    id,
  }: {
    checked: boolean;
    onChange: () => void;
    id: string;
  }) => (
    <button
      id={id}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-muted/30 p-8 space-y-8 animate-in fade-in duration-700">
      <header className="max-w-4xl mx-auto space-y-4">
        <Link
          href={`/app/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-black text-mutedForeground hover:text-primary transition-colors group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />
          BACK TO DASHBOARD
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Notifications
            </h1>
            <p className="text-mutedForeground text-lg font-medium">
              Manage how and when you want to be notified in{" "}
              <span className="text-foreground font-bold">{slug}</span>.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || saved}
            className={`rounded-xl font-bold h-12 px-8 transition-all ${saved ? "bg-green-500 hover:bg-green-500 shadow-green-500/20" : "shadow-lg shadow-primary/20"}`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : saved ? (
              <div className="flex items-center gap-2">
                <Check size={18} />
                <span>Preferences Saved</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save size={18} />
                <span>Save Changes</span>
              </div>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-8">
            <Card className="p-8 border-border/40 shadow-sm bg-card rounded-[2.5rem] space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <Mail size={24} />
                  <h2 className="text-xl font-black tracking-tight">
                    Email Notifications
                  </h2>
                </div>

                <div className="divide-y divide-border/40">
                  <div className="py-6 flex items-center justify-between group">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground transition-colors group-hover:text-primary">
                        Task Assignments
                      </label>
                      <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                        Receive an email whenever you are assigned to a new
                        task.
                      </p>
                    </div>
                    <Toggle
                      id="emailOnTaskAssign"
                      checked={preferences.emailOnTaskAssign}
                      onChange={() => handleToggle("emailOnTaskAssign")}
                    />
                  </div>

                  <div className="py-6 flex items-center justify-between group">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground transition-colors group-hover:text-primary">
                        Mentions & Comments
                      </label>
                      <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                        Get notified when someone mentions you or comments on
                        your tasks.
                      </p>
                    </div>
                    <Toggle
                      id="emailOnMention"
                      checked={preferences.emailOnMention}
                      onChange={() => handleToggle("emailOnMention")}
                    />
                  </div>

                  <div className="py-6 flex items-center justify-between group">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground transition-colors group-hover:text-primary">
                        Direct Messages
                      </label>
                      <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                        Receive notifications for new workspace-wide chat
                        messages.
                      </p>
                    </div>
                    <Toggle
                      id="emailOnMessage"
                      checked={preferences.emailOnMessage}
                      onChange={() => handleToggle("emailOnMessage")}
                    />
                  </div>

                  <div className="py-6 flex items-center justify-between group">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground transition-colors group-hover:text-primary">
                        Daily Digest
                      </label>
                      <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                        A summary of yesterday&apos;s activity delivered every
                        morning.
                      </p>
                    </div>
                    <Toggle
                      id="emailDailyDigest"
                      checked={preferences.emailDailyDigest}
                      onChange={() => handleToggle("emailDailyDigest")}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-6 border-t border-border/40">
                <div className="flex items-center gap-3 text-primary">
                  <Smartphone size={24} />
                  <h2 className="text-xl font-black tracking-tight">
                    Browser Alerts
                  </h2>
                </div>

                <div className="py-6 flex items-center justify-between group">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground transition-colors group-hover:text-primary">
                      Push Notifications
                    </label>
                    <p className="text-xs text-mutedForeground font-medium leading-relaxed">
                      Show real-time desktop alerts for important workspace
                      events.
                    </p>
                  </div>
                  <Toggle
                    id="browserNotifications"
                    checked={preferences.browserNotifications}
                    onChange={() => handleToggle("browserNotifications")}
                  />
                </div>
              </section>
            </Card>
          </div>

          <div className="md:col-span-4 space-y-6">
            <Card className="p-8 border-border/40 shadow-sm bg-card rounded-2xl space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Bell size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Activity Feed</h3>
                <p className="text-xs text-mutedForeground leading-relaxed">
                  Don&apos;t want emails? You can always check all workspace
                  updates in your{" "}
                  <Link
                    href={`/app/${slug}/activity`}
                    className="text-primary font-bold hover:underline"
                  >
                    Activity Feed
                  </Link>
                  .
                </p>
              </div>
            </Card>

            <Card className="p-8 border-blue-500/10 bg-blue-500/5 rounded-2xl flex gap-4">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
                Note: Critical system updates and security alerts will always be
                sent regardless of these preferences.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

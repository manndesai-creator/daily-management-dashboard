import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  ArrowUpRight,
} from "lucide-react";

const metrics = [
  {
    label: "Total Reach",
    value: "—",
    change: "+0%",
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    label: "Impressions",
    value: "—",
    change: "+0%",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    label: "Engagements",
    value: "—",
    change: "+0%",
    icon: MousePointerClick,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    label: "Link Clicks",
    value: "—",
    change: "+0%",
    icon: ArrowUpRight,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

const platforms = [
  { name: "Instagram", color: "bg-pink-500", reach: null, engagement: null, posts: null },
  { name: "Facebook", color: "bg-blue-500", reach: null, engagement: null, posts: null },
  { name: "Twitter / X", color: "bg-sky-500", reach: null, engagement: null, posts: null },
  { name: "LinkedIn", color: "bg-indigo-500", reach: null, engagement: null, posts: null },
];

const DATE_RANGES = ["7 days", "30 days", "90 days", "Custom"];

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Performance metrics across all connected channels
            </p>
          </div>
        </div>

        {/* Date range picker */}
        <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
          {DATE_RANGES.map((range) => (
            <button
              key={range}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === "30 days"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{metric.label}</CardDescription>
                  <div className={`p-1.5 rounded-md ${metric.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {metric.value}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {metric.change} vs prev. period
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart placeholder */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Engagement Over Time</CardTitle>
              <CardDescription>Last 30 days · All platforms</CardDescription>
            </div>
            <Badge variant="outline">Connect accounts to unlock</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-52 rounded-lg bg-secondary/30 border border-dashed border-border flex flex-col items-center justify-center gap-3">
            <div className="flex items-end gap-1.5 opacity-20">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50].map(
                (h, i) => (
                  <div
                    key={i}
                    className="w-4 bg-primary rounded-t"
                    style={{ height: `${h * 0.6}px` }}
                  />
                )
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Chart appears once accounts are connected
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Platform breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Breakdown</CardTitle>
          <CardDescription>Performance by channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border">
              <span>Platform</span>
              <span className="text-right">Reach</span>
              <span className="text-right">Engagement</span>
              <span className="text-right">Posts</span>
            </div>

            {/* Table rows */}
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="grid grid-cols-4 items-center py-3 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${platform.color}`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {platform.name}
                  </span>
                </div>
                <span className="text-right text-sm text-muted-foreground">
                  {platform.reach ?? "—"}
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {platform.engagement ?? "—"}
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {platform.posts ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

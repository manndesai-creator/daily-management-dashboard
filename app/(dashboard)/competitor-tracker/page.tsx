import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crosshair,
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
} from "lucide-react";

const competitors = [
  {
    name: "Monarch Media",
    handle: "@monarchmedia",
    followers: "12.4K",
    posts: 847,
    engagementRate: "3.2%",
    trend: "up" as const,
    lastPost: "2 hours ago",
    category: "Digital Agency",
  },
  {
    name: "Rajputana Ads",
    handle: "@rajputanaads",
    followers: "8.9K",
    posts: 534,
    engagementRate: "2.8%",
    trend: "down" as const,
    lastPost: "1 day ago",
    category: "OOH Agency",
  },
  {
    name: "Pink City Creative",
    handle: "@pinkcitycreative",
    followers: "21.1K",
    posts: 1203,
    engagementRate: "4.1%",
    trend: "up" as const,
    lastPost: "5 hours ago",
    category: "Creative Studio",
  },
  {
    name: "Amber Fort Media",
    handle: "@amberfortmedia",
    followers: "6.3K",
    posts: 291,
    engagementRate: "1.9%",
    trend: "down" as const,
    lastPost: "3 days ago",
    category: "Brand Agency",
  },
];

export default function CompetitorTrackerPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Competitor Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor competitor activity and social performance
            </p>
          </div>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Competitor
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Tracked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {competitors.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">competitors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Avg. Engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">3.0%</p>
            <p className="text-xs text-muted-foreground mt-1">across all tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Performer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground truncate">
              Pink City Creative
            </p>
            <p className="text-xs text-muted-foreground mt-1">4.1% engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Competitors table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracked Competitors</CardTitle>
          <CardDescription>
            Jaipur advertising & marketing agencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {competitors.map((comp) => (
            <div
              key={comp.name}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
            >
              {/* Identity */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">
                    {comp.name[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {comp.name}
                    </p>
                    <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                      {comp.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {comp.handle} · Last post {comp.lastPost}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-8 text-right flex-shrink-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {comp.followers}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {comp.posts}
                  </p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 justify-end">
                    {comp.trend === "up" ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <p
                      className={`text-sm font-semibold ${
                        comp.trend === "up" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {comp.engagementRate}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

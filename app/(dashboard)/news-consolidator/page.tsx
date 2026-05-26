import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Plus, ExternalLink, Clock, Tag } from "lucide-react";

const CATEGORIES = ["All", "Advertising", "Marketing", "Digital", "Jaipur", "OOH"];

const newsFeed = [
  {
    title: "India's OOH Advertising Market to Reach ₹5,500 Cr by 2027",
    source: "Exchange4Media",
    time: "2 hours ago",
    category: "OOH",
    summary:
      "The out-of-home advertising sector continues its strong recovery post-pandemic, with digital OOH leading growth across tier-1 and tier-2 cities.",
    saved: true,
  },
  {
    title: "Meta Rolls Out New Ad Formats for Instagram Reels",
    source: "Social Media Today",
    time: "5 hours ago",
    category: "Digital",
    summary:
      "Instagram introduces interactive poll ads and extended reel ad durations to improve engagement for brands targeting younger audiences.",
    saved: false,
  },
  {
    title: "Jaipur Emerges as Advertising Hub for North India Brands",
    source: "Adgully",
    time: "1 day ago",
    category: "Jaipur",
    summary:
      "Pink City sees a surge in advertising agencies as brands look to tap into the rapidly growing Rajasthan consumer market.",
    saved: true,
  },
  {
    title: "Content Marketing Budgets Expected to Rise 18% in 2026",
    source: "Campaign India",
    time: "2 days ago",
    category: "Marketing",
    summary:
      "Brand marketers plan to increase content creation spends as organic reach on social platforms continues to decline year-over-year.",
    saved: false,
  },
  {
    title: "Google Introduces AI-Powered Creative Tools for Advertisers",
    source: "The Drum",
    time: "3 days ago",
    category: "Advertising",
    summary:
      "New suite of generative AI tools aims to help small and mid-size agencies automate ad creative production at scale.",
    saved: false,
  },
];

const categoryStyles: Record<string, string> = {
  OOH: "bg-orange-500/15 text-orange-400",
  Digital: "bg-blue-500/15 text-blue-400",
  Jaipur: "bg-purple-500/15 text-purple-400",
  Marketing: "bg-green-500/15 text-green-400",
  Advertising: "bg-red-500/15 text-red-400",
};

export default function NewsConsolidatorPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              News Consolidator
            </h1>
            <p className="text-sm text-muted-foreground">
              Industry news and updates, aggregated in one place
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              cat === "All"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News feed */}
      <div className="space-y-3">
        {newsFeed.map((article) => (
          <Card
            key={article.title}
            className="hover:border-muted-foreground/30 transition-colors"
          >
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        categoryStyles[article.category] ??
                        "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {article.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {article.time}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {article.source}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-1.5 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Badge
                    variant={article.saved ? "default" : "secondary"}
                    className="text-[10px] cursor-pointer"
                  >
                    {article.saved ? "Saved" : "Save"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

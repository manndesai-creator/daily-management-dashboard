import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// April 2026 starts on Wednesday (offset = 3), has 30 days
const MONTH_OFFSET = 3;
const MONTH_DAYS = 30;

const events = [
  { day: 9, title: "Glokal Brand Story", platform: "instagram" },
  { day: 11, title: "Client Feature Reel", platform: "instagram" },
  { day: 14, title: "Weekend Campaign", platform: "facebook" },
  { day: 16, title: "Product Launch Post", platform: "instagram" },
  { day: 20, title: "Industry News Share", platform: "twitter" },
  { day: 25, title: "Monthly Recap", platform: "instagram" },
];

const platformStyles: Record<string, string> = {
  instagram: "bg-pink-500/20 text-pink-400",
  facebook: "bg-blue-500/20 text-blue-400",
  twitter: "bg-sky-500/20 text-sky-400",
};

const platformDots: Record<string, string> = {
  instagram: "bg-pink-500",
  facebook: "bg-blue-500",
  twitter: "bg-sky-500",
};

export default function ContentCalendarPage() {
  const today = 9; // April 9, 2026

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Content Calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              Plan and schedule content across platforms
            </p>
          </div>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Calendar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base w-28 text-center">
                April 2026
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(platformStyles).map(([platform, style]) => (
                <span
                  key={platform}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${style}`}
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: MONTH_OFFSET }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: MONTH_DAYS }, (_, i) => i + 1).map((day) => {
              const dayEvents = events.filter((e) => e.day === day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`min-h-[72px] p-1.5 rounded-md border transition-colors cursor-pointer hover:border-primary/40 ${
                    isToday
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/20 hover:bg-secondary/40"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <div
                        key={event.title}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                          platformStyles[event.platform]
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Content</CardTitle>
          <CardDescription>Scheduled items this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.map((event) => (
            <div
              key={event.title}
              className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${platformDots[event.platform]}`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    April {event.day}, 2026
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">
                {event.platform}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

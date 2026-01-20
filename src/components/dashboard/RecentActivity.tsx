import { GraduationCap, Users, School, Clock } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "student",
    message: "New student registered: Fatuma Hassan",
    time: "2 hours ago",
    icon: GraduationCap,
  },
  {
    id: 2,
    type: "teacher",
    message: "Teacher assigned: Ahmed Abdi to Elwak ECDE",
    time: "4 hours ago",
    icon: Users,
  },
  {
    id: 3,
    type: "center",
    message: "New center added: Rhamu ECDE Center",
    time: "1 day ago",
    icon: School,
  },
  {
    id: 4,
    type: "student",
    message: "Student transferred: Mohamed Ali",
    time: "2 days ago",
    icon: GraduationCap,
  },
];

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <h3 className="font-display font-semibold text-lg mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.message}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

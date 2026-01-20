import { GraduationCap, Users, School, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CenterDistribution } from "@/components/dashboard/CenterDistribution";
import { CentersMap } from "@/components/dashboard/CentersMap";
import { StudentStatistics } from "@/components/dashboard/StudentStatistics";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useCenters } from "@/hooks/useCenters";

export default function Dashboard() {
  const { data: students } = useStudents();
  const { data: teachers } = useTeachers();
  const { data: centers } = useCenters();

  const totalStudents = students?.length || 0;
  const totalTeachers = teachers?.length || 0;
  const totalCenters = centers?.length || 0;
  
  // Calculate total capacity and enrollment rate
  const totalCapacity = centers?.reduce((sum, c) => sum + (c.capacity || 50), 0) || 1;
  const enrollmentRate = Math.round((totalStudents / totalCapacity) * 100);

  // Transform students data for statistics
  const studentsForStats = students?.map(s => ({
    gender: s.gender,
    class_level: (s as any).class_level as "pp1" | "pp2" | null,
    ecde_centers: s.ecde_centers,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome to Mandera County ECDE Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          icon={<GraduationCap className="w-6 h-6" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Teachers"
          value={totalTeachers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="ECDE Centers"
          value={totalCenters.toLocaleString()}
          icon={<School className="w-6 h-6" />}
          variant="primary"
        />
        <StatCard
          title="Enrollment Rate"
          value={`${enrollmentRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Student Statistics */}
      {students && students.length > 0 && (
        <StudentStatistics students={studentsForStats} />
      )}

      {/* Map */}
      <CentersMap />

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CenterDistribution />
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
        <h3 className="font-display font-semibold text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/students" 
            className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Add Student</span>
          </Link>
          <Link 
            to="/teachers" 
            className="p-4 rounded-xl bg-secondary/5 hover:bg-secondary/10 transition-colors text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Add Teacher</span>
          </Link>
          <Link 
            to="/centers" 
            className="p-4 rounded-xl bg-accent/5 hover:bg-accent/10 transition-colors text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              <School className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Add Center</span>
          </Link>
          <button className="p-4 rounded-xl bg-info/5 hover:bg-info/10 transition-colors text-center group">
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info group-hover:text-info-foreground transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
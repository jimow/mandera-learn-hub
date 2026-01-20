import { GraduationCap, Users, School, TrendingUp, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CenterDistribution } from "@/components/dashboard/CenterDistribution";
import { CentersMap } from "@/components/dashboard/CentersMap";
import { StudentStatistics } from "@/components/dashboard/StudentStatistics";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useCenters } from "@/hooks/useCenters";
import { useUserCenterAssignment } from "@/hooks/useUserCenterAssignment";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: students } = useStudents();
  const { data: teachers } = useTeachers();
  const { data: centers } = useCenters();
  const { data: userCenterAssignment } = useUserCenterAssignment();
  const { hasRole, isAdmin } = useAuth();

  const isCenterAdmin = hasRole("center_admin");
  const isTeacherRole = hasRole("teacher");
  const isCenterBased = (isCenterAdmin || isTeacherRole) && userCenterAssignment?.center_id;
  const assignedCenter = userCenterAssignment?.ecde_centers;
  const assignedCenterId = userCenterAssignment?.center_id;

  // Filter data based on user role and center assignment
  const filteredStudents = isCenterBased
    ? students?.filter(s => s.center_id === assignedCenterId)
    : students;
  
  const filteredTeachers = isCenterBased
    ? teachers?.filter(t => t.center_id === assignedCenterId)
    : teachers;

  const totalStudents = filteredStudents?.length || 0;
  const totalTeachers = filteredTeachers?.length || 0;
  
  // For center-based users, show their center's capacity
  const centerCapacity = isCenterBased && assignedCenter
    ? (assignedCenter as any).capacity || 50
    : centers?.reduce((sum, c) => sum + (c.capacity || 50), 0) || 1;
  
  const enrollmentRate = Math.round((totalStudents / centerCapacity) * 100);

  // Transform students data for statistics
  const studentsForStats = filteredStudents?.map(s => ({
    gender: s.gender,
    class_level: (s as any).class_level as "pp1" | "pp2" | null,
    ecde_centers: s.ecde_centers,
  })) || [];

  // Count by class level
  const pp1Count = filteredStudents?.filter(s => (s as any).class_level === "pp1").length || 0;
  const pp2Count = filteredStudents?.filter(s => (s as any).class_level === "pp2").length || 0;

  // Count by gender
  const maleCount = filteredStudents?.filter(s => s.gender === "male").length || 0;
  const femaleCount = filteredStudents?.filter(s => s.gender === "female").length || 0;

  return (
    <div className="space-y-8">
      {/* Header - Show center name for center managers */}
      <div className="page-header">
        {isCenterBased && assignedCenter ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <School className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="page-title">{assignedCenter.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{assignedCenter.location}, {assignedCenter.ward}</span>
                  <Badge variant="outline" className="ml-2">Center Dashboard</Badge>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-description">
              Welcome to Mandera County ECDE Management System
            </p>
          </>
        )}
      </div>

      {/* Center Info Card for center managers */}
      {isCenterBased && assignedCenter && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Sub-County</p>
              <p className="font-semibold">{assignedCenter.sub_county}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ward</p>
              <p className="font-semibold">{assignedCenter.ward}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Center Code</p>
              <p className="font-mono font-semibold">{assignedCenter.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-semibold">{centerCapacity} students</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={isCenterBased ? "Center Students" : "Total Students"}
          value={totalStudents.toLocaleString()}
          icon={<GraduationCap className="w-6 h-6" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title={isCenterBased ? "Center Teachers" : "Total Teachers"}
          value={totalTeachers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 5, isPositive: true }}
        />
        {isCenterBased ? (
          <StatCard
            title="PP1 Students"
            value={pp1Count.toLocaleString()}
            icon={<GraduationCap className="w-6 h-6" />}
            variant="secondary"
          />
        ) : (
          <StatCard
            title="ECDE Centers"
            value={(centers?.length || 0).toLocaleString()}
            icon={<School className="w-6 h-6" />}
            variant="primary"
          />
        )}
        {isCenterBased ? (
          <StatCard
            title="PP2 Students"
            value={pp2Count.toLocaleString()}
            icon={<GraduationCap className="w-6 h-6" />}
            variant="accent"
          />
        ) : (
          <StatCard
            title="Enrollment Rate"
            value={`${enrollmentRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={{ value: 8, isPositive: true }}
          />
        )}
      </div>

      {/* Gender breakdown for center managers */}
      {isCenterBased && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <h3 className="font-display font-semibold text-lg mb-4">Student Gender Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{maleCount}</p>
                <p className="text-sm text-muted-foreground">Male Students</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{femaleCount}</p>
                <p className="text-sm text-muted-foreground">Female Students</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <h3 className="font-display font-semibold text-lg mb-4">Class Distribution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{pp1Count}</p>
                <p className="text-sm text-muted-foreground">PP1 Students</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pp2Count}</p>
                <p className="text-sm text-muted-foreground">PP2 Students</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Statistics - show for all but with filtered data */}
      {filteredStudents && filteredStudents.length > 0 && !isCenterBased && (
        <StudentStatistics students={studentsForStats} />
      )}

      {/* Map - only show for admins */}
      {!isCenterBased && <CentersMap />}

      {/* Charts & Activity - only show county-wide charts for admins */}
      {!isCenterBased && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CenterDistribution />
          <RecentActivity />
        </div>
      )}

      {/* Teachers list for center managers */}
      {isCenterBased && filteredTeachers && filteredTeachers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          <h3 className="font-display font-semibold text-lg mb-4">Center Teachers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{teacher.full_name}</p>
                  <p className="text-sm text-muted-foreground">{teacher.qualification || "Teacher"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <span className="text-sm font-medium">{isCenterBased ? "View Students" : "Add Student"}</span>
          </Link>
          <Link 
            to="/teachers" 
            className="p-4 rounded-xl bg-secondary/5 hover:bg-secondary/10 transition-colors text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">{isCenterBased ? "View Teachers" : "Add Teacher"}</span>
          </Link>
          {!isCenterBased && (
            <Link 
              to="/centers" 
              className="p-4 rounded-xl bg-accent/5 hover:bg-accent/10 transition-colors text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <School className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Add Center</span>
            </Link>
          )}
          <Link
            to="/approvals"
            className="p-4 rounded-xl bg-info/5 hover:bg-info/10 transition-colors text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info group-hover:text-info-foreground transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Approvals</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Users, MapPin, Layers } from "lucide-react";

interface StudentStatisticsProps {
  students: Array<{
    gender: "male" | "female";
    class_level?: "pp1" | "pp2" | null;
    ecde_centers?: {
      name: string;
      sub_county: string;
      ward: string;
    } | null;
  }>;
}

const GENDER_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))"];
const LEVEL_COLORS = ["hsl(var(--accent))", "hsl(var(--info))"];

export function StudentStatistics({ students }: StudentStatisticsProps) {
  // Gender distribution
  const genderData = [
    { name: "Male", value: students.filter(s => s.gender === "male").length },
    { name: "Female", value: students.filter(s => s.gender === "female").length },
  ];

  // Class level distribution
  const levelData = [
    { name: "PP1", value: students.filter(s => s.class_level === "pp1" || !s.class_level).length },
    { name: "PP2", value: students.filter(s => s.class_level === "pp2").length },
  ];

  // Sub-county distribution
  const subCountyMap = new Map<string, number>();
  students.forEach(s => {
    const subCounty = s.ecde_centers?.sub_county || "Unassigned";
    subCountyMap.set(subCounty, (subCountyMap.get(subCounty) || 0) + 1);
  });
  const subCountyData = Array.from(subCountyMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Ward distribution
  const wardMap = new Map<string, number>();
  students.forEach(s => {
    const ward = s.ecde_centers?.ward || "Unassigned";
    wardMap.set(ward, (wardMap.get(ward) || 0) + 1);
  });
  const wardData = Array.from(wardMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label || payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Students: <span className="font-semibold text-foreground">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Gender Distribution */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Gender Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {genderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: GENDER_COLORS[index] }}
                />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Level Distribution */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-accent" />
            Class Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {levelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={LEVEL_COLORS[index % LEVEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {levelData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: LEVEL_COLORS[index] }}
                />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sub-County Distribution */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-info" />
            By Sub-County
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subCountyData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ward Distribution */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-secondary" />
            By Ward
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--secondary))" 
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
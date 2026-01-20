import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Mandera East", value: 12, color: "hsl(215, 70%, 25%)" },
  { name: "Mandera West", value: 8, color: "hsl(152, 45%, 35%)" },
  { name: "Mandera North", value: 6, color: "hsl(38, 95%, 55%)" },
  { name: "Mandera South", value: 5, color: "hsl(200, 80%, 50%)" },
  { name: "Lafey", value: 4, color: "hsl(280, 60%, 50%)" },
  { name: "Banissa", value: 3, color: "hsl(340, 70%, 50%)" },
];

export function CenterDistribution() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <h3 className="font-display font-semibold text-lg mb-4">
        Centers by Sub-County
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

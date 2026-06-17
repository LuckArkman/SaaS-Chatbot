import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

const DonutChart = ({ value, data, colors }) => {
  const chartData = Array.isArray(data) ? data : [];
  const chartColors = Array.isArray(colors) ? colors : ["#ccc"];

  return (
    <ResponsiveContainer width="100%" height={200}> 
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={65}
          paddingAngle={3}
          stroke="none"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
          <Label 
            position="center" 
            content={({ viewBox }) => {
              const { cx, cy } = viewBox;
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={cx} y={cy} fontSize="36" fontWeight="bold" fill="#333">
                    {`${value}`}
                  </tspan>
                  <tspan x={cx} y={cy + 22} fontSize="14" fill="#666">
                    Score
                  </tspan>
                </text>
              );
            }} 
          />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChart;
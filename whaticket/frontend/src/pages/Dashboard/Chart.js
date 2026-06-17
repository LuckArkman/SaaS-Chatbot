import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Legend,
  Label
} from 'recharts';
import { startOfHour, parseISO, format } from 'date-fns';
import Title from './Title';

function createData(time, amount) {
  return { time, amount };
}

export default function Chart({ tickets = [] }) {
  const theme = useTheme();
  const [chartData, setChartData] = useState([
    createData('00:00', 0), createData('01:00', 0), createData('02:00', 0),
    createData('03:00', 0), createData('04:00', 0), createData('05:00', 0),
    createData('06:00', 0), createData('07:00', 0), createData('08:00', 0),
    createData('09:00', 0), createData('10:00', 0), createData('11:00', 0),
    createData('12:00', 0), createData('13:00', 0), createData('14:00', 0),
    createData('15:00', 0), createData('16:00', 0), createData('17:00', 0),
    createData('18:00', 0), createData('19:00', 0), createData('20:00', 0),
    createData('21:00', 0), createData('22:00', 0), createData('23:00', 0),
  ]);

  useEffect(() => {
    setChartData(prev => {
      const aux = [...prev];
      aux.forEach(a => {
        tickets.forEach(t => {
          const pDate = parseISO(t.createdAt);
          const formattedHour = format(startOfHour(pDate), 'HH:00');
          if (a.time === formattedHour) {
            a.amount++;
          }
        });
      });
      return aux;
    });
  }, [tickets]);

  return (
    <React.Fragment>
      <Title>Atendimentos por hora</Title>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 0, left: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
          <YAxis type="number" allowDecimals={false} stroke={theme.palette.text.secondary}>
            <Tooltip />
            <Legend />
            <Label
              angle={270}
              position="left"
              style={{ textAnchor: 'middle', fill: theme.palette.text.primary }}
            >
              Tickets
            </Label>
          </YAxis>
          <Line
            type="monotone"
            dataKey="amount"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </React.Fragment>
  );
}

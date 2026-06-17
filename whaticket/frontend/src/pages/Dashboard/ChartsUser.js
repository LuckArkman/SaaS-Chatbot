import React, { useEffect, useState, useContext } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import brLocale from 'date-fns/locale/pt-BR';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Button, Grid, TextField, Box, Typography, CircularProgress } from '@mui/material';
import api from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useTheme as useThemeV5 } from "@mui/material/styles";
import { useTheme as useThemeV4 } from "@material-ui/core/styles";
import { i18n } from '../../translate/i18n';
import { AuthContext } from "../../context/Auth/AuthContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const ChatsUser = () => {
  const theme = useThemeV5();
  const themeV4 = useThemeV4(); // tema do login (whitelabel)

  const PRIMARY_MAIN = themeV4?.palette?.primary?.main || '#1976d2';
  const PRIMARY_DARK = themeV4?.palette?.primary?.dark || '#115293';
  const PRIMARY_CONTRAST = themeV4?.palette?.primary?.contrastText || '#fff';

  const [initialDate, setInitialDate] = useState(new Date());
  const [finalDate, setFinalDate] = useState(new Date());
  const [ticketsData, setTicketsData] = useState({ data: [] });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const companyId = user.companyId;

  useEffect(() => {
    if (companyId) handleGetTicketsInformation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleGetTicketsInformation = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(
        `/dashboard/ticketsUsers?initialDate=${format(initialDate, 'yyyy-MM-dd')}&finalDate=${format(finalDate, 'yyyy-MM-dd')}&companyId=${companyId}`
      );
      setTicketsData(data);
    } catch (error) {
      toast.error('Erro ao buscar informações dos tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const rgba = (hex, a = 0.3) => {
    let c = (hex || '').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substr(0, 2), 16) || 25;
    const g = parseInt(c.substr(2, 2), 16) || 118;
    const b = parseInt(c.substr(4, 2), 16) || 210;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { grid: { display: false } }
    }
  };

  const dataCharts = {
    labels: ticketsData?.data?.map(item => item.nome) || [],
    datasets: [
      {
        label: 'Tickets',
        data: ticketsData?.data?.map(item => item.quantidade) || [],
        backgroundColor: rgba(PRIMARY_MAIN, 0.35),
        hoverBackgroundColor: PRIMARY_DARK,
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  return (
    <Box>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
            <DatePicker
              value={initialDate}
              onChange={(newValue) => setInitialDate(newValue)}
              label={i18n.t("dashboard.date.initialDate")}
              renderInput={(params) => <TextField {...params} fullWidth size="small" />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
            <DatePicker
              value={finalDate}
              onChange={(newValue) => setFinalDate(newValue)}
              label={i18n.t("dashboard.date.finalDate")}
              renderInput={(params) => <TextField {...params} fullWidth size="small" />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md>
          <Button
            onClick={handleGetTicketsInformation}
            variant="contained"
            fullWidth
            disabled={isLoading}
            sx={{
              backgroundColor: PRIMARY_MAIN,
              color: PRIMARY_CONTRAST,
              transition: 'all .2s ease-in-out',
              borderRadius: '10px',
              py: 1,
              '&:hover': {
                backgroundColor: PRIMARY_DARK,
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 18px rgba(0,0,0,.15)',
              }
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : i18n.t("dashboard.buttons.filter")}
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ height: 400, position: 'relative' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : ticketsData?.data?.length > 0 ? (
          <Bar options={options} data={dataCharts} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: 'grey.100', borderRadius: 2 }}>
            <Typography color="textSecondary">Nenhum dado para exibir.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

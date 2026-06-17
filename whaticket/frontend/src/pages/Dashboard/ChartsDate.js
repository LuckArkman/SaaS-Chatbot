import React, { useEffect, useState, useContext } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import brLocale from "date-fns/locale/pt-BR";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { Button, Grid, TextField, Paper, Typography, Box, CircularProgress, Divider } from "@mui/material";
import api from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

// 🔹 Tema v4 (igual ao login) para pegar a cor whitelabel
import { useTheme as useThemeV4 } from "@material-ui/core/styles";
// 🔹 Mantemos o tema v5 para demais tokens (tooltip, textos, etc.)
import { useTheme as useThemeV5 } from "@mui/material/styles";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const ChartsDate = () => {
  const themeV5 = useThemeV5();
  const themeV4 = useThemeV4();

  const PRIMARY_MAIN = themeV4?.palette?.primary?.main || "#1976d2";
  const PRIMARY_DARK = themeV4?.palette?.primary?.dark || "#115293";
  const PRIMARY_CONTRAST = themeV4?.palette?.primary?.contrastText || "#fff";

  const [initialDate, setInitialDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [finalDate, setFinalDate] = useState(new Date());
  const [ticketsData, setTicketsData] = useState({ data: [], count: 0 });
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
        `/dashboard/ticketsDay?initialDate=${format(initialDate, "yyyy-MM-dd")}&finalDate=${format(finalDate, "yyyy-MM-dd")}&companyId=${companyId}`
      );
      setTicketsData(data);
    } catch {
      toast.error("Erro ao buscar informações dos tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: themeV5.palette.background.paper,
        titleColor: themeV5.palette.text.primary,
        bodyColor: themeV5.palette.text.secondary,
        borderColor: themeV5.palette.divider,
        borderWidth: 1,
        boxPadding: 8,
        padding: 10,
        usePointStyle: true,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: themeV5.palette.divider } },
    },
  };

  const dataCharts = {
    labels: ticketsData?.data.length > 0 ? ticketsData.data.map(item => (item.hasOwnProperty("horario") ? `${item.horario}:00` : item.data)) : [],
    datasets: [
      {
        label: "Tickets",
        data: ticketsData?.data.length > 0 ? ticketsData.data.map(item => item.total) : [],
        borderColor: PRIMARY_MAIN,
        backgroundColor: "rgba(0,0,0,0.06)", // preenchimento leve neutro (evita tingir de azul quando o primary não é azul)
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <Paper elevation={0} sx={{ p: 0, background: "transparent" }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography component="h2" variant="h6" fontWeight={700} color="text.primary" gutterBottom sx={{ mb: { xs: 1, sm: 0 } }}>
          {i18n.t("dashboard.users.totalAttendances")}
        </Typography>
        <Box
          sx={{
            ml: 1,
            px: 2,
            py: 1,
            backgroundColor: PRIMARY_MAIN,
            borderRadius: 2,
            color: PRIMARY_CONTRAST,
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          {i18n.t("dashboard.users.totalLabel", { count: ticketsData?.count || 0 })}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
            <DatePicker
              value={initialDate}
              onChange={newValue => setInitialDate(newValue)}
              label={i18n.t("dashboard.date.initialDate")}
              renderInput={params => <TextField {...params} fullWidth variant="outlined" size="small" />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
            <DatePicker
              value={finalDate}
              onChange={newValue => setFinalDate(newValue)}
              label={i18n.t("dashboard.date.finalDate")}
              renderInput={params => <TextField {...params} fullWidth variant="outlined" size="small" />}
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
              transition: "all .2s ease-in-out",
              borderRadius: "10px",
              py: 1,
              "&:hover": {
                backgroundColor: PRIMARY_DARK,
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(0,0,0,.15)",
              }
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : i18n.t("dashboard.buttons.filter")}
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ height: 350, position: "relative" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : ticketsData?.data.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", bgcolor: "grey.100", borderRadius: 2 }}>
            <Typography color="textSecondary">Nenhum dado disponível para o período selecionado.</Typography>
          </Box>
        ) : (
          <Line options={options} data={dataCharts} />
        )}
      </Box>
    </Paper>
  );
};

export default ChartsDate;

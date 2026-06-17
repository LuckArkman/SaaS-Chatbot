import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Box,
  makeStyles,
} from "@material-ui/core";
import { Save, CloudUpload } from "@material-ui/icons";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 900,
    margin: "0 auto"
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 500
  },
  tabs: {
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500
  },
  form: {
    marginTop: theme.spacing(1)
  },
  textField: {
    marginBottom: theme.spacing(2)
  },
  actions: {
    marginTop: theme.spacing(3),
    display: "flex",
    justifyContent: "flex-end"
  },
  button: {
    minWidth: 160
  },
  loadingWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4)
  },
  helperText: {
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    marginTop: -theme.spacing(0.5),
    marginBottom: theme.spacing(2)
  },
  brandingPreviewImg: {
    maxWidth: "100%",
    maxHeight: 120,
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    objectFit: "contain",
    background: "#fafafa"
  },
  uploadButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  }
}));

// helper pra montar URL da imagem (relativa ou absoluta)
const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;

  const base = process.env.REACT_APP_BACKEND_URL || "";
  if (!base) return value;

  const normalizedBase = base.replace(/\/+$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedBase}${path}`;
};

const GlobalConfig = () => {
  const classes = useStyles();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({
    loginLogo: false,
    loginBackground: false
  });

  const [config, setConfig] = useState({
    mpAccessToken: "",
    smtpHost: "",
    smtpPort: "",
    smtpSecure: "false",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    trialExpiration: "",
    loginLogo: "",
    loginBackground: "",
    loginWhatsapp: ""
  });

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === "trialExpiration") {
      const onlyDigits = value.replace(/\D/g, "");
      return setConfig(prev => ({ ...prev, [name]: onlyDigits }));
    }

    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put("/global-config", config);
      toast.success("Configurações salvas com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/global-config");
      setConfig(prev => ({
        ...prev,
        ...data,
        trialExpiration:
          data.trialExpiration !== undefined && data.trialExpiration !== null
            ? String(data.trialExpiration)
            : prev.trialExpiration
      }));
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleBrandingUpload = async (field, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field); // "loginLogo" ou "loginBackground"

    try {
      setUploading(prev => ({ ...prev, [field]: true }));
      const { data } = await api.post("/global-config/upload", formData);

      // backend retorna { field, url }
      const url = data?.url || data?.[field];

      if (url) {
        setConfig(prev => ({
          ...prev,
          [field]: url
        }));
      }

      toast.success("Imagem atualizada com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  if (loading) {
    return (
      <Paper className={classes.root}>
        <div className={classes.loadingWrapper}>
          <CircularProgress />
        </div>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root}>
      <Typography variant="h5" className={classes.title}>
        Configurações Globais da Plataforma
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabs}
      >
        <Tab label="Mercado Pago" />
        <Tab label="E-mail (SMTP)" />
        <Tab label="Trial / Assinatura" />
        <Tab label="Login / Capa" />
      </Tabs>

      <form onSubmit={handleSubmit} className={classes.form}>
        {/* ABA 0: MERCADO PAGO */}
        {tab === 0 && (
          <>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Mercado Pago
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Access Token"
                  name="mpAccessToken"
                  value={config.mpAccessToken}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
                <div className={classes.helperText}>
                  Use o Access Token do Mercado Pago da conta principal da
                  plataforma. As empresas clientes usarão sempre essa
                  configuração.
                </div>
              </Grid>
            </Grid>
          </>
        )}

        {/* ABA 1: SMTP */}
        {tab === 1 && (
          <>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              E-mail (SMTP)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Host"
                  name="smtpHost"
                  value={config.smtpHost}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField
                  label="Porta"
                  name="smtpPort"
                  value={config.smtpPort}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField
                  label="Secure (SSL/TLS)"
                  name="smtpSecure"
                  value={config.smtpSecure}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  helperText={`"true" para conexão segura, "false" para STARTTLS/normal`}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-mail"
                  name="smtpUser"
                  value={config.smtpUser}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Senha de app"
                  name="smtpPass"
                  value={config.smtpPass}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  type="password"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Remetente (FROM)"
                  name="smtpFrom"
                  value={config.smtpFrom}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  helperText={`Exemplo: Sua empresa <suporte@gmail.com>`}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* ABA 2: TRIAL */}
        {tab === 2 && (
          <>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Trial / Período de Teste
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Dias de teste"
                  name="trialExpiration"
                  value={config.trialExpiration}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                  type="number"
                  inputProps={{ min: 1 }}
                />
                <div className={classes.helperText}>
                  Quantidade de dias de teste que a empresa nova terá. Se
                  vazio, o sistema usa o valor padrão do .env (APP_TRIALEXPIRATION,
                  ex.: 3).
                </div>
              </Grid>
            </Grid>
          </>
        )}

        {/* ABA 3: LOGIN / CAPA */}
        {tab === 3 && (
          <>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              Login / capa
            </Typography>

            <Grid container spacing={3}>
              {/* LOGO DO LOGIN (apenas upload + preview) */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Logo do login</Typography>

                {config.loginLogo && (
                  <Box mt={1} mb={1}>
                    <img
                      src={resolveImageUrl(config.loginLogo)}
                      alt="Logo do login"
                      className={classes.brandingPreviewImg}
                    />
                  </Box>
                )}

                <input
                  id="loginLogoUpload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleBrandingUpload("loginLogo", e.target.files[0])
                  }
                />
                <label htmlFor="loginLogoUpload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    className={classes.uploadButton}
                    disabled={uploading.loginLogo}
                  >
                    {uploading.loginLogo ? "Enviando..." : "Enviar logo"}
                  </Button>
                </label>

                <div className={classes.helperText}>
                  Se nenhuma imagem for enviada, o sistema usa <code>/logo.png</code>.
                </div>
              </Grid>

              {/* CAPA / BACKGROUND DO LOGIN (apenas upload + preview) */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">
                  Imagem de fundo (capa do login)
                </Typography>

                {config.loginBackground && (
                  <Box mt={1} mb={1}>
                    <img
                      src={resolveImageUrl(config.loginBackground)}
                      alt="Capa do login"
                      className={classes.brandingPreviewImg}
                    />
                  </Box>
                )}

                <input
                  id="loginBackgroundUpload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleBrandingUpload("loginBackground", e.target.files[0])
                  }
                />
                <label htmlFor="loginBackgroundUpload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    className={classes.uploadButton}
                    disabled={uploading.loginBackground}
                  >
                    {uploading.loginBackground ? "Enviando..." : "Enviar capa"}
                  </Button>
                </label>

                <div className={classes.helperText}>
                  Recomendada imagem em <code>.webp</code> ou <code>.jpg</code>. 
                  Se vazio, o sistema usa a capa padrão.
                </div>
              </Grid>

              {/* LINK DO WHATSAPP DO LOGIN (mantém campo de texto) */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Link do WhatsApp do login"
                  name="loginWhatsapp"
                  value={config.loginWhatsapp}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.textField}
                  size="small"
                />
                <div className={classes.helperText}>
                  Exemplo: <code>https://wa.me/5541999999999</code>. Usado no botão
                  de WhatsApp da tela de login e no botão "Chamar suporte".
                </div>
              </Grid>
            </Grid>
          </>
        )}

        <div className={classes.actions}>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            className={classes.button}
            startIcon={!saving && <Save />}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : "Salvar"}
          </Button>
        </div>
      </form>
    </Paper>
  );
};

export default GlobalConfig;

import React, { useEffect, useState, useContext } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogContent,
  Paper,
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from "@material-ui/core";
import {
  Smartphone,
  MoreVert,
  Settings,
  Link,
  CameraAlt
} from "@material-ui/icons";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(3),
  },
  dialogPaper: {
    borderRadius: 16,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  contentPaper: {
    padding: theme.spacing(4),
    borderRadius: 12,
    textAlign: "center",
    background: "white",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  title: {
    fontWeight: 700,
    color: "#2d3748",
    marginBottom: theme.spacing(2),
    fontSize: "1.5rem",
  },
  subtitle: {
    color: "#718096",
    marginBottom: theme.spacing(3),
    fontSize: "1rem",
  },
  qrContainer: {
    padding: theme.spacing(2),
    backgroundColor: "white",
    borderRadius: 12,
    margin: theme.spacing(2, 0),
    border: "1px solid #e2e8f0",
    display: "inline-block",
  },
  qrCode: {
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  instructions: {
    marginTop: theme.spacing(3),
    textAlign: "left",
  },
  instructionList: {
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    padding: theme.spacing(2),
  },
  listItem: {
    padding: theme.spacing(1, 0),
  },
  listIcon: {
    minWidth: 40,
    color: theme.palette.primary.main, // <-- cor seguindo o whitelabel
  },
  timer: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: "#edf2f7",
    borderRadius: 20,
    display: "inline-block",
    fontWeight: 600,
    color: "#4a5568",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(4),
  },
  brand: {
    fontWeight: 700,
    color: theme.palette.primary.main,
    fontSize: "1.2rem",
    marginBottom: theme.spacing(1),
  },
}));

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
  const classes = useStyles();
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setQrCode(data.qrcode);
        setTimeLeft(60); // Reset timer when new QR code is fetched
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!qrCode) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 60;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrCode]);

  useEffect(() => {
    if (!whatsAppId) return;
    const companyId = user.companyId;

    const onWhatsappData = (data) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setQrCode(data.session.qrcode);
        setTimeLeft(60);
      }

      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    };

    socket.on(`company-${companyId}-whatsappSession`, onWhatsappData);

    return () => {
      socket.off(`company-${companyId}-whatsappSession`, onWhatsappData);
    };
  }, [whatsAppId, onClose, user.companyId, socket]);

  const instructions = [
    {
      icon: <Smartphone />,
      text: "Abra o WhatsApp no seu celular",
    },
    {
      icon: <MoreVert />,
      text: "Toque em Mais opções no Android ou em Configurações no iPhone",
    },
    {
      icon: <Link />,
      text: "Toque em Dispositivos conectados e depois em Conectar dispositivos",
    },
    {
      icon: <CameraAlt />,
      text:
        "Aponte a câmera do celular para esta tela para escanear o QR Code",
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: classes.dialogPaper,
      }}
    >
      <DialogContent style={{ padding: 0 }}>
        <Paper className={classes.contentPaper}>
          <div className={classes.root}>
            <Typography className={classes.brand}>
              {/* você pode colocar o nome do sistema aqui, se quiser */}
            </Typography>
            <Typography className={classes.title}>
              Conectar WhatsApp
            </Typography>
            <Typography className={classes.subtitle}>
              Escaneie o QR Code para vincular sua conta do WhatsApp
            </Typography>

            {qrCode ? (
              <>
                <div className={classes.qrContainer}>
                  <QRCode
                    value={qrCode}
                    size={280}
                    className={classes.qrCode}
                    fgColor="#2d3748"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>

                <div className={classes.timer}>Atualiza em: {timeLeft}s</div>

                <div className={classes.instructions}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Como conectar:
                  </Typography>
                  <List className={classes.instructionList} dense>
                    {instructions.map((instruction, index) => (
                      <ListItem key={index} className={classes.listItem}>
                        <ListItemIcon className={classes.listIcon}>
                          {instruction.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={instruction.text}
                          primaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </div>

                <Typography
                  variant="caption"
                  color="textSecondary"
                  style={{ marginTop: 16 }}
                >
                  O QR Code atualiza automaticamente a cada 60 segundos
                </Typography>
              </>
            ) : (
              <div className={classes.loadingContainer}>
                <CircularProgress
                  size={40}
                  style={{ color: "#667eea" }}
                />
                <Typography variant="body1" color="textSecondary">
                  Aguardando pelo QR Code...
                </Typography>
              </div>
            )}
          </div>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);

import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import { Facebook, Instagram, WhatsApp } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import Checkbox from "@material-ui/core/Checkbox";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import BlockIcon from "@material-ui/icons/Block";

import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import formatSerializedId from "../../utils/formatSerializedId";
import { v4 as uuidv4 } from "uuid";

import { ArrowDropDown, Backup, ContactPhone } from "@material-ui/icons";
import { Menu, MenuItem } from "@material-ui/core";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

// ================= GEO / DDD CONFIG DO MAPA =================

const geoUrl =
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const markers = [
  { markerOffset: -30, name: "Aracaju", coordinates: [-37.0717, -10.9472] },
  { markerOffset: 15, name: "Belém", coordinates: [-48.4878, -1.4558] },
  { markerOffset: 15, name: "Belo Horizonte", coordinates: [-43.9378, -19.8157] },
  { markerOffset: 15, name: "Boa Vista", coordinates: [-60.6739, 2.8195] },
  { markerOffset: 15, name: "Brasília", coordinates: [-47.8825, -15.7942] },
  { markerOffset: 15, name: "Campo Grande", coordinates: [-54.6464, -20.4428] },
  { markerOffset: 15, name: "Cuiabá", coordinates: [-56.0969, -15.6011] },
  { markerOffset: 15, name: "Curitiba", coordinates: [-49.2736, -25.4296] },
  { markerOffset: 15, name: "Florianópolis", coordinates: [-48.5492, -27.5969] },
  { markerOffset: 15, name: "Fortaleza", coordinates: [-38.5267, -3.71839] },
  { markerOffset: 15, name: "Goiânia", coordinates: [-49.2736, -16.6869] },
  { markerOffset: 15, name: "João Pessoa", coordinates: [-34.8631, -7.1195] },
  { markerOffset: 15, name: "Macapá", coordinates: [-51.0667, 0.0333] },
  { markerOffset: 15, name: "Maceió", coordinates: [-35.7353, -9.6658] },
  { markerOffset: 15, name: "Manaus", coordinates: [-60.025, -3.10194] },
  { markerOffset: 15, name: "Natal", coordinates: [-35.2094, -5.795] },
  { markerOffset: 15, name: "Palmas", coordinates: [-48.3347, -10.1844] },
  { markerOffset: 15, name: "Porto Alegre", coordinates: [-51.23, -30.0331] },
  { markerOffset: 15, name: "Porto Velho", coordinates: [-63.9039, -8.7619] },
  { markerOffset: 15, name: "Recife", coordinates: [-34.8811, -8.05389] },
  { markerOffset: 15, name: "Rio Branco", coordinates: [-67.8099, -9.9747] },
  { markerOffset: 15, name: "Rio de Janeiro", coordinates: [-43.1729, -22.9068] },
  { markerOffset: 15, name: "Salvador", coordinates: [-38.4813, -12.9716] },
  { markerOffset: 15, name: "São Luís", coordinates: [-44.3028, -2.5283] },
  { markerOffset: 15, name: "São Paulo", coordinates: [-46.6333, -23.5505] },
  { markerOffset: 15, name: "Teresina", coordinates: [-42.8039, -5.0892] },
  { markerOffset: 15, name: "Vitória", coordinates: [-40.3378, -20.3194] },
];

const dddList = {
  "11": "São Paulo",
  "12": "São Paulo",
  "13": "São Paulo",
  "14": "São Paulo",
  "15": "São Paulo",
  "16": "São Paulo",
  "17": "São Paulo",
  "18": "São Paulo",
  "19": "São Paulo",
  "21": "Rio de Janeiro",
  "22": "Rio de Janeiro",
  "24": "Rio de Janeiro",
  "27": "Espírito Santo",
  "28": "Espírito Santo",
  "31": "Minas Gerais",
  "32": "Minas Gerais",
  "33": "Minas Gerais",
  "34": "Minas Gerais",
  "35": "Minas Gerais",
  "37": "Minas Gerais",
  "38": "Minas Gerais",
  "41": "Paraná",
  "42": "Paraná",
  "43": "Paraná",
  "44": "Paraná",
  "45": "Paraná",
  "46": "Paraná",
  "47": "Santa Catarina",
  "48": "Santa Catarina",
  "49": "Santa Catarina",
  "51": "Rio Grande do Sul",
  "53": "Rio Grande do Sul",
  "54": "Rio Grande do Sul",
  "55": "Rio Grande do Sul",
  "61": "Distrito Federal/Goiás",
  "62": "Goiás",
  "63": "Tocantins",
  "64": "Goiás",
  "65": "Mato Grosso",
  "66": "Mato Grosso",
  "67": "Mato Grosso do Sul",
  "68": "Acre",
  "69": "Rondônia",
  "71": "Bahia",
  "73": "Bahia",
  "74": "Bahia",
  "75": "Bahia",
  "77": "Bahia",
  "79": "Sergipe",
  "81": "Pernambuco",
  "82": "Alagoas",
  "83": "Paraíba",
  "84": "Rio Grande do Norte",
  "85": "Ceará",
  "86": "Piauí",
  "87": "Pernambuco",
  "88": "Ceará",
  "89": "Piauí",
  "91": "Pará",
  "92": "Amazonas",
  "93": "Pará",
  "94": "Pará",
  "95": "Roraima",
  "96": "Amapá",
  "97": "Amazonas",
  "98": "Maranhão",
  "99": "Maranhão",
};

// ================= REDUCER =================

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  // ESTILOS PARA A ABA MAPA
  legendContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "20px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    margin: "5px 10px",
  },
  legendColor: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    marginRight: "5px",
    backgroundColor: "#FFA500",
  },
  totalContactsBar: {
    backgroundColor: theme.palette.primary.main, // usa cor primária do whitelabel
    padding: "10px",
    textAlign: "center",
    color: "white",
    marginBottom: "20px",
    borderRadius: "4px",
  },
  legendCard: {
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#e8e8e8",
    borderRadius: "8px",
    boxShadow: "none",
  },

  // ESTILO DOS CARDS DE CONTATO (MODELO DA SUA PRINT)
  contactCard: {
    backgroundColor: "#e7edf3",
    borderRadius: 8,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  cardAvatar: {
    marginRight: theme.spacing(2),
    width: 48,
    height: 48,
  },
  cardNumber: {
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
  cardLabel: {
    fontSize: "0.8rem",
    fontWeight: 500,
    marginTop: theme.spacing(0.5),
  },
  cardFooter: {
    marginTop: theme.spacing(2),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsRight: {
    display: "flex",
    gap: theme.spacing(1),
  },
  actionBtnWhats: {
    backgroundColor: "#25D366",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1ebe5b",
    },
  },
  actionBtnEdit: {
    backgroundColor: "#2196f3",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1976d2",
    },
  },
  actionBtnBlock: {
    backgroundColor: "#ff9800",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#fb8c00",
    },
  },
  actionBtnDelete: {
    backgroundColor: "#f44336",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#e53935",
    },
  },
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();
  const theme = useTheme();

  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const [importContactModalOpen, setImportContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [ImportContacts, setImportContacts] = useState(null);

  const [blockingContact, setBlockingContact] = useState(null);
  const [unBlockingContact, setUnBlockingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportContact, setExportContact] = useState(false);
  const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const fileUploadRef = useRef(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const { setCurrentTicket } = useContext(TicketsContext);

  const [importWhatsappId, setImportWhatsappId] = useState();

  // SELEÇÃO EM MASSA
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  const [confirmDeleteManyOpen, setConfirmDeleteManyOpen] = useState(false);

  const { getAll: getAllSettings } = useCompanySettings();
  const [hideNum, setHideNum] = useState(false);
  const [enableLGPD, setEnableLGPD] = useState(false);

  // CONTROLE DE ABAS (CONTATOS / MAPA)
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    async function fetchData() {
      const settingList = await getAllSettings(user.companyId);
      for (const [key, value] of Object.entries(settingList)) {
        if (key === "enableLGPD") setEnableLGPD(value === "enabled");
        if (key === "lgpdHideNumber") setHideNum(value === "enabled");
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportExcel = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.request({
        url: `/contacts/upload`,
        method: "POST",
        data: formData,
      });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setSelectedContactIds([]);
    setIsSelectAllChecked(false);
  }, [searchParam, selectedTags]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: {
              searchParam,
              pageNumber,
              contactTag: JSON.stringify(selectedTags),
            },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);

          const allCurrentContactIds = data.contacts.map((c) => c.id);
          const newSelected = selectedContactIds.filter((id) =>
            allCurrentContactIds.includes(id)
          );
          setSelectedContactIds(newSelected);
          setIsSelectAllChecked(
            newSelected.length === allCurrentContactIds.length &&
              allCurrentContactIds.length > 0
          );
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedTags]);

  useEffect(() => {
    const companyId = user.companyId;
    const onContactEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
        setSelectedContactIds((prevSelected) =>
          prevSelected.filter((id) => id !== +data.contactId)
        );
      }
    };
    socket.on(`company-${companyId}-contact`, onContactEvent);

    return () => {
      socket.off(`company-${companyId}-contact`, onContactEvent);
    };
  }, [socket, user.companyId]);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
  };

  const handleToggleSelectContact = (contactId) => (event) => {
    if (event.target.checked) {
      setSelectedContactIds((prevSelected) => [...prevSelected, contactId]);
    } else {
      setSelectedContactIds((prevSelected) =>
        prevSelected.filter((id) => id !== contactId)
      );
      setIsSelectAllChecked(false);
    }
  };

  const handleSelectAllContacts = (event) => {
    const checked = event.target.checked;
    setIsSelectAllChecked(checked);

    if (checked) {
      const allContactIds = contacts.map((contact) => contact.id);
      setSelectedContactIds(allContactIds);
    } else {
      setSelectedContactIds([]);
    }
  };

  const handleDeleteSelectedContacts = async () => {
    try {
      setLoading(true);
      await api.delete("/contacts/batch-delete", {
        data: { contactIds: selectedContactIds },
      });
      toast.success("Contatos selecionados deletados com sucesso!");
      setSelectedContactIds([]);
      setIsSelectAllChecked(false);
      setConfirmDeleteManyOpen(false);
      dispatch({ type: "RESET" });
      setPageNumber(1);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: false });
      dispatch({
        type: "UPDATE_CONTACTS",
        payload: { ...blockingContact, active: false },
      });
      toast.success("Contato bloqueado");
    } catch (err) {
      toastError(err);
    }
    setBlockingContact(null);
  };

  const handleUnBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: true });
      dispatch({
        type: "UPDATE_CONTACTS",
        payload: { ...unBlockingContact, active: true },
      });
      toast.success("Contato desbloqueado");
    } catch (err) {
      toastError(err);
    }
    setUnBlockingContact(null);
  };

  const onSave = (whatsappId) => {
    setImportWhatsappId(whatsappId);
  };

  const handleimportContact = async () => {
    setImportContactModalOpen(false);

    try {
      await api.post("/contacts/import", { whatsappId: importWhatsappId });
      history.go(0);
      setImportContactModalOpen(false);
    } catch (err) {
      toastError(err);
      setImportContactModalOpen(false);
    }
  };

  const handleimportChats = async () => {
    try {
      await api.post("/contacts/import/chats");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  // ===== FUNÇÃO PARA CONTAR CONTATOS POR ESTADO (USADA NO MAPA) =====
  const countContactsByState = () => {
    const stateCounts = {};

    contacts.forEach((contact) => {
      const number = contact.number;
      if (number && number.length > 4) {
        const ddd = number.substring(2, 4);
        if (dddList[ddd]) {
          const state = dddList[ddd];
          if (!stateCounts[state]) {
            stateCounts[state] = 0;
          }
          stateCounts[state]++;
        } else {
          if (!stateCounts["Outros"]) {
            stateCounts["Outros"] = 0;
          }
          stateCounts["Outros"]++;
        }
      }
    });

    return stateCounts;
  };

  const stateCounts = countContactsByState();

  return (
    <MainContainer className={classes.mainContainer}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>

      <ConfirmationModal
        title={
          deletingContact
            ? `${i18n.t(
                "contacts.confirmationModal.deleteTitle"
              )} ${deletingContact.name}?`
            : blockingContact
            ? `Bloquear Contato ${blockingContact.name}?`
            : unBlockingContact
            ? `Desbloquear Contato ${unBlockingContact.name}?`
            : ImportContacts
            ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
            : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
        }
        onSave={onSave}
        isCellPhone={ImportContacts}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={(e) =>
          deletingContact
            ? handleDeleteContact(deletingContact.id)
            : blockingContact
            ? handleBlockContact(blockingContact.id)
            : unBlockingContact
            ? handleUnBlockContact(unBlockingContact.id)
            : ImportContacts
            ? handleimportContact()
            : handleImportExcel()
        }
      >
        {exportContact
          ? `${i18n.t("contacts.confirmationModal.exportContact")}`
          : deletingContact
          ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
          : blockingContact
          ? `${i18n.t("contacts.confirmationModal.blockContact")}`
          : unBlockingContact
          ? `${i18n.t("contacts.confirmationModal.unblockContact")}`
          : ImportContacts
          ? `Escolha de qual conexão deseja importar`
          : `${i18n.t(
              "contactListItems.confirmationModal.importMessage"
            )}`}
      </ConfirmationModal>

      <ConfirmationModal
        title={`Tem certeza que deseja deletar ${selectedContactIds.length} contatos selecionados?`}
        open={confirmDeleteManyOpen}
        onClose={() => setConfirmDeleteManyOpen(false)}
        onConfirm={handleDeleteSelectedContacts}
      >
        Essa ação é irreversível.
      </ConfirmationModal>

      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.importChat")}
        open={confirmChatsOpen}
        onClose={setConfirmChatsOpen}
        onConfirm={(e) => handleimportChats()}
      >
        {i18n.t("contacts.confirmationModal.wantImport")}
      </ConfirmationModal>

      <MainHeader>
        <Title>
          {i18n.t("contacts.title")} ({contacts.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <TagsFilter onFiltered={handleSelectedTags} />
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="secondary" />
                </InputAdornment>
              ),
            }}
          />
          <PopupState variant="popover" popupId="demo-popup-menu">
            {(popupState) => (
              <React.Fragment>
                <Button
                  variant="contained"
                  color="primary"
                  {...bindTrigger(popupState)}
                >
                  Importar / Exportar
                  <ArrowDropDown />
                </Button>
                <Menu {...bindMenu(popupState)}>
                  <MenuItem
                    onClick={() => {
                      setConfirmOpen(true);
                      setImportContacts(true);
                      popupState.close();
                    }}
                  >
                    <ContactPhone
                      fontSize="small"
                      color="primary"
                      style={{
                        marginRight: 10,
                      }}
                    />
                    {i18n.t("contacts.menu.importYourPhone")}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setImportContactModalOpen(true);
                    }}
                  >
                    <Backup
                      fontSize="small"
                      color="primary"
                      style={{
                        marginRight: 10,
                      }}
                    />
                    {i18n.t("contacts.menu.importToExcel")}
                  </MenuItem>
                </Menu>
              </React.Fragment>
            )}
          </PopupState>

          <Button
            variant="contained"
            onClick={() => setConfirmDeleteManyOpen(true)}
            disabled={selectedContactIds.length === 0 || loading}
            style={{
              marginRight: 8,
              backgroundColor: theme.palette.primary.main,
              color: "white",
            }}
          >
            Deletar Selecionados ({selectedContactIds.length})
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenContactModal}
          >
            {i18n.t("contacts.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      {importContactModalOpen && (
        <ContactImportWpModal
          isOpen={importContactModalOpen}
          handleClose={() => setImportContactModalOpen(false)}
          selectedTags={selectedTags}
          hideNum={hideNum}
          userProfile={user.profile}
        />
      )}

      {/* ABAS CONTATOS / MAPA */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="abas-contatos-mapa"
      >
        <Tab label="Contatos" />
        <Tab label="Mapa" />
      </Tabs>

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <>
          <input
            style={{ display: "none" }}
            id="upload"
            name="file"
            type="file"
            accept=".xls,.xlsx"
            onChange={() => {
              setConfirmOpen(true);
            }}
            ref={fileUploadRef}
          />
        </>

        {/* ABA CONTATOS EM CARDS */}
        {tabValue === 0 && (
          <Box p={2}>
            {/* checkbox global "selecionar todos" */}
            <Box display="flex" alignItems="center" mb={2}>
              <Checkbox
                checked={isSelectAllChecked}
                onChange={handleSelectAllContacts}
                inputProps={{ "aria-label": "Selecionar todos os contatos" }}
              />
              <Typography variant="body2">
                Selecionar todos os contatos
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {contacts.map((contact) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={contact.id}>
                  <Card className={classes.contactCard}>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box className={classes.cardHeader}>
                          <Avatar
                            src={`${contact?.urlPicture}`}
                            className={classes.cardAvatar}
                          />
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              {contact.name || "-"}
                            </Typography>
                            <Typography
                              variant="body2"
                              className={classes.cardNumber}
                            >
                              {enableLGPD && hideNum && user.profile === "user"
                                ? contact.isGroup
                                  ? contact.number
                                  : formatSerializedId(contact?.number) === null
                                  ? contact.number.slice(0, -6) +
                                    "**-**" +
                                    contact?.number.slice(-2)
                                  : formatSerializedId(
                                      contact?.number
                                    )?.slice(0, -6) +
                                    "**-**" +
                                    contact?.number?.slice(-2)
                                : contact.isGroup
                                ? contact.number
                                : formatSerializedId(contact?.number)}
                            </Typography>
                            {contact.email && (
                              <Typography
                                variant="body2"
                                className={classes.cardNumber}
                              >
                                {contact.email}
                              </Typography>
                            )}
                            {contact?.whatsapp?.name && (
                              <Typography
                                variant="body2"
                                className={classes.cardNumber}
                              >
                                Conexão: {contact?.whatsapp?.name}
                              </Typography>
                            )}
                            <Typography
                              variant="body2"
                              className={classes.cardLabel}
                            >
                              Status:{" "}
                              {contact.active ? (
                                <CheckCircleIcon
                                  style={{ color: "green", fontSize: 16 }}
                                />
                              ) : (
                                <CancelIcon
                                  style={{ color: "red", fontSize: 16 }}
                                />
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        <Checkbox
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={handleToggleSelectContact(contact.id)}
                          inputProps={{
                            "aria-label": `Selecionar contato ${contact.name}`,
                          }}
                        />
                      </Box>

                      <Box className={classes.cardFooter}>
                        <Box>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                          >
                            WhatsApp:
                          </Typography>
                        </Box>
                        <Box className={classes.actionsRight}>
                          <IconButton
                            size="small"
                            className={classes.actionBtnWhats}
                            disabled={!contact.active}
                            onClick={() => {
                              setContactTicket(contact);
                              setNewTicketModalOpen(true);
                            }}
                          >
                            {contact.channel === "whatsapp" && <WhatsApp />}
                            {contact.channel === "instagram" && <Instagram />}
                            {contact.channel === "facebook" && <Facebook />}
                          </IconButton>

                          <IconButton
                            size="small"
                            className={classes.actionBtnEdit}
                            onClick={() => hadleEditContact(contact.id)}
                          >
                            <EditIcon style={{ fontSize: 18 }} />
                          </IconButton>

                          <IconButton
                            size="small"
                            className={classes.actionBtnBlock}
                            onClick={
                              contact.active
                                ? () => {
                                    setConfirmOpen(true);
                                    setBlockingContact(contact);
                                  }
                                : () => {
                                    setConfirmOpen(true);
                                    setUnBlockingContact(contact);
                                  }
                            }
                          >
                            {contact.active ? (
                              <BlockIcon style={{ fontSize: 18 }} />
                            ) : (
                              <CheckCircleIcon style={{ fontSize: 18 }} />
                            )}
                          </IconButton>

                          <Can
                            role={user.profile}
                            perform="contacts-page:deleteContact"
                            yes={() => (
                              <IconButton
                                size="small"
                                className={classes.actionBtnDelete}
                                onClick={(e) => {
                                  setConfirmOpen(true);
                                  setDeletingContact(contact);
                                }}
                              >
                                <DeleteOutlineIcon style={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {loading && (
              <Box mt={2}>
                <TableRowSkeleton avatar columns={6} />
              </Box>
            )}
          </Box>
        )}

        {/* ABA MAPA */}
        {tabValue === 1 && (
          <>
            <Box className={classes.totalContactsBar}>
              <Typography variant="h6">
                Total de Contatos por Estado: {contacts.length}
              </Typography>
            </Box>

            <Box p={3}>
              <Card className={classes.legendCard}>
                <CardContent>
                  <Box className={classes.legendContainer}>
                    {Object.entries(stateCounts).map(([state, count]) => (
                      <Box key={state} className={classes.legendItem}>
                        <div className={classes.legendColor} />
                        <Typography variant="body2">
                          {state}: {count} contato(s)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 600,
                  center: [-53, -15],
                }}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const state = geo.properties.name;
                      const count = stateCounts[state] || 0;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={count > 0 ? "#FFA500" : "#EAEAEC"}
                          stroke="#D6D6DA"
                          style={{
                            hover: {
                              fill: "#FFA500",
                              stroke: "#D6D6DA",
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {markers.map(({ name, coordinates, markerOffset }) => (
                  <Marker key={name} coordinates={coordinates}>
                    <circle
                      r={5}
                      fill="#F00"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      y={markerOffset}
                      style={{
                        fontFamily: "system-ui",
                        fill: "#5D5A6D",
                        fontSize: "12px",
                      }}
                    >
                      {name}
                    </text>
                  </Marker>
                ))}
              </ComposableMap>
            </Box>
          </>
        )}
      </Paper>
    </MainContainer>
  );
};

export default Contacts;

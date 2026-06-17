import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import Compressor from "compressorjs";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
  Checkbox,
  Stack,
  Typography,
} from "@mui/material";
import {
  AccessTime,
  Delete,
  Image,
  Message,
  MicNone,
  Videocam,
  Description,
} from "@mui/icons-material";
import { capitalize } from "../../utils/capitalize";
import { Box, Divider } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },

  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const FlowBuilderSingleBlockModal = ({
  open,
  onSave,
  onUpdate,
  data,
  close,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const [activeModal, setActiveModal] = useState(false);
  const [medias, setMedias] = useState([]);
  const [elements, setElements] = useState([]);
  const [elementsSeq, setElementsSeq] = useState([]);
  const [elementsSeqEdit, setElementsSeqEdit] = useState([]);
  const [elementsEdit, setElementsEdit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState([]);

  const [numberMessages, setNumberMessages] = useState(0);
  const [numberMessagesLast, setNumberMessagesLast] = useState(0);

  const [numberInterval, setNumberInterval] = useState(0);
  const [numberIntervalLast, setNumberIntervalLast] = useState(0);
  
  const [numberImg, setNumberImg] = useState(0);
  const [numberImgLast, setNumberImgLast] = useState(0);
  const [previewImg, setPreviewImg] = useState([]);
  
  const [numberAudio, setNumberAudio] = useState(0);
  const [numberAudioLast, setNumberAudioLast] = useState(0);
  const [previewAudios, setPreviewAudios] = useState([]);
  
  const [numberVideo, setNumberVideo] = useState(0);
  const [numberVideoLast, setNumberVideoLast] = useState(0);
  const [previewVideos, setPreviewVideos] = useState([]);

  const [numberDocument, setNumberDocument] = useState(0);
  const [numberDocumentLast, setNumberDocumentLast] = useState(0);
  const [previewDocuments, setPreviewDocuments] = useState([]);

  const [labels, setLabels] = useState({
    title: "Adicionar conteúdo ao fluxo",
    btn: "Adicionar",
  });

  const handleElements = (newNameFiles) => {
    let elementsSequence = [];

    const newArrMessage = elementsSeq.filter((item) => item.includes("message"));
    const newArrInterval = elementsSeq.filter((item) => item.includes("interval"));
    const newArrImg = elementsSeq.filter((item) => item.includes("img"));
    const newArrAudio = elementsSeq.filter((item) => item.includes("audio"));
    const newArrVideo = elementsSeq.filter((item) => item.includes("video"));
    const newArrDocument = elementsSeq.filter((item) => item.includes("document"));

    for (let i = 0; i < numberMessages; i++) {
      const value = document.querySelector(`.${newArrMessage[i]}`).querySelector(".MuiInputBase-input").value;
      if (!value) {
        toast.error("Campos de mensagem vazio!");
        setLoading(false);
        throw "";
      }
      elementsSequence.push({
        type: "message",
        value: value,
        number: newArrMessage[i],
      });
    }

    for (let i = 0; i < numberInterval; i++) {
      const value = document.querySelector(`.${newArrInterval[i]}`).querySelector(".MuiInputBase-input").value;
      if (parseInt(value) === 0 || parseInt(value) > 120) {
        toast.error("Intervalo não pode ser 0 ou maior que 120!");
        setLoading(false);
        throw "";
      }
      elementsSequence.push({
        type: "interval",
        value: value,
        number: newArrInterval[i],
      });
    }

    for (let i = 0; i < numberImg; i++) {
      const onlyImg = newNameFiles !== null && newNameFiles.filter((file) => file.includes("png") || file.includes("jpg") || file.includes("jpeg"));
      const onlyImgNameOriginal = medias.filter((file) => file.name.includes("png") || file.name.includes("jpg") || file.name.includes("jpeg"));
      if (elementsSeqEdit.includes(newArrImg[i])) {
        const itemSelectedEdit = elementsEdit.filter((item) => item.number === newArrImg[i])[0];
        elementsSequence.push({ type: "img", value: itemSelectedEdit.value, original: itemSelectedEdit.original, number: itemSelectedEdit.number });
      } else {
        let indexElem = elementsSeqEdit.filter((item) => item.includes("img")).length > 0 ? elementsSeqEdit.filter((item) => item.includes("img")).length - i : i;
        elementsSequence.push({ type: "img", value: onlyImg[indexElem], original: onlyImgNameOriginal[indexElem].name, number: newArrImg[i] });
      }
    }

    for (let i = 0; i < numberAudio; i++) {
      const onlyAudio = newNameFiles !== null && newNameFiles.filter((file) => file.includes("mp3") || file.includes("ogg") || file.includes("mpeg") || file.includes("opus"));
      const onlyAudioNameOriginal = medias.filter((file) => file.name.includes("mp3") || file.name.includes("ogg") || file.name.includes("mpeg") || file.name.includes("opus"));
      if (elementsSeqEdit.includes(newArrAudio[i])) {
        const itemSelectedEdit = elementsEdit.filter((item) => item.number === newArrAudio[i])[0];
        elementsSequence.push({ type: "audio", value: itemSelectedEdit.value, original: itemSelectedEdit.original, number: itemSelectedEdit.number, record: document.querySelector(`.check${newArrAudio[i]}`).querySelector(".PrivateSwitchBase-input").checked });
      } else {
        let indexElem = elementsSeqEdit.filter((item) => item.includes("audio")).length > 0 ? elementsSeqEdit.filter((item) => item.includes("audio")).length - i : i;
        elementsSequence.push({ type: "audio", value: onlyAudio[indexElem], original: onlyAudioNameOriginal[indexElem].name, number: newArrAudio[i], record: document.querySelector(`.check${newArrAudio[i]}`).querySelector(".PrivateSwitchBase-input").checked });
      }
    }

    for (let i = 0; i < numberVideo; i++) {
      const onlyVideo = newNameFiles !== null && newNameFiles.filter((file) => file.includes("mp4") || file.includes("avi"));
      const onlyVideoNameOriginal = medias.filter((file) => file.name.includes("mp4") || file.name.includes("avi"));
      if (elementsSeqEdit.includes(newArrVideo[i])) {
        const itemSelectedEdit = elementsEdit.filter((item) => item.number === newArrVideo[i])[0];
        elementsSequence.push({ type: "video", value: itemSelectedEdit.value, original: itemSelectedEdit.original, number: itemSelectedEdit.number });
      } else {
        let indexElem = elementsSeqEdit.filter((item) => item.includes("video")).length > 0 ? elementsSeqEdit.filter((item) => item.includes("video")).length - i : i;
        elementsSequence.push({ type: "video", value: onlyVideo[indexElem], original: onlyVideoNameOriginal[indexElem].name, number: newArrVideo[i] });
      }
    }

    for (let i = 0; i < numberDocument; i++) {
      const onlyDocument = newNameFiles !== null && newNameFiles.filter((file) => file.includes("pdf") || file.includes("doc") || file.includes("docx") || file.includes("xls") || file.includes("xlsx") || file.includes("txt") || file.includes("csv"));
      const onlyDocumentNameOriginal = medias.filter((file) => file.name.includes("pdf") || file.name.includes("doc") || file.name.includes("docx") || file.name.includes("xls") || file.name.includes("xlsx") || file.name.includes("txt") || file.name.includes("csv"));
      if (elementsSeqEdit.includes(newArrDocument[i])) {
        const itemSelectedEdit = elementsEdit.filter((item) => item.number === newArrDocument[i])[0];
        elementsSequence.push({ type: "document", value: itemSelectedEdit.value, original: itemSelectedEdit.original, number: itemSelectedEdit.number });
      } else {
        let indexElem = elementsSeqEdit.filter((item) => item.includes("document")).length > 0 ? elementsSeqEdit.filter((item) => item.includes("document")).length - i : i;
        elementsSequence.push({ type: "document", value: onlyDocument[indexElem], original: onlyDocumentNameOriginal[indexElem].name, number: newArrDocument[i] });
      }
    }

    return elementsSequence;
  };

  const deleteElementsTypeOne = (id, type) => {
    if (type === "message") {
      setNumberMessages((old) => old - 1);
      setElementsSeq((old) => old.filter((item) => item !== `message${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `message${id}`));
      document.querySelector(`.stackMessage${id}`).remove();
    }
    if (type === "interval") {
      setNumberInterval((old) => old - 1);
      setElementsSeq((old) => old.filter((item) => item !== `interval${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `interval${id}`));
      document.querySelector(`.stackInterval${id}`).remove();
    }
    if (type === "img") {
      setNumberImg((old) => old - 1);
      setPreviewImg((old) => {
        setMedias((oldMedia) => {
          try {
            return oldMedia.filter((mediaItem) => mediaItem.name !== old.filter((item) => item.number === id)[0].name);
          } catch (e) {
            return oldMedia;
          }
        });
        return old.filter((item) => item.number !== id);
      });
      setElementsSeq((old) => old.filter((item) => item !== `img${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `img${id}`));
      document.querySelector(`.stackImg${id}`).remove();
    }
    if (type === "audio") {
      setNumberAudio((old) => old - 1);
      setPreviewAudios((old) => {
        setMedias((oldMedia) => {
          try {
            return oldMedia.filter((mediaItem) => mediaItem.name !== old.filter((item) => item.number === id)[0].name);
          } catch (e) {
            return oldMedia;
          }
        });
        return old.filter((item) => item.number !== id);
      });
      setElementsSeq((old) => old.filter((item) => item !== `audio${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `audio${id}`));
      document.querySelector(`.stackAudio${id}`).remove();
    }
    if (type === "video") {
      setNumberVideo((old) => old - 1);
      setPreviewVideos((old) => {
        setMedias((oldMedia) => {
          try {
            return oldMedia.filter((mediaItem) => mediaItem.name !== old.filter((item) => item.number === id)[0].name);
          } catch (e) {
            return oldMedia;
          }
        });
        return old.filter((item) => item.number !== id);
      });
      setElementsSeq((old) => old.filter((item) => item !== `video${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `video${id}`));
      document.querySelector(`.stackVideo${id}`).remove();
    }
    if (type === "document") {
      setNumberDocument((old) => old - 1);
      setPreviewDocuments((old) => {
        setMedias((oldMedia) => {
          try {
            return oldMedia.filter((mediaItem) => mediaItem.name !== old.filter((item) => item.number === id)[0].name);
          } catch (e) {
            return oldMedia;
          }
        });
        return old.filter((item) => item.number !== id);
      });
      setElementsSeq((old) => old.filter((item) => item !== `document${id}`));
      setElementsSeqEdit((old) => old.filter((item) => item !== `document${id}`));
      document.querySelector(`.stackDocument${id}`).remove();
    }
  };
  
  const handleChangeMediasImg = (e, number) => {
    if (!e.target.files) return;
    if (e.target.files[0].size > 2000000) {
      toast.error("Arquivo é muito grande! 2MB máximo");
      return;
    }
    const imgBlob = URL.createObjectURL(e.target.files[0]);
    setPreviewImg((old) => [...old, { number: number, url: imgBlob, name: e.target.files[0].name }]);
    setElementsSeqEdit(old => old.filter(item => item !== `img${number}`));
    const selectedMedias = Array.from(e.target.files);
    setMedias((old) => [...old, selectedMedias[0]]);
    document.querySelector(`.img${number}`).src = imgBlob;
  };

  const handleChangeAudios = (e, number) => {
    if (!e.target.files) return;
    if (e.target.files[0].size > 5000000) {
      toast.error("Arquivo é muito grande! 5MB máximo");
      return;
    }
    const audioBlob = URL.createObjectURL(e.target.files[0]);
    setPreviewAudios((old) => [...old, { number: number, url: audioBlob, name: e.target.files[0].name }]);
    setElementsSeqEdit(old => old.filter(item => item !== `audio${number}`));
    const selectedMedias = Array.from(e.target.files);
    setMedias((old) => [...old, selectedMedias[0]]);
    document.querySelector(`.audio${number}`).innerHTML = `<audio controls><source src="${audioBlob}" type="audio/mp3" />seu navegador não suporta HTML5</audio>`;
  };

  const handleChangeVideos = (e, number) => {
    if (!e.target.files) return;
    if (e.target.files[0].size > 20000000) {
      toast.error("Arquivo é muito grande! 20MB máximo");
      return;
    }
    const videoBlob = URL.createObjectURL(e.target.files[0]);
    setPreviewVideos((old) => [...old, { number: number, url: videoBlob, name: e.target.files[0].name }]);
    setElementsSeqEdit(old => old.filter(item => item !== `video${number}`));
    var divConteudo = document.createElement("div");
    const selectedMedias = Array.from(e.target.files);
    setMedias((old) => [...old, selectedMedias[0]]);
    divConteudo.innerHTML = `<video controls style="width: 200px;"><source src="${videoBlob}" type="video/mp4" />seu navegador não suporta HTML5</video>`;
    document.querySelector(`.video${number}`).appendChild(divConteudo);
  };

  const handleChangeDocuments = (e, number) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file.size > 15000000) {
      toast.error("Arquivo é muito grande! 15MB máximo");
      return;
    }
    setPreviewDocuments((old) => [...old, { number: number, name: file.name }]);
    setElementsSeqEdit(old => old.filter(item => item !== `document${number}`));
    const selectedMedias = Array.from(e.target.files);
    setMedias((old) => [...old, selectedMedias[0]]);
    document.querySelector(`.document${number}`).textContent = file.name;
  };
  
  const imgLayout = (number, valueDefault = "") => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackImg${number}`} key={`stackImg${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }}><Delete onClick={() => deleteElementsTypeOne(number, "img")} /></Stack>
      <Typography textAlign={"center"}>Imagem</Typography>
      <Stack direction={"row"} justifyContent={"center"}><img src={valueDefault.length > 0 ? process.env.REACT_APP_BACKEND_URL + "/public/" + valueDefault : ""} className={`img${number}`} style={{ width: "200px" }} /></Stack>
      <Button variant="contained" component="label" className={`btnImg${number}`}>Enviar imagem<input type="file" accept="image/png, image/jpg, image/jpeg" hidden onChange={(e) => handleChangeMediasImg(e, number)} /></Button>
    </Stack>
  );

  const audioLayout = (number, valueDefault = "", valueRecordDefault = "") => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackAudio${number}`} key={`stackAudio${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }} direction={"row"} gap={1}><Delete sx={{ cursor: "pointer" }} onClick={() => deleteElementsTypeOne(number, "audio")} /></Stack>
      <Typography textAlign={"center"}>Audio</Typography>
      <div className={`audio${number}`} style={{ display: "flex", justifyContent: "center" }}>{valueDefault.length > 0 && (<audio controls><source src={process.env.REACT_APP_BACKEND_URL + "/public/" + valueDefault} type="audio/mp3" />seu navegador não suporta HTML5</audio>)}</div>
      <Button variant="contained" component="label" className={`btnAudio${number}`}>Enviar audio<input type="file" accept="audio/ogg, audio/mp3, audio/opus" hidden onChange={(e) => handleChangeAudios(e, number)} /></Button>
      <Stack direction={"row"} justifyContent={"center"}><Checkbox className={`checkaudio${number}`} defaultChecked={valueRecordDefault === "ok" ? false : true} /><Stack justifyContent={"center"}><Typography>Enviar como audio gravado na hora</Typography></Stack></Stack>
    </Stack>
  );

  const videoLayout = (number, valueDefault = "") => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackVideo${number}`} key={`stackVideo${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }}><Delete onClick={() => deleteElementsTypeOne(number, "video")} /></Stack>
      <Typography textAlign={"center"}>Video</Typography>
      <div className={`video${number}`} style={{ display: "flex", justifyContent: "center" }}>{valueDefault.length > 0 && (<video controls style={{ width: "200px" }}><source src={process.env.REACT_APP_BACKEND_URL + "/public/" + valueDefault} type="video/mp4" />seu navegador não suporta HTML5</video>)}</div>
      <Button variant="contained" component="label" className={`btnVideo${number}`}>Enviar video<input type="file" accept="video/mp4" hidden onChange={(e) => handleChangeVideos(e, number)} /></Button>
    </Stack>
  );

  const documentLayout = (number, valueDefault = "") => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackDocument${number}`} key={`stackDocument${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }}><Delete onClick={() => deleteElementsTypeOne(number, "document")} /></Stack>
      <Typography textAlign={"center"}>Documento</Typography>
      <Stack direction={"row"} justifyContent={"center"} alignItems="center" gap={1} my={1}><Description /><Typography className={`document${number}`}>{valueDefault.length > 0 ? valueDefault : "Nenhum arquivo selecionado"}</Typography></Stack>
      <Button variant="contained" component="label" className={`btnDocument${number}`}>Enviar Documento<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" hidden onChange={(e) => handleChangeDocuments(e, number)} /></Button>
    </Stack>
  );

  const messageLayout = (number, valueDefault = "") => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackMessage${number}`} key={`stackMessage${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }}><Delete onClick={() => deleteElementsTypeOne(number, "message")} /></Stack>
      <Typography textAlign={"center"}>Texto</Typography>
      <TextField label={"Mensagem"} defaultValue={valueDefault} multiline rows={7} className={`message${number}`} name="text" variant="outlined" margin="dense" style={{ width: "100%" }} />
    </Stack>
  );

  const intervalLayout = (number, valueDefault = 0) => (
    <Stack sx={{ border: "1px solid #0000FF", borderRadius: "7px", padding: "6px", position: "relative" }} className={`stackInterval${number}`} key={`stackInterval${number}`}>
      <Stack sx={{ position: "absolute", right: 6 }}><Delete onClick={() => deleteElementsTypeOne(number, "interval")} /></Stack>
      <Typography textAlign={"center"}>Intervalo</Typography>
      <TextField label={"Tempo em segundos"} className={`interval${number}`} defaultValue={valueDefault} type="number" InputProps={{ inputProps: { min: 0, max: 120 } }} variant="outlined" margin="dense" style={{ width: "100%" }} />
    </Stack>
  );

  useEffect(() => {
    const localVariables = localStorage.getItem("variables");
    if (localVariables) {
      setVariables(JSON.parse(localVariables));
    }

    if (open === "edit") {
      setLabels({ title: "Editar conteúdo", btn: "Salvar" });
      setElementsSeq(data.data.seq);
      setElementsSeqEdit(data.data.seq);
      setElementsEdit(data.data.elements);
      if (data) {
        const elementsEditLoc = data.data.elements;
        const sequence = data.data.seq;
        sequence.map((item) => {
          const itemNode = elementsEditLoc.filter((inode) => inode.number === item)[0];
          if (itemNode.type === "message") {
            const numberLoc = parseInt(item.replace("message", ""));
            setElements((elm) => [...elm, messageLayout(numberLoc, itemNode.value)]);
            setNumberMessages((old) => {
              const arsOnly = sequence.filter((item) => item.includes("message"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("message", "")));
              setNumberMessagesLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
          if (itemNode.type === "interval") {
            const numberLoc = parseInt(item.replace("interval", ""));
            setElements((elm) => [...elm, intervalLayout(numberLoc, itemNode.value)]);
            setNumberInterval((old) => {
              const arsOnly = sequence.filter((item) => item.includes("interval"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("interval", "")));
              setNumberIntervalLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
          if (itemNode.type === "audio") {
            const numberLoc = parseInt(item.replace("audio", ""));
            setElements((elm) => [...elm, audioLayout(numberLoc, itemNode.value, itemNode.record ? "" : "ok")]);
            setNumberAudio((old) => {
              const arsOnly = sequence.filter((item) => item.includes("audio"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("audio", "")));
              setNumberAudioLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
          if (itemNode.type === "img") {
            const numberLoc = parseInt(item.replace("img", ""));
            setElements((elm) => [...elm, imgLayout(numberLoc, itemNode.value)]);
            setNumberImg((old) => {
              const arsOnly = sequence.filter((item) => item.includes("img"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("img", "")));
              setNumberImgLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
          if (itemNode.type === "video") {
            const numberLoc = parseInt(item.replace("video", ""));
            setElements((elm) => [...elm, videoLayout(numberLoc, itemNode.value)]);
            setNumberVideo((old) => {
              const arsOnly = sequence.filter((item) => item.includes("video"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("video", "")));
              setNumberVideoLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
          if (itemNode.type === "document") {
            const numberLoc = parseInt(item.replace("document", ""));
            setElements((elm) => [...elm, documentLayout(numberLoc, itemNode.original)]);
            setNumberDocument((old) => {
              const arsOnly = sequence.filter((item) => item.includes("document"));
              const arrNumberMax = arsOnly.map((item) => parseInt(item.replace("document", "")));
              setNumberDocumentLast(Math.max.apply(null, arrNumberMax) + 1);
              return old + 1;
            });
          }
        });
      }
      setActiveModal(true);
    }
    if (open === "create") {
      setLabels({ title: "Adicionar menu ao fluxo", btn: "Adicionar" });
      setActiveModal(true);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleClose = async () => {
    close(null);
    setActiveModal(false);
    setTimeout(() => {
      setMedias([]);
      setPreviewImg([]);
      setPreviewAudios([]);
      setPreviewVideos([]);
      setElements([]);
      setElementsSeq([]);
      setElementsEdit([]);
      setElementsSeqEdit([]);
      setNumberMessages(0);
      setNumberMessagesLast(0);
      setNumberInterval(0);
      setNumberIntervalLast(0);
      setNumberAudio(0);
      setNumberAudioLast(0);
      setNumberVideo(0);
      setNumberVideoLast(0);
      setNumberImg(0);
      setNumberImgLast(0);
      setNumberDocument(0);
      setNumberDocumentLast(0);
      setPreviewDocuments([]);
    }, 500);
  };
  
  const verifyButtonsUpload = () => {
    const newArrImg = elementsSeq.filter(item => item.includes("img"));
    const newArrAudio = elementsSeq.filter(item => item.includes("audio"));
    const newArrVideo = elementsSeq.filter(item => item.includes("video"));
    const newArrDocument = elementsSeq.filter(item => item.includes("document"));

    for (let i = 0; i < numberImg; i++) {
      const id = newArrImg[i].replace('img', '');
      const imgTag = document.querySelector(`.img${id}`);
      if (imgTag && !imgTag.src.includes('blob') && !imgTag.src.includes('/public/')) {
        return true;
      }
    }
    for (let i = 0; i < numberAudio; i++) {
      const id = newArrAudio[i].replace('audio', '');
      const audioDiv = document.querySelector(`.audio${id}`);
      if (audioDiv && audioDiv.innerHTML.trim() === "") {
        return true;
      }
    }
    for (let i = 0; i < numberVideo; i++) {
      const id = newArrVideo[i].replace('video', '');
      const videoDiv = document.querySelector(`.video${id}`);
      if (videoDiv && videoDiv.innerHTML.trim() === "") {
        return true;
      }
    }
    for (let i = 0; i < numberDocument; i++) {
        const id = newArrDocument[i].replace('document', '');
        const docText = document.querySelector(`.document${id}`).textContent;
        if (docText === "Nenhum arquivo selecionado") {
            return true;
        }
    }
    return false;
  };
  
  const handleSaveNode = async () => {
    if (open === "edit") {
      setLoading(true);
      const formData = new FormData();
      medias.forEach(async (media, idx) => {
        const file = media;
        if (!file) return;
        if (media?.type.split("/")[0] == "image") {
          new Compressor(file, {
            quality: 0.7,
            async success(media) {
              formData.append("medias", media);
              formData.append("body", media.name);
            },
            error(err) {
              alert("erro");
              console.log(err.message);
            },
          });
        } else {
          formData.append("medias", media);
          formData.append("body", media.name);
        }
      });
      setTimeout(async () => {
        if ((numberAudio === 0 && numberVideo === 0 && numberImg === 0 && numberDocument === 0) || medias.length === 0) {
          try {
            const mountData = { seq: elementsSeq, elements: handleElements(null) };
            onUpdate({ ...data, data: mountData });
            toast.success("Conteúdo adicionada com sucesso!");
            handleClose();
            setLoading(false);
            return;
          } catch (e) {
            console.log(e);
            setLoading(false);
          }
          return;
        }
        const verify = verifyButtonsUpload();
        if (verify) {
          setLoading(false);
          return toast.error("Delete os cards vazios ou envie os arquivos pendentes.");
        }
        await api.post("/flowbuilder/content", formData)
          .then(async (res) => {
            const mountData = { seq: elementsSeq, elements: handleElements(res.data) };
            onUpdate({ ...data, data: mountData });
            toast.success("Conteúdo adicionada com sucesso!");
            await handleClose();
            setLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      }, 1500);
    } else if (open === "create") {
      setLoading(true);
      const formData = new FormData();
      medias.forEach(async (media, idx) => {
        const file = media;
        if (!file) return;
        if (media?.type.split("/")[0] == "image") {
          new Compressor(file, {
            quality: 0.7,
            async success(media) {
              formData.append("medias", media);
              formData.append("body", media.name);
            },
            error(err) {
              alert("erro");
              console.log(err.message);
            },
          });
        } else {
          formData.append("medias", media);
          formData.append("body", media.name);
        }
      });
      setTimeout(async () => {
        if (numberAudio === 0 && numberVideo === 0 && numberImg === 0 && numberDocument === 0) {
          try {
            const mountData = { seq: elementsSeq, elements: handleElements(null) };
            onSave({ ...mountData });
            toast.success("Conteúdo adicionada com sucesso!");
            handleClose();
            setLoading(false);
            return;
          } catch (e) {
            setLoading(false);
          }
        }
        const verify = verifyButtonsUpload();
        if (verify) {
          setLoading(false);
          return toast.error("Delete os cards vazios ou envie os arquivos pendentes.");
        }
        await api.post("/flowbuilder/content", formData)
          .then((res) => {
            const mountData = { seq: elementsSeq, elements: handleElements(res.data) };
            onSave({ ...mountData });
            toast.success("Conteúdo adicionada com sucesso!");
            handleClose();
            setLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      }, 1500);
    }
  };

  const scrollToBottom = (className) => {
    const element = document.querySelector(className);
    element.scrollTop = element.scrollHeight;
  };

  const variableFormatter = (item) => {
    return "{{" + item + "}}";
  };

  return (
    <div>
      <Dialog open={activeModal} fullWidth="md" scroll="paper">
        {!loading && (<DialogTitle id="form-dialog-title">Adicionar conteúdo ao fluxo</DialogTitle>)}
        <Stack>
          <Stack
            className="body-card"
            style={{
              gap: "8px",
              padding: "16px",
              overflow: "auto",
              height: "70vh",
              scrollBehavior: "smooth",
              display: loading && "none",
            }}
          >
            {elements.map((item) => (<>{item}</>))}
            <Stack direction={"row"} gap={1}>
              <Button variant="contained" color="primary" onClick={() => {
                setElements((old) => [...old, messageLayout(numberMessagesLast)]);
                setNumberMessages((old) => { setElementsSeq((oldEleme) => [...oldEleme, `message${numberMessagesLast}`]); return old + 1; });
                setNumberMessagesLast((old) => old + 1);
                setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><Message sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Texto</Button>
              <Button variant="contained" color="primary" onClick={() => {
                setElements((old) => [...old, intervalLayout(numberIntervalLast)]);
                setNumberInterval((old) => { setElementsSeq((oldEleme) => [...oldEleme, `interval${numberIntervalLast}`]); return old + 1; });
                setNumberIntervalLast((old) => old + 1);
                setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><AccessTime sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Intervalo</Button>
              <Button variant="contained" color="primary" onClick={() => {
                setElements((old) => [...old, imgLayout(numberImgLast)]);
                setNumberImg((old) => { setElementsSeq((oldEleme) => [...oldEleme, `img${numberImgLast}`]); return old + 1; });
                setNumberImgLast((old) => old + 1);
                setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><Image sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Imagem</Button>
              <Button variant="contained" color="primary" onClick={() => {
                setElements((old) => [...old, audioLayout(numberAudioLast)]);
                setNumberAudio((old) => { setElementsSeq((oldEleme) => [...oldEleme, `audio${numberAudioLast}`]); return old + 1; });
                setNumberAudioLast((old) => old + 1);
                setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><MicNone sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Audio</Button>
              <Button variant="contained" color="primary" onClick={() => {
                setElements((old) => [...old, videoLayout(numberVideoLast)]);
                setNumberVideo((old) => { setElementsSeq((oldEleme) => [...oldEleme, `video${numberVideoLast}`]); return old + 1; });
                setNumberVideoLast((old) => old + 1);
                setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><Videocam sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Video</Button>
              <Button variant="contained" color="primary" onClick={() => {
                  setElements((old) => [...old, documentLayout(numberDocumentLast)]);
                  setNumberDocument((old) => {
                    setElementsSeq((oldEleme) => [...oldEleme, `document${numberDocumentLast}`]);
                    return old + 1;
                  });
                  setNumberDocumentLast((old) => old + 1);
                  setTimeout(() => { scrollToBottom(".body-card"); }, 100);
              }}><Description sx={{ width: "16px", height: "16px", marginRight: "4px" }} />Documento</Button>
            </Stack>
            <Divider />
            <Box style={{ width: "100%", textAlign: "center" }}>
              <Typography>Variáveis</Typography>
              {variables && (<>{variables.map((item) => (<><Typography>{variableFormatter(item)}</Typography></>))}</>)}
            </Box>
          </Stack>

          <DialogActions>
            <Button onClick={handleClose} color="secondary" variant="outlined" style={{ display: loading && "none" }}>{i18n.t("contactModal.buttons.cancel")}</Button>
            <Button type="submit" color="primary" variant="contained" onClick={() => handleSaveNode()} style={{ display: loading && "none" }}>{`${labels.btn}`}</Button>
          </DialogActions>
        </Stack>
        {loading && (
          <Stack style={{ gap: "8px", padding: "16px", height: "70vh", alignSelf: "center", justifyContent: "center" }}>
            <Stack>
              <Typography>Subindo os arquivos e criando o conteúdo...</Typography>
              <Stack style={{ alignSelf: "center", marginTop: "12px" }}><CircularProgress /></Stack>
            </Stack>
          </Stack>
        )}
      </Dialog>
    </div>
  );
};

export default FlowBuilderSingleBlockModal;
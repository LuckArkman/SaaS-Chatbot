import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  SignalDataSet
} from "baileys";
import { BufferJSON, initAuthCreds, proto } from "baileys";
import Whatsapp from "../models/Whatsapp";

// Mapeia cada tipo de chave Signal para o "bucket" que você persiste no DB.
// ATENÇÃO: use os mesmos nomes em get/set (consistência)!
const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  "pre-key": "preKeys",
  session: "sessions",
  "sender-key": "senderKeys",
  "sender-key-memory": "senderKeyMemory",
  "app-state-sync-key": "appStateSyncKeys",
  "app-state-sync-version": "appStateVersions",
  "lid-mapping": "lidMappings",   // use "lidMapping" se já persistia assim
  "device-list": "deviceList"     // exigido no v7
};

const authState = async (
  whatsapp: Whatsapp
): Promise<{ state: AuthenticationState; saveState: () => Promise<void> }> => {
  let creds: AuthenticationCreds;
  // buckets com sub-objetos indexados por id
  let keys: Record<string, Record<string, unknown>> = {};

  const saveState = async (): Promise<void> => {
    try {
      await whatsapp.update({
        session: JSON.stringify({ creds, keys }, BufferJSON.replacer, 0)
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (whatsapp.session && whatsapp.session !== null) {
    const result = JSON.parse(whatsapp.session, BufferJSON.reviver);
    creds = result.creds;
    keys = result.keys || {};
  } else {
    creds = initAuthCreds();
    keys = {};
  }

  return {
    state: {
      creds,
      keys: {
        // get precisa devolver um dicionário { id: valorTipado }
        get: (type, ids) => {
          const bucket = KEY_MAP[type];
          return ids.reduce((dict: any, id) => {
            let value = (keys[bucket] as any)?.[id];
            if (value) {
              if (type === "app-state-sync-key") {
                // garantir instanciação correta (v7 retirou fromObject em alguns builds)
                const AppState = (proto as any).Message?.AppStateSyncKeyData;
                if (AppState?.fromObject) value = AppState.fromObject(value);
                else if (AppState?.create) value = AppState.create(value);
              }
              dict[id] = value;
            }
            return dict;
          }, {} as Record<string, unknown>);
        },
        // set agora exige SignalDataSet
        set: async (data: SignalDataSet) => {
          // data é do tipo:
          // {
          //   "pre-key"?: { [id: string]: KeyPair },
          //   session?: { [id: string]: SignalProtocolAddress[] | ... },
          //   ...
          // }
          for (const k in data) {
            const bucket = KEY_MAP[k as keyof SignalDataTypeMap];
            keys[bucket] = keys[bucket] || {};
            // mescla o mapa recebido no bucket correspondente
            Object.assign(keys[bucket], (data as any)[k]);
          }
          await saveState();
        }
      }
    },
    saveState
  };
};

export default authState;

"use client";

import {
  CreateProjectKeyResponse,
  LiveClient,
  LiveSchema,
  LiveTranscriptionEvents,
  SpeakSchema,
} from "@deepgram/sdk";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useToast } from "./Toast";

type DeepgramContext = {
  ttsOptions: SpeakSchema | undefined;
  setTtsOptions: Dispatch<SetStateAction<SpeakSchema | undefined>>;
  sttOptions: LiveSchema | undefined;
  setSttOptions: Dispatch<SetStateAction<LiveSchema | undefined>>;
  connection: LiveClient | undefined;
  connectionReady: boolean;
};

interface DeepgramContextInterface {
  children: React.ReactNode;
}

const DeepgramContext = createContext({} as DeepgramContext);

/**
 * TTS Voice Options
 */
const voices: {
  [key: string]: {
    name: string;
    avatar: string;
    language: string;
    accent: string;
  };
} = {
  "aura-asteria-en": {
    name: "Steve Jobs",
    avatar: "https://cdn.profoto.com/cdn/053149e/contentassets/d39349344d004f9b8963df1551f24bf4/profoto-albert-watson-steve-jobs-pinned-image-original.jpg?width=1280&quality=75&format=jpg",
    language: "English",
    accent: "US",
  }
};

const voiceMap = (model: string) => {
  return voices[model];
};

const getApiKey = async (): Promise<string> => {
  const result: CreateProjectKeyResponse = await (
    await fetch("/api/authenticate", { cache: "no-store" })
  ).json();

  return result.key;
};

const DeepgramContextProvider = ({ children }: DeepgramContextInterface) => {
  const { toast } = useToast();
  const [ttsOptions, setTtsOptions] = useState<SpeakSchema>();
  const [sttOptions, setSttOptions] = useState<LiveSchema>();
  const [connection, setConnection] = useState<LiveClient>();
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectionReady, setConnectionReady] = useState<boolean>(false);

  const connect = useCallback(async () => {
    if (!connection && !connecting) {
      setConnecting(true);


      try{
        const connection = new LiveClient(
          await getApiKey(),
          {},
          {
            model: "nova-2",
            interim_results: true,
            smart_format: true,
            endpointing: 550,
            utterance_end_ms: 900,
            filler_words: true,
          }
        );
        console.log("yayyy", connection);
  
        setConnection(connection);
        setConnecting(false);
      }
      catch(error){
        console.error("Error connecting to Deepgram:", error);
        setConnecting(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, connection]);

  useEffect(() => {
    // it must be the first open of the page, let's set up the defaults

    /**
     * Default TTS Voice when the app loads.
     */
    if (ttsOptions === undefined) {
      setTtsOptions({
        model: "aura-asteria-en",
      });
    }

    if (!sttOptions === undefined) {
      setSttOptions({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        endpointing: 350,
        utterance_end_ms: 1000,
        filler_words: true,
      });
    }

    if (connection === undefined) {
      connect();
    }
  }, [connect, connection, sttOptions, ttsOptions]);

  useEffect(() => {
    if (connection && connection?.getReadyState() !== undefined) {
      console.log("connection", connection, connection?.getReadyState());

      connection.addListener(LiveTranscriptionEvents.Open, () => {
        console.log("listener added");
        setConnectionReady(true);
      });

      connection.addListener(LiveTranscriptionEvents.Close, () => {
        toast("The connection to Deepgram closed, we'll attempt to reconnect.");
        console.log("listener closed");
        setConnectionReady(false);
        connection.removeAllListeners();
        setConnection(undefined);
      });

      connection.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.log("listener error", error);
        toast(
          "An unknown error occured. We'll attempt to reconnect to Deepgram."
        );
        setConnectionReady(false);
        connection.removeAllListeners();
        setConnection(undefined);
      });
    }

    return () => {
      setConnectionReady(false);
      connection?.removeAllListeners();
    };
  }, [connection, toast]);

  return (
    <DeepgramContext.Provider
      value={{
        ttsOptions,
        setTtsOptions,
        sttOptions,
        setSttOptions,
        connection,
        connectionReady,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram() {
  return useContext(DeepgramContext);
}

export { DeepgramContextProvider, useDeepgram, voiceMap, voices };

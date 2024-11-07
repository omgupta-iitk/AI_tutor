import React from "react";
import "globalthis/auto";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";

import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WavRecorder, WavStreamPlayer } from "./lib/wavtools/index.js";
import { instructions } from "./utils/conversation_config.js";
import { WavRenderer } from "./utils/wav_renderer.ts";

import { X, Edit, Zap } from "react-feather";
import { Button } from "./components/button/Button.tsx";
import { Toggle } from "./components/toggle/Toggle.tsx";
import { useLocation } from "react-router-dom";
// import { useLocation } from 'react-router-dom';
import useStack from './useStack.js'

import "./App.css";
const LOCAL_RELAY_SERVER_URL: string = "http://localhost:8081";
// process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

/**
 * Type for all event logs
 */

interface LocationState {
  slideCodes?: string[];
  summaries?: string[];
}

interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

const SlideRenderer = ({ htmlContent }) => {
  return (
    <iframe
      title="Slide Content"
      style={{ width: "100%", height: "80vh", border: "1px solid #ddd" }}
      srcDoc={htmlContent}
    />
  );
};

export function ConsolePage(data: any) {

  const { push, pop, peek, getStack, clearStack } = useStack();

  const location = useLocation();
  const state = location.state as LocationState;
  const slideCodes = state?.slideCodes || [];
  const summaries = state?.slideSummary || [];
  // const summaries = [
  //   "This slide tells about the basics of the computer vision and its applications in the real world.",
  //   "This slide tells about natural language processing in real world.",
  // ];
  // console.log(slideCodes, summaries);
  const [slideState, setSlideState] = useState(0);
  const [question, setQuestion] = useState(false);
  const [prevConvo, setPrevConvo] = useState("");
  const [prevSlide, setPrevSlide] = useState(0);
  const [slideChange, setSlideChange] = useState(0);
  const slideChangeRef = useRef(slideChange);
  const questionRef = useRef(question);
  const prevConvoRef = useRef(prevConvo);
  const prevSlideRef = useRef(prevSlide);
  const slideStateRef = useRef(slideState);

  // Update the ref whenever slideChange changes
  useEffect(() => {
    slideChangeRef.current = slideChange;
  }, [slideChange]);
  useEffect(() => {
    questionRef.current = question;
  }, [question]);
  useEffect(() => {
    prevConvoRef.current = prevConvo;
  }, [prevConvo]);
  useEffect(() => {
    prevSlideRef.current = prevSlide;
  }, [prevSlide]);
  useEffect(() => {
    slideStateRef.current = slideState;
  }, [slideState]);

  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ""
    : localStorage.getItem("tmp::voice_api_key") ||
      prompt("OpenAI API Key") ||
      "";
  if (apiKey !== "") {
    localStorage.setItem("tmp::voice_api_key", apiKey);
  }

  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        // text: `Hello!`,
        text: `Icdnstruction: First Greet the student then explain the concept, also his name and current date will be given, this is the content of the slide ${
          slideState + 1
        } the student is seeing:
{${summaries[slideState]}}.

Guidelines:
1. If the student asks a question and if the question is related to other slide then use the question_asked tool and save the current state into it.
2. Also, Answer the user question by giving the reference of your explaination on that slide.
3. The next slide will be called autommaticaly after the explanation of a slide is given.
`,
      },
    ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, [summaries, slideState]);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll("[data-conversation-content]")
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext("2d");
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies("voice")
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              "#0099ff",
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext("2d");
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies("voice")
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              "#009900",
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: instructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });

    client.addTool(
      {
        name: "question_asked",
        description: "Moves to the next slide and saves the current state. Provides further instruciton.",
        parameters: {
          type: "object",
          properties: {
            slide: {
              type: "number",
              description: "slide number to move to",
            },
            current_slide: {
              type: "number",
              description: "current slide number",
            },
            current_convo: {
              type: "string",
              description: "current conversation in a single line",
            },
          },
          required: ["slide", "current_slide", "current_convo"],
        },
      },
      async ({ slide, current_slide, current_convo }: { [key: string]: any }) => {
        console.log("TOOL: slide changed to ", slide);
        await setSlideState(slide - 1);
        await setPrevSlide(current_slide);
        await setPrevConvo(current_convo);
        await setQuestion(true);
        // return { state: `slide change success, now going back to ${current_slide}` , instructions:`Say: Now, Coming back, where we left off.`};
        return;
      }
    );

    // client.addTool(
    //   {
    //     name: "asked_question",
    //     description:
    //       "Moves to the slide from which the question is related and then comesback to the current state.",
    //     parameters: {
    //       type: "object",
    //       properties: {
    //         slide: {
    //           type: "number",
    //           description: "slide number for the question",
    //         },
    //         current_slide: {
    //           type: "number",
    //           description: "slide number for the current slide",
    //         },
    //         current_convo: {
    //           type: "string",
    //           description: "current conversation",
    //         },
    //       },
    //       required: ["slide", "current_slide", "current_convo"],
    //     },
    //   },
    //   async ({
    //     slide,
    //     current_slide,
    //     current_convo,
    //   }: {
    //     [key: string]: any;
    //   }) => {
    //     if (slide === current_slide) {
    //       return { tool_use: "done" };
    //     }
    //     console.log(
    //       "TOOL: Used with parameter as slide:",
    //       slide,
    //       "current_slide:",
    //       current_slide,
    //       "current_convo:",
    //       current_convo
    //     );
    //     // setSlideChange(slide - 1);
    //     await setSlideState(slide - 1);
    //     await setPrevSlide(current_slide);
    //     await setPrevConvo(current_convo);
    //     await setQuestion(true);
    //     console.log("Updated slideChange:", slideChangeRef.current);
    //     return { tool_use: "done" };
    //   }
    // );

    // handle realtime events from client + server for event logging
    client.on("realtime.event", (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on("error", (event: any) => console.error(event));
    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === "completed" && item.formatted.audio?.length) {
        if (item.role === "assistant") {
          // if(slideChange !== -1) {
          //   wavStreamPlayer.onAudioEnd = () => {
          //   setSlideState(slideChange);
          //   setSlideChange(-1);
          //   }
          // }
          wavStreamPlayer.onAudioEnd = () => {
            if (questionRef.current === false) {
              console.log(
                "audio ended, slideChange is",
                slideChangeRef.current
              );
              if (
                slideChangeRef.current < summaries.length
              ) {
                setSlideState(slideChangeRef.current);
                setSlideChange(-1);
                client.sendUserMessageContent([
                  {
                    type: `input_text`,
                    // text: `Hello!`,
                    text: `Now, moving to the next slide, this is the content of the slide ${
                      slideChangeRef.current + 1
                    } the student is seeing:
  {${summaries[slideChangeRef.current]}}.`,
                  },
                ]);
                setSlideChange(slideChangeRef.current + 1);
              }
            } else {
              setQuestion(false);
              setSlideState(prevSlideRef.current);
              setPrevSlide(0);
              setPrevConvo("");
              client.sendUserMessageContent([
                {
                  type: `input_text`,
                  // text: `Hello!`,
                  text: `Now, Coming back, where we left off, this is the content of the slide ${
                    slideChangeRef.current + 1} and the coversation where we left off is as follows:
                    ${prevConvoRef.current}`,
                },
              ]);
              // setSlideChange();
            }
          };
        }
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, []);

  /**
   * Render the application
   */
  return (
    <div className="app-container">
      <div className="content-area">
        <div className="workspace-renderer">
          <div key={slideStateRef.current} className="markdown-slide">
            <h3>Slide {slideStateRef.current + 1}</h3>
            <div dangerouslySetInnerHTML={{ __html: slideCodes[slideStateRef.current] }} />
          </div>
        </div>
      </div>
      <div className="content-block conversation">
        <div className="content-block-title">conversation</div>
        <div className="content-block-body" data-conversation-content>
          {!items.length && `awaiting connection...`}
          {items.map((conversationItem, i) => {
            return (
              <div className="conversation-item" key={conversationItem.id}>
                <div className={`speaker ${conversationItem.role || ""}`}>
                  <div>
                    {(
                      conversationItem.role || conversationItem.type
                    ).replaceAll("_", " ")}
                  </div>
                  <div
                    className="close"
                    // onClick={() => deleteConversationItem(conversationItem.id)}
                  >
                    <X />
                  </div>
                </div>
                <div className={`speaker-content`}>
                  {/* tool response */}
                  {conversationItem.type === "function_call_output" && (
                    <div>{conversationItem.formatted.output}</div>
                  )}
                  {/* tool call */}
                  {!!conversationItem.formatted.tool && (
                    <div>
                      {conversationItem.formatted.tool.name}(
                      {conversationItem.formatted.tool.arguments})
                    </div>
                  )}
                  {!conversationItem.formatted.tool &&
                    conversationItem.role === "user" && (
                      <div>
                        {conversationItem.formatted.transcript ||
                          (conversationItem.formatted.audio?.length
                            ? "(awaiting transcript)"
                            : conversationItem.formatted.text || "(item sent)")}
                      </div>
                    )}
                  {!conversationItem.formatted.tool &&
                    conversationItem.role === "assistant" && (
                      <div>
                        {conversationItem.formatted.transcript ||
                          conversationItem.formatted.text ||
                          "(truncated)"}
                      </div>
                    )}
                  {conversationItem.formatted.file && (
                    <audio src={conversationItem.formatted.file.url} controls />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="content-actions">
        {isConnected && canPushToTalk && (
          <Button
            label={isRecording ? "release to send" : "push to talk"}
            buttonStyle={isRecording ? "alert" : "regular"}
            disabled={!isConnected || !canPushToTalk}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
          />
        )}
        <div className="spacer" />
        <Button
          label={isConnected ? "disconnect" : "start"}
          iconPosition={isConnected ? "end" : "start"}
          icon={isConnected ? X : Zap}
          buttonStyle={isConnected ? "regular" : "action"}
          onClick={isConnected ? disconnectConversation : connectConversation}
        />
      </div>
    </div>
  );
}

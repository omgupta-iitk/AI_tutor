import React from "react";
import "globalthis/auto";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";

import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WavRecorder, WavStreamPlayer } from "./lib/wavtools/index.js";
// import { instructions } from "./utils/conversation_config.js";
import { WavRenderer } from "./utils/wav_renderer.ts";

import { X, Edit, Zap } from "react-feather";
import { Button } from "./components/button/Button.tsx";
import { Toggle } from "./components/toggle/Toggle.tsx";
import { useLocation } from "react-router-dom";
// import { useLocation } from 'react-router-dom';

import "./App.css";
const LOCAL_RELAY_SERVER_URL: string = "http://localhost:8081";
// process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

/**
 * Type for all event logs
 */

interface LocationState {
  slideCodes?: string[];
  summaries?: string[];
  tutorReq?: any[];
  tutorType?: string;
}

interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

// const SlideRenderer = ({ htmlContent }) => {
//   return (
//     <iframe
//       title="Slide Content"
//       style={{ width: "100%", height: "80vh", border: "1px solid #ddd" }}
//       srcDoc={htmlContent}
//     />
//   );
// };

export function ConsolePage(data: any) {
  const location = useLocation();
  const state = location.state as LocationState;
  const slideCodes = state?.slideCodes || [];
  const summaries = state?.slideSummary || [];
  const tutorReq = state?.tutorReq || [];
  const tutorType = state?.tutorType || "tutor";
  const instructions = `System settings:
Tool use: enabled.

You are a tutor of personality ${tutorType} in a classroom setting. You are teaching a student about a topic by giving lecture based on the slides. The student is learning about a new concept. You are to explain the concept to the student.

Instructions:
- Do not ask questions to the user.
- Follow the tutor requirements given with slide content.
- Use slide content for explaining the concept to the student.
- If user ask questions then use move_slide tool at the very start of explaing the answer.

Personality:
-  Be ${tutorType}.
`;

  const [slideState, setSlideState] = useState(0);
  const [question, setQuestion] = useState(false);
  const [prevConvo, setPrevConvo] = useState("");
  const [prevSlide, setPrevSlide] = useState(0);
  const questionRef = useRef(question);
  const prevConvoRef = useRef(prevConvo);
  const prevSlideRef = useRef(prevSlide);
  const slideStateRef = useRef(slideState);

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
        text: `Instructions: Tool use: disabled.
Following the given requirements, Explain the concept based on the content of slide to the student.
This is the content of the slide ${slideState + 1}:
{${summaries[slideState]}}.

And the Tutor requirements are:
{${tutorReq[slideState].req}}.`,
      },
    ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, [summaries, slideState]);

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

  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  const handleSlide = async () => {
    setSlideState(prevSlideRef.current);
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await client.sendUserMessageContent([
      {
        type: `input_text`,
        // text: `Hello!`,
        text: 
`Instructions: Tool use: disabled.
Coming back to the lecture you are on slide ${prevSlideRef.current + 1} and the saved conversation is {${prevConvoRef.current}}.
The content of the slide was: {${summaries[prevSlideRef.current]}}.
So Now continue the lecture from where you left off using the saved conversation.
`,
      },
    ]);
    setQuestion(false);
  };

  const handleQuestion = async () => {
    setQuestion(true);
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    client.sendUserMessageContent([
      {
        type: `input_text`,
        // text: `Hello!`,
        text: 
`Instructions: Tool use: enabled.
Use the save_state tool and also the user is goint to ask the questions, so use of move_slide tool is must when the question is asked.
Say: Wait`,
      },
    ]);
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
    client.updateSession({ instructions: instructions });
    client.updateSession({
      input_audio_transcription: { model: "whisper-1" },
    });
    client.updateSession({ instructions: instructions });
    client.updateSession({
      input_audio_transcription: { model: "whisper-1" },
    });
    client.addTool(
      {
        name: "move_slide",
        description:
          "Moves to the slide given a number. Provides further instruction.",
        parameters: {
          type: "object",
          properties: {
            slide: {
              type: "number",
              description: "slide number to move to",
            },
          },
          required: ["slide"],
        },
      },
      async ({ slide }: { [key: string]: any }) => {
        console.log("TOOL: slide changed to ", slide);
        await setSlideState(slide - 1);
        return;
      }
    );

    client.addTool(
      {
        name: "save_state",
        description:
          "Saves the current state of the conversation for later use.",
        parameters: {
          type: "object",
          properties: {
            current_slide: {
              type: "number",
              description: "current slide number",
            },
            current_conversation: {
              type: "string",
              description: "current conversation in a single sentence",
            },
          },
          required: ["current_slide", "current_conversation"],
        },
      },
      async ({
        current_slide,
        current_conversation,
      }: {
        [key: string]: any;
      }) => {
        console.log("TOOL: state saved", current_slide, current_conversation);
        setPrevSlide(current_slide - 1);
        setPrevConvo(current_conversation);
        return;
      }
    );

    // handle realtime events from client + server for event logging
    client.on("realtime.event", (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
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
          wavStreamPlayer.onAudioEnd = () => {
            if (
              slideStateRef.current + 1 < summaries.length &&
              questionRef.current === false
            ) {
              console.log("audio ended, ", slideStateRef.current);
              setSlideState(slideStateRef.current + 1);
              if (slideStateRef.current + 1<tutorReq.length) {
                client.sendUserMessageContent([
                  {
                    type: `input_text`,
                    text: 
`Instructions: Tool use: disabled.
Now, moving to the next slide.
This is the content of the slide ${slideStateRef.current + 2} the student is seeing:
{${summaries[slideStateRef.current + 1]}}.
And the tutor requirements are below if given, if not then you can explain the concept in your own way.:
{${tutorReq[slideStateRef.current + 1].req}}.`,
                  },
                ]);
              } else {
                client.sendUserMessageContent([
                  {
                    type: `input_text`,
                    text: 
`Instructions: Tool use: disabled.
Now, moving to the next slide.
This is the content of the slide ${slideStateRef.current + 2} the student is seeing:
{${summaries[slideStateRef.current + 1]}}.
And the tutor requirements are not given for this slide so you can explain the concept in your own way.`,
                  },
                ]);
              }
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
            <div
              dangerouslySetInnerHTML={{
                __html: slideCodes[slideStateRef.current],
              }}
            />
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
                  <div className="close">
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
            disabled={(!isConnected || !canPushToTalk) && questionRef.current}
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
        <Button
          label={!questionRef.current ? "Ask Questions" : "Return to Slide"}
          buttonStyle={isConnected ? "regular" : "action"}
          icon={isConnected ? Edit : Zap}
          iconPosition={isConnected ? "end" : "start"}
          disabled={!isConnected}
          onClick={!questionRef.current ? handleQuestion : handleSlide}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { InlineThinking } from "@/components/chat/inline-thinking";
import { TerminalViewer } from "@/components/chat/terminal-viewer";
import { FloatingStats } from "@/components/chat/floating-stats";
import { ArtifactsPanel } from "@/components/chat/artifacts-panel";
import { useStore } from "@/lib/store";
import { getMessages, getConversations, streamChat } from "@/lib/api";
import type { ConversationWithDetails, MessageWithToolCalls, ToolCall } from "@/lib/types";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    messages, setMessages, appendMessage, updateLastAssistantMessage,
    appendToolCall, updateToolCall,
    setConversations,
    isStreaming, setIsStreaming, streamingAgentId, setStreamingAgentId,
    toolPanelOpen, setToolPanelOpen,
    thinkingContent, thinkingComplete, setThinkingContent,
    subagents, addSubagent, updateSubagent, clearSubagents,
    generationStatus, setGenerationStatus,
    autoApprove, setAutoApprove,
    setThinkingStartTime, thinkingStartTime,
  } = useStore();

  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageQueue, setMessageQueue] = useState<{ content: string; targetAgentId?: string }[]>([]);
  const [chatFont, setChatFont] = useState<string>(() => {
    try { return localStorage.getItem(`agenthub-chat-font-${id}`) || ""; } catch { return ""; }
  });
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef("");
  const streamMsgIdRef = useRef("");
  const processingQueue = useRef(false);

  useEffect(() => {
    loadChat();
    return () => { abortRef.current?.abort(); };
  }, [id]);

  useEffect(() => {
    // Auto-scroll to bottom
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  async function loadChat() {
    setLoading(true);
    try {
      const [msgs, convs] = await Promise.all([getMessages(id), getConversations()]);
      setMessages(msgs);
      setConversations(convs);
      const conv = convs.find((c) => c.id === id) ?? null;
      setConversation(conv);
    } catch {
      toast.error("Failed to load conversation");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  // Process queued messages after current stream finishes
  useEffect(() => {
    if (!isStreaming && messageQueue.length > 0 && !processingQueue.current) {
      processingQueue.current = true;
      const next = messageQueue[0];
      setMessageQueue((q) => q.slice(1));
      setTimeout(() => {
        processingQueue.current = false;
        sendMessage(next.content, next.targetAgentId);
      }, 300);
    }
  }, [isStreaming, messageQueue]);

  function handleSend(content: string, targetAgentId?: string, attachmentIds?: string[]) {
    // If already streaming, queue the message
    if (isStreaming) {
      setMessageQueue((q) => [...q, { content, targetAgentId }]);
      toast.success(`Message queued (${messageQueue.length + 1} in queue)`);
      return;
    }
    sendMessage(content, targetAgentId);
  }

  function sendMessage(content: string, targetAgentId?: string) {
    // Add user message locally
    const userMsg: MessageWithToolCalls = {
      id: uuid(),
      conversation_id: id,
      sender_agent_id: null,
      content,
      thinking_content: "",
      token_count: 0,
      parent_message_id: null,
      branch_point: null,
      is_pinned: false,
      is_summary: false,
      is_handoff: false,
      handoff_from_agent_id: null,
      handoff_to_agent_id: null,
      handoff_context: null,
      is_edited: false,
      created_at: new Date().toISOString(),
      tool_calls: [],
    };
    appendMessage(userMsg);

    // Start streaming
    setIsStreaming(true);
    setGenerationStatus("generating");
    streamContentRef.current = "";
    streamMsgIdRef.current = "";
    setThinkingContent("", false);
    setThinkingStartTime(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    streamChat(id, content, {
      onContent: (chunk) => {
        streamContentRef.current += chunk;

        if (!streamMsgIdRef.current) {
          // Haven't created the placeholder message yet — wait for agent_start
          // But if we get content first, create a placeholder
          const tempId = uuid();
          streamMsgIdRef.current = tempId;
          const placeholder: MessageWithToolCalls = {
            id: tempId,
            conversation_id: id,
            sender_agent_id: streamingAgentId ?? conversation?.agents[0]?.id ?? "",
            content: streamContentRef.current,
            thinking_content: "",
            token_count: 0,
            parent_message_id: null,
            branch_point: null,
            is_pinned: false,
            is_summary: false,
            is_handoff: false,
            handoff_from_agent_id: null,
            handoff_to_agent_id: null,
            handoff_context: null,
            is_edited: false,
            created_at: new Date().toISOString(),
            tool_calls: [],
            agent: conversation?.agents[0],
          };
          appendMessage(placeholder);
        } else {
          updateLastAssistantMessage(streamContentRef.current);
        }
      },

      onToolCall: (data) => {
        const msgId = streamMsgIdRef.current;
        if (!msgId) return;

        const toolCall: ToolCall = {
          id: data.tool_call_id || uuid(),
          message_id: msgId,
          agent_id: streamingAgentId ?? "",
          tool_name: data.tool_name,
          input: JSON.stringify(data.tool_input),
          output: "{}",
          status: "pending",
          timestamp: new Date().toISOString(),
        };
        appendToolCall(msgId, toolCall);
      },

      onToolResult: (data) => {
        const msgId = streamMsgIdRef.current;
        if (!msgId) return;
        updateToolCall(msgId, data.tool_call_id, {
          output: JSON.stringify(data.tool_output),
          status: "success",
        });
      },

      onError: (error) => {
        toast.error(error);
      },

      onDone: (data) => {
        setIsStreaming(false);
        setStreamingAgentId(null);
        setGenerationStatus(streamContentRef.current ? "done" : "no_response");
        // Reload to sync with DB
        getMessages(id).then(setMessages).catch(() => {});
        getConversations().then(setConversations).catch(() => {});
      },

      onAgentStart: (data) => {
        setStreamingAgentId(data.agent_id);
      },

      onThinking: (content) => {
        if (!thinkingStartTime) setThinkingStartTime(Date.now());
        setThinkingContent(content);
      },

      onThinkingEnd: () => {
        setThinkingContent("", true);
      },

      onSubagentSpawned: (data) => {
        addSubagent({
          id: data.subagent_id,
          parent_agent_id: data.agent_id ?? "",
          goal: data.goal,
          status: "running",
          spawned_at: new Date().toISOString(),
        });
      },

      onSubagentProgress: () => {},

      onSubagentCompleted: (data) => {
        updateSubagent(data.subagent_id, { status: "completed", result: data.result });
      },

      onSubagentFailed: (data) => {
        updateSubagent(data.subagent_id, { status: "failed", error: data.error });
      },
    }, {
      target_agent_id: targetAgentId,
      signal: abortController.signal,
    });
  }

  function handleCancel() {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingAgentId(null);
  }

  function handleRegenerate(messageId: string, agentId?: string) {
    // Find the user message before this agent message
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;
    let userMsg: MessageWithToolCalls | undefined;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].sender_agent_id === null) {
        userMsg = messages[i];
        break;
      }
    }
    if (!userMsg) return;
    handleSend(userMsg.content, agentId);
  }

  function handleEditComplete() {
    getMessages(id).then(setMessages).catch(() => {});
  }

  function handleChatFontChange(font: string) {
    setChatFont(font);
    try { localStorage.setItem(`agenthub-chat-font-${id}`, font); } catch {}
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Chat area */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <ChatHeader
          conversation={conversation}
          isStreaming={isStreaming}
          streamingAgentId={streamingAgentId}
          toolPanelOpen={toolPanelOpen}
          onToggleToolPanel={() => setToolPanelOpen(!toolPanelOpen)}
          onStop={handleCancel}
          queueCount={messageQueue.length}
          onReset={() => {
            setMessages([]);
            setMessageQueue([]);
            setThinkingContent("", true);
            clearSubagents();
            getMessages(id).then(setMessages).catch(() => {});
          }}
        />

        {/* Messages with starfield background */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto chat-font"
          id="chat-scroll"
          style={chatFont ? { fontFamily: `'${chatFont.replace("-", " ")}', var(--font-chat)` } : undefined}
        >
          <div className="relative z-10 mx-auto max-w-4xl space-y-3 p-6">
            {/* Empty state with ambient animation */}
            {messages.length === 0 && !isStreaming && (
              <EmptyChatState
                agentName={conversation?.agents?.[0]?.name}
                agentId={conversation?.agents?.[0]?.id}
                onSuggestionClick={(prompt) => sendMessage(prompt)}
              />
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  msg.sender_agent_id !== null
                }
                onRegenerate={handleRegenerate}
                onEditComplete={handleEditComplete}
              />
            ))}

            {/* Inline thinking block (Claude-style) */}
            {(thinkingContent || isStreaming) && messages.length > 0 && messages[messages.length - 1].sender_agent_id === null && (
              <InlineThinking
                thinkingContent={thinkingContent}
                isComplete={thinkingComplete}
                isStreaming={isStreaming}
              />
            )}

            {/* Terminal viewer for tool calls in the latest message */}
            {messages.length > 0 && messages[messages.length - 1].tool_calls.length > 0 && (
              <TerminalViewer
                toolCalls={messages[messages.length - 1].tool_calls}
                isStreaming={isStreaming && messages[messages.length - 1].sender_agent_id !== null}
              />
            )}

            {/* Queue indicator */}
            {messageQueue.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
                <div className="glass-bubble rounded-full px-4 py-1.5 flex items-center gap-2 queue-pulse neon-border">
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(messageQueue.length, 3) }).map((_, i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-blue-400">{messageQueue.length} message{messageQueue.length !== 1 ? "s" : ""} queued</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onCancel={handleCancel}
          isStreaming={isStreaming}
          agents={conversation?.type === "group" ? conversation.agents : undefined}
          conversationId={id}
          chatFont={chatFont}
          onFontChange={handleChatFontChange}
        />
      </div>

      {/* Floating stats panel */}
      <FloatingStats
        messages={messages}
        subagents={subagents}
        isStreaming={isStreaming}
        autoApprove={autoApprove}
        onToggleAutoApprove={() => setAutoApprove(!autoApprove)}
      />
      <ArtifactsPanel messages={messages} />
    </div>
  );
}

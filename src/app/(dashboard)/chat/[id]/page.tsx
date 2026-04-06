"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { ToolPanel } from "@/components/chat/tool-panel";
import { ThinkingPanel } from "@/components/chat/thinking-panel";
import { SubagentTree } from "@/components/chat/subagent-tree";
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
    conversations, setConversations,
    isStreaming, setIsStreaming, streamingAgentId, setStreamingAgentId,
    toolPanelOpen, setToolPanelOpen,
    thinkingContent, thinkingComplete, setThinkingContent,
    subagents, addSubagent, updateSubagent, clearSubagents,
  } = useStore();

  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef("");
  const streamMsgIdRef = useRef("");

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

  function handleSend(content: string, targetAgentId?: string, attachmentIds?: string[]) {
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
    streamContentRef.current = "";
    streamMsgIdRef.current = "";
    setThinkingContent("", false);

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
        // Reload to sync with DB
        getMessages(id).then(setMessages).catch(() => {});
        getConversations().then(setConversations).catch(() => {});
      },

      onAgentStart: (data) => {
        setStreamingAgentId(data.agent_id);
      },

      onThinking: (content) => {
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        <ChatHeader
          conversation={conversation}
          isStreaming={isStreaming}
          streamingAgentId={streamingAgentId}
          toolPanelOpen={toolPanelOpen}
          onToggleToolPanel={() => setToolPanelOpen(!toolPanelOpen)}
          onReset={() => {
            setMessages([]);
            setThinkingContent("", true);
            clearSubagents();
            getMessages(id).then(setMessages).catch(() => {});
          }}
        />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 p-4">
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

            {isStreaming && messages.length > 0 && messages[messages.length - 1].sender_agent_id === null && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  Agent is thinking...
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
        />
      </div>

      {/* Side Panels */}
      <ToolPanel />
      <ThinkingPanel />
      <SubagentTree />
      <ArtifactsPanel messages={messages} />
    </div>
  );
}

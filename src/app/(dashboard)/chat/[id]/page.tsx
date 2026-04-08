"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { useStore } from "@/lib/store";
import { streamChat, getMessages, getConversations } from "@/lib/api";
import { spring } from "@/lib/animation";
import type { MessageWithToolCalls, ConversationWithDetails } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const prefersReducedMotion = useReducedMotion();
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  
  // Store state
  const {
    messages,
    setMessages,
    appendMessage,
    updateLastAssistantMessage,
    isStreaming,
    setIsStreaming,
    streamingAgentId,
    setStreamingAgentId,
    setActiveConversationId,
    setThinkingContent,
    setThinkingStartTime,
    agents,
    setAgents,
    conversations,
    setConversations,
  } = useStore();

  // Check if chat has started (has messages)
  const hasMessages = messages.length > 0;

  // Fetch initial data
  useEffect(() => {
    if (!conversationId) return;
    
    setActiveConversationId(conversationId);
    setHasStartedChat(false);
    
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch conversations and messages in parallel
        const [convsData, msgsData] = await Promise.all([
          getConversations(),
          getMessages(conversationId),
        ]);
        
        setConversations(convsData);
        const currentConv = convsData.find((c) => c.id === conversationId) || null;
        setConversation(currentConv);
        setMessages(msgsData);
        
        // If there are existing messages, mark chat as started
        if (msgsData.length > 0) {
          setHasStartedChat(true);
        }
      } catch (error) {
        toast.error("Failed to load conversation");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
    
    return () => {
      setActiveConversationId(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [conversationId, setActiveConversationId, setConversations, setMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !prefersReducedMotion) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, prefersReducedMotion]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string, targetAgentId?: string, attachmentIds?: string[]) => {
    if (!conversationId || !content.trim()) return;
    
    // Mark chat as started (triggers animation)
    if (!hasStartedChat) {
      setHasStartedChat(true);
    }
    
    // Create user message
    const userMessage: MessageWithToolCalls = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_agent_id: null,
      content: content.trim(),
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
    
    appendMessage(userMessage);
    setIsStreaming(true);
    setThinkingStartTime(Date.now());
    
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    let assistantMessageId: string | null = null;
    let hasReceivedContent = false;
    
    streamChat(
      conversationId,
      content.trim(),
      {
        onContent: (chunk) => {
          if (!hasReceivedContent) {
            hasReceivedContent = true;
            setThinkingContent("", true); // Mark thinking as complete
          }
          updateLastAssistantMessage(chunk);
        },
        onToolCall: (data) => {
          // Tool calls are handled in the message bubble
        },
        onToolResult: (data) => {
          // Tool results are handled in the message bubble
        },
        onError: (error) => {
          toast.error(error);
          setIsStreaming(false);
          setStreamingAgentId(null);
        },
        onDone: (data) => {
          assistantMessageId = data.message_id;
          setIsStreaming(false);
          setStreamingAgentId(null);
          setThinkingContent("", false);
        },
        onAgentStart: (data) => {
          setStreamingAgentId(data.agent_id);
          // Add placeholder assistant message
          const assistantMessage: MessageWithToolCalls = {
            id: data.message_id,
            conversation_id: conversationId,
            sender_agent_id: data.agent_id,
            agent: agents.find((a) => a.id === data.agent_id),
            content: "",
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
          appendMessage(assistantMessage);
        },
        onThinking: (thinking) => {
          setThinkingContent(thinking, false);
        },
        onThinkingEnd: () => {
          setThinkingContent("", true);
        },
      },
      { target_agent_id: targetAgentId, signal: abortControllerRef.current.signal }
    );
  }, [conversationId, hasStartedChat, agents, appendMessage, setIsStreaming, setStreamingAgentId, updateLastAssistantMessage, setThinkingContent, setThinkingStartTime]);

  // Handle stop generation
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingAgentId(null);
  }, [setIsStreaming, setStreamingAgentId]);

  // Handle reset conversation
  const handleReset = useCallback(async () => {
    if (!conversationId) return;
    try {
      const msgsData = await getMessages(conversationId);
      setMessages(msgsData);
      setHasStartedChat(msgsData.length > 0);
    } catch (error) {
      toast.error("Failed to refresh messages");
    }
  }, [conversationId, setMessages]);

  // Handle regenerate
  const handleRegenerate = useCallback(async (messageId: string, agentId?: string) => {
    // Implementation would call the regenerate API
    toast.info("Regenerate feature coming soon");
  }, []);

  // Handle suggestion click from empty state
  const handleSuggestionClick = useCallback((prompt: string) => {
    handleSendMessage(prompt);
  }, [handleSendMessage]);

  // Search functionality
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    
    const indices: number[] = [];
    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(query.toLowerCase())) {
        indices.push(idx);
      }
    });
    setSearchResults(indices);
    setCurrentSearchIndex(indices.length > 0 ? 0 : -1);
  }, [messages]);

  const handleNavigateSearch = useCallback((direction: "next" | "prev") => {
    if (searchResults.length === 0) return;
    
    if (direction === "next") {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  }, [searchResults.length]);

  // Get primary agent for empty state
  const primaryAgent = conversation?.agents?.[0];

  // Animation variants
  const welcomeVariants = {
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
    },
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: -20,
    },
  };

  const inputContainerVariants = {
    centered: {
      y: 0,
      transition: {
        ...spring.gentle,
        duration: 0.4,
      },
    },
    bottom: {
      y: 0,
      transition: {
        ...spring.gentle,
        duration: 0.4,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0">
        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          <div className="flex items-center gap-2 px-2 shrink-0 py-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading conversation...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Header */}
        <ChatHeader
          conversation={conversation}
          isStreaming={isStreaming}
          streamingAgentId={streamingAgentId}
          toolPanelOpen={false}
          onToggleToolPanel={() => {}}
          onReset={handleReset}
          onStop={handleStop}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          searchResultCount={searchResults.length}
          onNavigateSearch={handleNavigateSearch}
        />

        {/* Main content area */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0 overflow-hidden relative",
          !hasStartedChat && "justify-center"
        )}>
          {/* Messages container */}
          <motion.div 
            layout
            ref={messagesContainerRef}
            className={cn(
              "overflow-y-auto min-h-0 px-4 scrollbar-thin scrollbar-thumb-rounded",
              hasStartedChat ? "flex-1 py-4 order-1" : "flex-none order-2 pb-12"
            )}
          >
            <AnimatePresence mode="popLayout">
              {!hasMessages ? (
                // Empty state with welcome content
                <motion.div
                  key="empty-state"
                  variants={welcomeVariants}
                  initial="visible"
                  exit="hidden"
                  layout
                  className="flex flex-col items-center justify-center pt-8"
                >
                  <EmptyChatState
                    agentName={primaryAgent?.name}
                    agentId={primaryAgent?.id}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </motion.div>
              ) : (
                // Messages list
                <div className="max-w-3xl mx-auto space-y-4">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, x: message.sender_agent_id === null ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        layout
                      >
                        <MessageBubble
                          message={message}
                          isStreaming={isStreaming && index === messages.length - 1 && message.sender_agent_id !== null}
                          onRegenerate={handleRegenerate}
                          showActions={true}
                          searchQuery={searchQuery}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Input area with animation */}
          <motion.div
            layout
            className={cn(
              "flex-shrink-0 px-4 w-full max-w-4xl mx-auto z-10",
               hasStartedChat ? "pb-4 pt-2 order-2" : "pt-8 pb-4 order-1"
            )}
            initial={false}
          >
            <motion.div
              layout
              transition={prefersReducedMotion ? { duration: 0 } : { ...spring.gentle, duration: 0.4 }}
            >
              <ChatInput
                onSend={handleSendMessage}
                onCancel={handleStop}
                isStreaming={isStreaming}
                agents={conversation?.agents || []}
                disabled={isLoading}
                conversationId={conversationId}
                isCentered={!hasStartedChat}
                hasStartedChat={hasStartedChat}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus, BookOpen, Trash2, Loader2, ChevronDown, ChevronUp,
  FileText, Upload, Database, Hash, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  getKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase,
  getDocuments, uploadDocument, deleteDocument,
} from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { KnowledgeBase, KBDocument } from "@/lib/types";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf": return "border-[var(--accent-rose)]/30 text-[var(--accent-rose)]";
    case "md":
    case "markdown": return "border-[var(--accent-blue)]/30 text-[var(--accent-blue)]";
    case "json": return "border-[var(--accent-amber)]/30 text-[var(--accent-amber)]";
    case "csv": return "border-[var(--status-online)]/30 text-[var(--status-online)]";
    case "txt":
    case "text": return "border-gray-500/30 text-gray-600";
    default: return "";
  }
}

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, KBDocument[]>>({});
  const [loadingDocs, setLoadingDocs] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [deletingKB, setDeletingKB] = useState<KnowledgeBase | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<{ kbId: string; doc: KBDocument } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const kbs = await getKnowledgeBases();
      setKnowledgeBases(kbs);
    } catch {
      toast.error("Failed to load knowledge bases");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!documents[id]) {
      setLoadingDocs(id);
      try {
        const docs = await getDocuments(id);
        setDocuments((prev) => ({ ...prev, [id]: docs }));
      } catch {
        toast.error("Failed to load documents");
      } finally {
        setLoadingDocs(null);
      }
    }
  }

  async function handleDeleteKB(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteKnowledgeBase(id);
      setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== id));
      if (expandedId === id) setExpandedId(null);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = documents;
      setDocuments(rest);
      toast.success("Knowledge base deleted");
    } catch {
      toast.error("Failed to delete knowledge base");
    }
  }

  function handleUploadClick(kbId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setUploadTargetId(kbId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    setUploading(uploadTargetId);
    try {
      const result = await uploadDocument(uploadTargetId, file);
      const newDoc: KBDocument = {
        id: result.id,
        knowledge_base_id: uploadTargetId,
        file_name: file.name,
        file_type: file.name.split(".").pop() || "unknown",
        file_size: file.size,
        chunk_count: result.chunk_count,
        content_preview: null,
        file_path: null,
        created_at: new Date().toISOString(),
      };
      setDocuments((prev) => ({
        ...prev,
        [uploadTargetId]: [...(prev[uploadTargetId] || []), newDoc],
      }));
      setKnowledgeBases((prev) =>
        prev.map((kb) =>
          kb.id === uploadTargetId
            ? { ...kb, document_count: kb.document_count + 1, total_chunks: kb.total_chunks + result.chunk_count }
            : kb,
        ),
      );
      toast.success("Document uploaded");
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(null);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDoc(kbId: string, docId: string) {
    try {
      await deleteDocument(kbId, docId);
      const doc = documents[kbId]?.find((d) => d.id === docId);
      setDocuments((prev) => ({
        ...prev,
        [kbId]: (prev[kbId] || []).filter((d) => d.id !== docId),
      }));
      setKnowledgeBases((prev) =>
        prev.map((kb) =>
          kb.id === kbId
            ? {
                ...kb,
                document_count: Math.max(0, kb.document_count - 1),
                total_chunks: Math.max(0, kb.total_chunks - (doc?.chunk_count || 0)),
              }
            : kb,
        ),
      );
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  }

  const totalDocs = knowledgeBases.reduce((sum, kb) => sum + kb.document_count, 0);
  const totalChunks = knowledgeBases.reduce((sum, kb) => sum + kb.total_chunks, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.json,.csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Bases</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage document collections for retrieval-augmented generation
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Knowledge Base
          </DialogTrigger>
          <CreateKBDialog
            onCreated={(kb) => {
              setKnowledgeBases((prev) => [kb, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Database className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{knowledgeBases.length}</div>
              <div className="text-xs text-muted-foreground">Knowledge Bases</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-[var(--accent-violet)]" />
            <div>
              <div className="text-2xl font-bold">{totalDocs}</div>
              <div className="text-xs text-muted-foreground">Documents</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Hash className="h-5 w-5 text-[var(--accent-amber)]" />
            <div>
              <div className="text-2xl font-bold">{totalChunks}</div>
              <div className="text-xs text-muted-foreground">Chunks</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : knowledgeBases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No knowledge bases yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a knowledge base to upload and manage documents for RAG
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Knowledge Base
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {knowledgeBases.map((kb) => {
            const isExpanded = expandedId === kb.id;
            const kbDocs = documents[kb.id] || [];
            const isLoadingDocs = loadingDocs === kb.id;
            const isUploading = uploading === kb.id;

            return (
              <Card key={kb.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => handleExpand(kb.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-blue)]/10">
                    <BookOpen className="h-5 w-5 text-[var(--accent-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{kb.name}</span>
                      <Badge variant="outline" className="text-[0.625rem]">
                        {kb.document_count} doc{kb.document_count !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="text-[0.625rem] border-[var(--accent-amber)]/30 text-[var(--accent-amber)]">
                        {kb.total_chunks} chunk{kb.total_chunks !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {kb.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleUploadClick(kb.id, e)}
                      title="Upload document"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingKB(kb); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-2">
                    {isLoadingDocs ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : kbDocs.length === 0 ? (
                      <div className="text-center py-6">
                        <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">No documents yet</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleUploadClick(kb.id, e)}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Document
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {kbDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 rounded-md border border-border bg-background p-2.5"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{doc.file_name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[0.625rem] ${fileTypeBadgeColor(doc.file_type)}`}
                                >
                                  {doc.file_type.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-[0.625rem] text-muted-foreground">
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span>{doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                              onClick={() => setDeletingDoc({ kbId: kb.id, doc })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleUploadClick(kb.id, e)}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3 mr-1" />
                            )}
                            Upload Document
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingKB} onOpenChange={(open) => { if (!open) setDeletingKB(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingKB?.name}&quot;? This will permanently remove the knowledge base and all its documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingKB) {
                  handleDeleteKB(deletingKB.id, { stopPropagation: () => {} } as React.MouseEvent);
                  setDeletingKB(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingDoc} onOpenChange={(open) => { if (!open) setDeletingDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDoc?.doc.file_name}&quot;? This will permanently remove the document and its chunks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingDoc) {
                  handleDeleteDoc(deletingDoc.kbId, deletingDoc.doc.id);
                  setDeletingDoc(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateKBDialog({
  onCreated,
}: {
  onCreated: (kb: KnowledgeBase) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Knowledge base name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createKnowledgeBase(name.trim(), description.trim() || undefined);
      onCreated({
        id: result.id,
        name: name.trim(),
        description: description.trim() || null,
        document_count: 0,
        total_chunks: 0,
        created_at: new Date().toISOString(),
      });
      toast.success("Knowledge base created");
    } catch {
      toast.error("Failed to create knowledge base");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create Knowledge Base</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Product Documentation"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            placeholder="Optional description of this knowledge base..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Knowledge Base
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

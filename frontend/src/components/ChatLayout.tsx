import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  Plus,
  MoreVertical,
  LogOut,
  MessageSquare,
  User,
  Loader2,
  Upload,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { auth } from "../firebase";
import { toast } from 'react-hot-toast';



interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
   
}

interface ChatHistory {
  _id: string;
  title: string;
  createdAt: string;
}

interface User {
  name: string;
  email: string;
  uid: string;
  photoURL?: string;
}

interface ChatLayoutProps {
  user: User;
  onLogout: () => void;
}

export const ChatLayout = ({ user, onLogout }: ChatLayoutProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [showFiles, setShowFiles] = useState(false);
 const [deletingChatId, setDeletingChatId] = useState<string | null>(null); // NEW
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const token = await auth.currentUser?.getIdToken(true);
        const res = await fetch("http://localhost:5000/api/chat/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!Array.isArray(data.sessions)) throw new Error("Invalid format");
        setChatHistory(data.sessions);
      } catch {
        // toast({ title: "Error", description: "Could not fetch chat history", variant: "destructive" });
        toast.error("Failed to fetch chat history");
      }
    };
    fetchChatHistory();
  }, [user.uid]);

  const fetchUploadedFiles = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`http://localhost:5000/api/files?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data.files)) throw new Error("Invalid file list");
      setUploadedFiles(data.files);
    } catch {
      // toast({ title: "Failed to fetch files", description: "Could not load uploaded files.", variant: "destructive" });
      toast.error("Failed to fetch uploaded files");
    }
  };

  const handleChatSelect = async (sessionId: string) => {
  try {
    const token = await auth.currentUser?.getIdToken(true);
    const res = await fetch(`http://localhost:5000/api/chat/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Invalid session ID");
    const data = await res.json();

    setActiveSessionId(sessionId);

    if (!data.messages || data.messages.length === 0) {
      // toast({
      //   title: "Empty chat",
      //   description: "This chat has no saved messages yet.",
      //   variant: "default",
      // });
      toast.error("This chat has no saved messages yet");
      setMessages([]); // Clear messages to avoid showing previous session's data
    } else {
      setMessages(
        data.messages.map((msg: any) => ({
          id: uuidv4(),
          content: msg.text,
          isUser: msg.sender === "user",
          timestamp: new Date(msg.timestamp),
        }))
      );
    }

    await fetchUploadedFiles(sessionId);
  } catch (err) {
    // toast({
    //   title: "Invalid session",
    //   description: "Could not load selected chat.",
    //   variant: "destructive",
    // });'
    toast.error("Failed to load chat session");
  }
};

//delete chat
const handleChatDelete = async (sessionId: string) => {
   setDeletingChatId(sessionId); // trigger loader
  try {
    const token = await auth.currentUser?.getIdToken(true);
    await fetch(`http://localhost:5000/api/chat/delete/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setChatHistory((prev) => prev.filter((chat) => chat._id !== sessionId));
    // toast({ title: "Chat deleted" });
    // if (activeSessionId === sessionId) {
    //   startNewChat(); // reset UI
    // }
    toast.success("Chat deleted successfully");
  } catch {
    // toast({ title: "Failed to delete chat", variant: "destructive" });
    toast.error("Failed to delete chat");
  }finally {
      setDeletingChatId(null);
    }
};


  const startNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setSelectedFile(null);
    fileInputRef.current && (fileInputRef.current.value = "");
    setUploadedFiles([]);
  };

 const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputValue.trim()) return;

  const token = await auth.currentUser?.getIdToken(true);
  let sessionId = activeSessionId;

  // Create session if it doesn't exist
  if (!sessionId) {
    const res = await fetch("http://localhost:5000/api/chat/create-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: inputValue }),
    });
    const data = await res.json();
    sessionId = data.sessionId;
    setActiveSessionId(sessionId);
    //adding current chat to sidebar
    setChatHistory((prev) => [
    {
      _id: sessionId,
      title: inputValue,
      createdAt: new Date().toISOString(),
    },
    ...prev,
  ]);
  }

  const userMessage: Message = {
    id: uuidv4(),
    content: inputValue,
    isUser: true,
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInputValue("");
  setIsTyping(true);

  // Create empty assistant message
  const assistantId = uuidv4();
  setMessages((prev) => [
    ...prev,
    {
      id: assistantId,
      content: "",
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  try {
    const res = await fetch("http://localhost:5000/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: userMessage.content, sessionId }),
    });

    if (!res.ok || !res.body) throw new Error("No stream response");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let partial = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      partial += chunk;

      // Word-by-word (or character-by-character) update
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: partial } : msg
        )
      );
    }
  } catch (err) {
    // toast({ title: "Streaming Error", description: "Failed to receive stream", variant: "destructive" });
    toast.error("Failed to receive stream");
  } finally {
    setIsTyping(false);
  }
};

  // const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   if (!['application/pdf', 'text/plain'].includes(file.type)) {
  //     toast({ title: 'Invalid file type', variant: 'destructive' });
  //     return;
  //   }
  //   setSelectedFile(file);
  // };
// When user selects a file from input
const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!["application/pdf", "text/plain"].includes(file.type)) {
    // toast({ title: "Invalid file type", variant: "destructive" });
    toast.error("Invalid file type");
    return;
  }
  setSelectedFile(file);
};

// Upload when "Upload" button is clicked
const uploadSelectedFile = async () => {
  if (!selectedFile) return;

  setIsUploading(true);
  try {
    const token = await auth.currentUser?.getIdToken(true);
    let sessionId = activeSessionId;

    // Create session if needed
    if (!sessionId) {
      const res = await fetch("http://localhost:5000/api/chat/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: selectedFile.name }),
      });
      const data = await res.json();
      sessionId = data.sessionId;
      setActiveSessionId(sessionId);
    }

    // Upload the file
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("sessionId", sessionId);

    const res = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    // toast({ title: "Success", description: "File uploaded" });
    toast.success("File uploaded successfully");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchUploadedFiles(sessionId);
  } catch (err) {
    // toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    toast.error("File Upload failed");
  } finally {
    setIsUploading(false);
  }
};
  const handleFileDelete = async (fileName: string) => {
    const token = await auth.currentUser?.getIdToken(true);
    await fetch("http://localhost:5000/api/files/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName, sessionId: activeSessionId }),
    });
    // toast({ title: "File deleted", description: fileName });
    toast.success("File deleted successfully");
    setUploadedFiles((prev) => prev.filter((f) => f.fileName !== fileName));
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

 

return (
  <div className="h-screen flex bg-chat-background">
    {/* Sidebar */}
    
      <div className="w-80 border-r border-chat-border bg-chat-sidebar flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={startNewChat} className="w-full justify-start">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          {(showFiles ? uploadedFiles : chatHistory).map((item: any) => (
            <div
              key={item._id || item.fileName}
              onClick={!showFiles ? () => handleChatSelect(item._id) : undefined}
              className="p-3 rounded-lg cursor-pointer group hover:bg-chat-hover flex justify-between items-center"
            >
              <p className="truncate text-sm font-medium">{item.title || item.fileName}</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (showFiles) {
                    handleFileDelete(item.fileName);
                  } else {
                    handleChatDelete(item._id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingChatId === item._id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-400" />
                )}
              </Button>
            </div>
          ))}
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            onClick={() => setShowFiles(!showFiles)}
            className="w-full justify-start"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            {showFiles ? "Back to Chats" : "View Files"}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>
                    {(user as any)?.displayName?.charAt(0)?.toUpperCase() ??
                      user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    {/* Chat */}
    <div className="flex-1 flex flex-col">
      <div className="h-16 bg-card border-b px-6 flex items-center">
        <MessageSquare className="h-5 w-5 text-primary mr-3" />
        <h1 className="text-lg font-semibold">d-RAG Chat Assistant</h1>
      </div>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Start a new conversation</h3>
              <p>Send a message or upload a file to begin.</p>
            </div>
          ) : (
     messages.map((message: any) => (
  <ChatMessage
    key={message.id}
    message={message}
    userAvatar={user?.photoURL || undefined}
    userName={(user as any)?.displayName || user?.name || "User"}
  />
))

          )}
          {isTyping && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-6 border-t bg-card">
        <div className="max-w-4xl mx-auto">
          {selectedFile && (
            <div className="mb-4 p-3 bg-chat-input rounded-lg border flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Paperclip className="h-4 w-4" />
                <span className="text-sm truncate max-w-[180px]">{selectedFile.name}</span>
                {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeSelectedFile}
                  disabled={isUploading}
                >
                  ×
                </Button>

                {isUploading ? (
                  <div className="px-3 py-1 text-sm flex items-center border rounded-lg text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Uploading...
                  </div>
                ) : (
                  <Button size="sm" onClick={uploadSelectedFile}>
                    <Upload className="h-4 w-4 mr-1" /> Upload
                  </Button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="pr-12"
                disabled={isUploading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={onSelectFile}
                  className="hidden"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={!inputValue.trim() || isUploading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  </div>
);
}

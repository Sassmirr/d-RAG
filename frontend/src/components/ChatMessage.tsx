import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  userAvatar?: string; // optional user avatar
  userName?: string;   // optional user name
}

export const ChatMessage = ({ message, userAvatar, userName }: ChatMessageProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-start space-x-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      {!message.isUser && (
        <Avatar className="h-8 w-8 bg-chat-bot-message border border-chat-border">
          <AvatarFallback>
            <Bot className="h-4 w-4 text-foreground" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[70%] ${message.isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            message.isUser
              ? 'bg-chat-user-message text-primary-foreground ml-auto'
              : 'bg-chat-bot-message text-foreground border border-chat-border'
          }`}
        >
          {message.isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !className;

                    return !isInline && match ? (
                      <SyntaxHighlighter
                        style={oneDark as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-chat-input text-foreground px-1 py-0.5 rounded text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => (
                    <p className="text-sm text-foreground mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-sm text-foreground list-disc list-inside mb-2 last:mb-0">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-sm text-foreground list-decimal list-inside mb-2 last:mb-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-foreground">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground">{children}</em>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      className="text-primary hover:text-primary/80 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-foreground mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold text-foreground mb-1">{children}</h3>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-chat-border pl-4 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <p className={`text-xs text-muted-foreground mt-1 ${
          message.isUser ? 'text-right' : 'text-left'
        }`}>
          {formatTime(new Date(message.timestamp))}
        </p>
      </div>

      {message.isUser && (
        <Avatar className="h-8 w-8 bg-primary">
          <AvatarImage src={userAvatar || undefined} />
          <AvatarFallback>
            {userName?.charAt(0)?.toUpperCase() || (
              <User className="h-4 w-4 text-primary-foreground" />
            )}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

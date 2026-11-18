import type { Metadata } from "next";
import { ChatShell } from "@/features/coach/components/chat-shell";

export const metadata: Metadata = { title: "Chat · Sukoon" };

export default function ChatPage() {
  return <ChatShell />;
}

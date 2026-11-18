import { expect, type Page } from "@playwright/test";

/** Page object for the home chat. Used by tests/e2e/chat.spec.ts. */
export class ChatPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  composer() {
    return this.page.getByRole("textbox", { name: "Describe your parenting concern" });
  }

  async expectEmptyState() {
    await expect(this.page.getByRole("heading", { level: 1, name: "Sukoon" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "What's on your mind today?" })).toBeVisible();
    await expect(this.composer()).toBeVisible();
  }

  async pickSuggestion(text: string) {
    await this.page.getByRole("button", { name: text }).click();
  }

  async send() {
    await this.page.getByRole("button", { name: "Send message" }).click();
  }
}

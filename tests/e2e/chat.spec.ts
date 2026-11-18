import { expect, test } from "@playwright/test";
import { APP_COPY, SUGGESTIONS } from "../../src/features/coach/content/ui-copy";
import { ordinaryReply } from "./fixtures/coach-reply";
import { ChatPage } from "./pages/chat-page";

const suggestion = SUGGESTIONS[0].text;

test.describe("parent coach chat", () => {
  test("fills a suggestion, then shows the parent message and the coach plan", async ({ page }) => {
    await page.route("**/api/coach", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: ordinaryReply }),
      });
    });

    const chat = new ChatPage(page);
    await chat.goto();
    await chat.expectEmptyState();

    await chat.pickSuggestion(suggestion);
    await expect(chat.composer()).toHaveValue(suggestion);

    await chat.send();

    await expect(page.getByText(suggestion)).toBeVisible();
    await expect(page.getByText(ordinaryReply.acknowledgement)).toBeVisible();
    await expect(page.getByText(ordinaryReply.steps[0])).toBeVisible();
    await expect(page.getByRole("button", { name: APP_COPY.newChat })).toBeVisible();
  });

  test("shows a retryable error when the coach API fails", async ({ page }) => {
    await page.route("**/api/coach", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "LLM_UNAVAILABLE",
            message: "The coach is temporarily unavailable.",
            retryable: true,
            requestId: "req-e2e-1",
          },
        }),
      });
    });

    const chat = new ChatPage(page);
    await chat.goto();
    await chat.composer().fill("My child will not start homework.");
    await chat.send();

    await expect(page.getByText("The coach is temporarily unavailable. Please try again in a moment.")).toBeVisible();
    await expect(page.getByRole("button", { name: APP_COPY.retry })).toBeVisible();
  });
});

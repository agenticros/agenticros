import type { RosbridgeClient } from "./client.js";
import type {
  ActionResultMessage,
  ActionFeedbackMessage,
} from "./types.js";

export interface ActionGoalOptions {
  action: string;
  actionType: string;
  args?: Record<string, unknown>;
  onFeedback?: (feedback: ActionFeedbackMessage) => void;
  timeoutMs?: number;
}

/**
 * Client for sending action goals and receiving feedback/results.
 */
export class ActionClient {
  constructor(private client: RosbridgeClient) {}

  /**
   * Send an action goal and wait for the result.
   *
   * @param options - Action goal options including feedback handler
   * @returns The action result
   */
  async sendGoal(options: ActionGoalOptions): Promise<ActionResultMessage> {
    const id = this.client.nextId("action");
    const timeoutMs = options.timeoutMs ?? 120_000; // Actions can be long-running

    // Register feedback handler if provided
    let removeFeedbackHandler: (() => void) | null = null;
    if (options.onFeedback) {
      const feedbackKey = `__action_feedback__${id}`;
      removeFeedbackHandler = this.client.onMessage(feedbackKey, (msg) => {
        options.onFeedback!(msg as unknown as ActionFeedbackMessage);
      });
    }

    // Create promise that resolves on action_result
    const resultPromise = new Promise<ActionResultMessage>((resolve, reject) => {
      this.client.registerPending(
        id,
        (result) => resolve(result as ActionResultMessage),
        reject,
        timeoutMs,
      );
    });

    // Send the goal
    this.client.send({
      op: "send_action_goal",
      id,
      action: options.action,
      action_type: options.actionType,
      args: options.args,
    });

    try {
      return await resultPromise;
    } finally {
      // Clean up feedback handler regardless of outcome
      if (removeFeedbackHandler) {
        removeFeedbackHandler();
      }
    }
  }

  /**
   * Cancel an in-progress action goal.
   *
   * @param action - The action server name
   */
  async cancelGoal(action: string): Promise<void> {
    this.client.send({
      op: "cancel_action_goal",
      id: this.client.nextId("cancel"),
      action,
    });
  }
}

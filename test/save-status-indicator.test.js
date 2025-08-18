/**
 * Unit tests for SaveStatusIndicator
 * Tests the user feedback component for save operations
 */

// Mock TextEncoder/TextDecoder for JSDOM compatibility
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

// Mock DOM environment
const { JSDOM } = require("jsdom");

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        .save-status-indicator { display: block; }
        .save-status-indicator.hidden { display: none; }
        .save-status-indicator.visible { opacity: 1; }
        .save-status-indicator.saving { color: orange; }
        .save-status-indicator.saved { color: green; }
        .save-status-indicator.pending { color: blue; }
        .save-status-indicator.error { color: red; }
      </style>
    </head>
    <body>
      <div id="test-container"></div>
    </body>
  </html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.getComputedStyle = dom.window.getComputedStyle;

// Load the SaveStatusIndicator class directly
const SaveStatusIndicator = require("../src/ui/components/save-status-indicator.js");

describe("SaveStatusIndicator", () => {
  let container;
  let indicator;

  beforeEach(() => {
    // Create fresh container for each test
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (indicator) {
      indicator.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    jest.useRealTimers();
  });

  describe("Constructor and Initialization", () => {
    test("should initialize with default options", () => {
      indicator = new SaveStatusIndicator(container);

      expect(indicator.container).toBe(container);
      expect(indicator.options.position).toBe("top-right");
      expect(indicator.options.autoHide).toBe(true);
      expect(indicator.options.autoHideDelay).toBe(3000);
      expect(indicator.options.showRetry).toBe(false);
      expect(indicator.options.enableToasts).toBe(false);
    });

    test("should initialize with custom options", () => {
      const customOptions = {
        position: "bottom-left",
        autoHide: false,
        autoHideDelay: 5000,
        showRetry: true,
        enableToasts: true,
        onRetry: jest.fn(),
        onDismiss: jest.fn(),
      };

      indicator = new SaveStatusIndicator(container, customOptions);

      expect(indicator.options.position).toBe("bottom-left");
      expect(indicator.options.autoHide).toBe(false);
      expect(indicator.options.autoHideDelay).toBe(5000);
      expect(indicator.options.showRetry).toBe(true);
      expect(indicator.options.enableToasts).toBe(true);
      expect(indicator.options.onRetry).toBe(customOptions.onRetry);
      expect(indicator.options.onDismiss).toBe(customOptions.onDismiss);
    });

    test("should throw error for invalid container", () => {
      expect(() => {
        new SaveStatusIndicator(null);
      }).toThrow("Container element is required");

      expect(() => {
        new SaveStatusIndicator("invalid");
      }).toThrow("Container must be a DOM element");
    });

    test("should create indicator element with correct structure", () => {
      indicator = new SaveStatusIndicator(container);

      const indicatorElement = container.querySelector(
        ".save-status-indicator",
      );
      expect(indicatorElement).toBeTruthy();

      expect(indicatorElement.querySelector(".status-content")).toBeTruthy();
      expect(indicatorElement.querySelector(".status-icon")).toBeTruthy();
      expect(indicatorElement.querySelector(".status-message")).toBeTruthy();
      expect(indicatorElement.querySelector(".status-actions")).toBeTruthy();
    });

    test("should apply correct position class", () => {
      indicator = new SaveStatusIndicator(container, {
        position: "bottom-left",
      });

      const indicatorElement = container.querySelector(
        ".save-status-indicator",
      );
      expect(indicatorElement.classList.contains("bottom-left")).toBe(true);
    });
  });

  describe("Status Display Methods", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container);
    });

    test("should show saving status", () => {
      indicator.showSaving();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("saving")).toBe(true);
      expect(element.classList.contains("visible")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("Saving changes...");

      const icon = element.querySelector(".status-icon");
      expect(icon.textContent).toBe("⟳");
    });

    test("should show saved status", () => {
      indicator.showSaved();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("saved")).toBe(true);
      expect(element.classList.contains("visible")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("All changes saved");

      const icon = element.querySelector(".status-icon");
      expect(icon.textContent).toBe("✓");
    });

    test("should show pending status", () => {
      indicator.showPending("2 unsaved changes");

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("pending")).toBe(true);
      expect(element.classList.contains("visible")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("2 unsaved changes");

      const icon = element.querySelector(".status-icon");
      expect(icon.textContent).toBe("●");
    });

    test("should show error status", () => {
      const error = new Error("Test error");
      indicator.showError(error, "Save failed");

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("error")).toBe(true);
      expect(element.classList.contains("visible")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("Save failed");

      const icon = element.querySelector(".status-icon");
      expect(icon.textContent).toBe("✗");
    });

    test("should clear all status classes when changing status", () => {
      indicator.showSaving();
      expect(
        container
          .querySelector(".save-status-indicator")
          .classList.contains("saving"),
      ).toBe(true);

      indicator.showSaved();
      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("saving")).toBe(false);
      expect(element.classList.contains("saved")).toBe(true);
    });
  });

  describe("Generic Status Update", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container);
    });

    test("should update status with custom options", () => {
      indicator.updateStatus("custom", {
        message: "Custom message",
        icon: "★",
        className: "custom-status",
      });

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("custom-status")).toBe(true);
      expect(element.classList.contains("visible")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("Custom message");

      const icon = element.querySelector(".status-icon");
      expect(icon.textContent).toBe("★");
    });

    test("should fall back to defaults for unknown status", () => {
      indicator.updateStatus("unknown");

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("unknown")).toBe(true);

      const message = element.querySelector(".status-message");
      expect(message.textContent).toBe("Status update");
    });

    test("should handle empty options object", () => {
      expect(() => {
        indicator.updateStatus("test", {});
      }).not.toThrow();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true);
    });
  });

  describe("Auto-hide Functionality", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container, {
        autoHide: true,
        autoHideDelay: 1000,
      });
    });

    test("should auto-hide after delay for saved status", () => {
      indicator.showSaved();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      expect(element.classList.contains("visible")).toBe(false);
    });

    test("should not auto-hide for error status", () => {
      indicator.showError(new Error("Test error"));

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true);

      jest.advanceTimersByTime(2000);

      expect(element.classList.contains("visible")).toBe(true);
    });

    test("should not auto-hide when disabled", () => {
      indicator.options.autoHide = false;
      indicator.showSaved();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true);

      jest.advanceTimersByTime(2000);

      expect(element.classList.contains("visible")).toBe(true);
    });

    test("should cancel previous auto-hide when status changes", () => {
      indicator.showSaved();

      // Should schedule auto-hide
      jest.advanceTimersByTime(500);

      // Change status before auto-hide triggers
      indicator.showSaving();

      // Advance past original auto-hide time
      jest.advanceTimersByTime(600);

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true); // Should still be visible
    });
  });

  describe("Action Buttons", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container, {
        showRetry: true,
        onRetry: jest.fn(),
        onDismiss: jest.fn(),
      });
    });

    test("should show retry button for error status", () => {
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent.trim()).toBe("Retry");
    });

    test("should show dismiss button when visible", () => {
      indicator.showSaved();

      const dismissButton = container.querySelector(".dismiss-button");
      expect(dismissButton).toBeTruthy();
      expect(dismissButton.textContent.trim()).toBe("Dismiss");
    });

    test("should trigger retry callback when retry button clicked", () => {
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");
      retryButton.click();

      expect(indicator.options.onRetry).toHaveBeenCalledTimes(1);
    });

    test("should trigger dismiss callback when dismiss button clicked", () => {
      indicator.showSaved();

      const dismissButton = container.querySelector(".dismiss-button");
      dismissButton.click();

      expect(indicator.options.onDismiss).toHaveBeenCalledTimes(1);
    });

    test("should hide indicator when dismiss button clicked", () => {
      indicator.showSaved();

      const element = container.querySelector(".save-status-indicator");
      expect(element.classList.contains("visible")).toBe(true);

      const dismissButton = container.querySelector(".dismiss-button");
      dismissButton.click();

      expect(element.classList.contains("visible")).toBe(false);
    });

    test("should not show retry button when disabled", () => {
      indicator.options.showRetry = false;
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");
      expect(retryButton).toBeFalsy();
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container);
    });

    test("should dispatch status change events", () => {
      const eventListener = jest.fn();
      container.addEventListener("statuschange", eventListener);

      indicator.showSaving();

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener.mock.calls[0][0].detail.status).toBe("saving");
    });

    test("should dispatch visibility change events", () => {
      const eventListener = jest.fn();
      container.addEventListener("visibilitychange", eventListener);

      indicator.showSaved();
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ visible: true }),
        }),
      );

      indicator.hide();
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ visible: false }),
        }),
      );
    });

    test("should handle missing event listeners gracefully", () => {
      expect(() => {
        indicator.showSaved();
        indicator.hide();
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container);
    });

    test("should have proper ARIA attributes", () => {
      indicator.showSaving();

      const element = container.querySelector(".save-status-indicator");
      expect(element.getAttribute("role")).toBe("status");
      expect(element.getAttribute("aria-live")).toBe("polite");
      expect(element.getAttribute("aria-atomic")).toBe("true");
    });

    test("should update aria-label with current status", () => {
      indicator.showSaving();
      const element = container.querySelector(".save-status-indicator");
      expect(element.getAttribute("aria-label")).toContain("Saving changes");

      indicator.showSaved();
      expect(element.getAttribute("aria-label")).toContain("All changes saved");
    });

    test("should make action buttons accessible", () => {
      indicator = new SaveStatusIndicator(container, { showRetry: true });
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");
      expect(retryButton.getAttribute("aria-label")).toBe(
        "Retry failed operation",
      );
      expect(retryButton.getAttribute("role")).toBe("button");

      const dismissButton = container.querySelector(".dismiss-button");
      expect(dismissButton.getAttribute("aria-label")).toBe(
        "Dismiss notification",
      );
      expect(dismissButton.getAttribute("role")).toBe("button");
    });

    test("should support keyboard navigation", () => {
      indicator = new SaveStatusIndicator(container, { showRetry: true });
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");
      const dismissButton = container.querySelector(".dismiss-button");

      expect(retryButton.tabIndex).toBe(0);
      expect(dismissButton.tabIndex).toBe(0);
    });

    test("should handle keyboard events on buttons", () => {
      indicator = new SaveStatusIndicator(container, {
        showRetry: true,
        onRetry: jest.fn(),
      });
      indicator.showError(new Error("Test error"));

      const retryButton = container.querySelector(".retry-button");

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      retryButton.dispatchEvent(enterEvent);

      expect(indicator.options.onRetry).toHaveBeenCalledTimes(1);

      // Simulate Space key press
      const spaceEvent = new KeyboardEvent("keydown", { key: " " });
      retryButton.dispatchEvent(spaceEvent);

      expect(indicator.options.onRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe("Toast Notifications", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container, {
        enableToasts: true,
      });
    });

    test("should show toast for error status when enabled", () => {
      indicator.showError(new Error("Test error"), "Save failed");

      const toast = document.querySelector(".save-status-toast");
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain("Save failed");
    });

    test("should auto-remove toast after delay", () => {
      indicator.showError(new Error("Test error"));

      let toast = document.querySelector(".save-status-toast");
      expect(toast).toBeTruthy();

      jest.advanceTimersByTime(4000);

      toast = document.querySelector(".save-status-toast");
      expect(toast).toBeFalsy();
    });

    test("should not show toast when disabled", () => {
      indicator.options.enableToasts = false;
      indicator.showError(new Error("Test error"));

      const toast = document.querySelector(".save-status-toast");
      expect(toast).toBeFalsy();
    });

    test("should limit number of concurrent toasts", () => {
      // Show multiple errors rapidly
      for (let i = 0; i < 5; i++) {
        indicator.showError(new Error(`Error ${i}`));
      }

      const toasts = document.querySelectorAll(".save-status-toast");
      expect(toasts.length).toBeLessThanOrEqual(3); // Should limit to 3 toasts
    });
  });

  describe("State Management", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container);
    });

    test("should track current status", () => {
      expect(indicator.getCurrentStatus()).toBeNull();

      indicator.showSaving();
      expect(indicator.getCurrentStatus()).toBe("saving");

      indicator.showSaved();
      expect(indicator.getCurrentStatus()).toBe("saved");

      indicator.showError(new Error("Test"));
      expect(indicator.getCurrentStatus()).toBe("error");
    });

    test("should track visibility state", () => {
      expect(indicator.isVisible()).toBe(false);

      indicator.showSaving();
      expect(indicator.isVisible()).toBe(true);

      indicator.hide();
      expect(indicator.isVisible()).toBe(false);
    });

    test("should provide status history", () => {
      indicator.showSaving();
      indicator.showSaved();
      indicator.showError(new Error("Test"));

      const history = indicator.getStatusHistory();
      expect(history.length).toBe(3);
      expect(history[0].status).toBe("saving");
      expect(history[1].status).toBe("saved");
      expect(history[2].status).toBe("error");
    });

    test("should limit status history length", () => {
      // Generate many status changes
      for (let i = 0; i < 20; i++) {
        indicator.showSaving();
        indicator.showSaved();
      }

      const history = indicator.getStatusHistory();
      expect(history.length).toBeLessThanOrEqual(10); // Should limit history
    });
  });

  describe("Cleanup and Destruction", () => {
    beforeEach(() => {
      indicator = new SaveStatusIndicator(container, {
        autoHide: true,
        enableToasts: true,
      });
    });

    test("should remove element from DOM on destroy", () => {
      indicator.showSaved();

      expect(container.querySelector(".save-status-indicator")).toBeTruthy();

      indicator.destroy();

      expect(container.querySelector(".save-status-indicator")).toBeFalsy();
    });

    test("should clear all timers on destroy", () => {
      indicator.showSaved(); // This should schedule auto-hide

      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      indicator.destroy();

      // Timers should be cleared
      expect(jest.getTimerCount()).toBe(0);
    });

    test("should remove event listeners on destroy", () => {
      const eventListener = jest.fn();
      container.addEventListener("statuschange", eventListener);

      indicator.showSaved();
      expect(eventListener).toHaveBeenCalledTimes(1);

      indicator.destroy();

      // Event should not be dispatched after destroy
      indicator.showSaving();
      expect(eventListener).toHaveBeenCalledTimes(1); // No additional calls
    });

    test("should clean up toast notifications on destroy", () => {
      indicator.showError(new Error("Test error"));

      expect(document.querySelector(".save-status-toast")).toBeTruthy();

      indicator.destroy();

      expect(document.querySelector(".save-status-toast")).toBeFalsy();
    });

    test("should handle multiple destroy calls gracefully", () => {
      expect(() => {
        indicator.destroy();
        indicator.destroy();
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("should handle DOM manipulation errors gracefully", () => {
      indicator = new SaveStatusIndicator(container);

      // Remove container from DOM to simulate error
      container.remove();

      expect(() => {
        indicator.showSaving();
        indicator.showSaved();
        indicator.hide();
      }).not.toThrow();
    });

    test("should handle invalid error objects", () => {
      indicator = new SaveStatusIndicator(container);

      expect(() => {
        indicator.showError(null);
        indicator.showError("string error");
        indicator.showError({ message: "object error" });
      }).not.toThrow();
    });

    test("should handle malformed options gracefully", () => {
      expect(() => {
        indicator = new SaveStatusIndicator(container, {
          onRetry: "not a function",
          autoHideDelay: "not a number",
          position: 123,
        });
      }).not.toThrow();
    });
  });

  describe("Performance", () => {
    test("should handle rapid status changes efficiently", () => {
      indicator = new SaveStatusIndicator(container);

      const startTime = Date.now();

      // Perform many rapid status changes
      for (let i = 0; i < 1000; i++) {
        indicator.showSaving();
        indicator.showSaved();
        indicator.showPending(`${i} changes`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });

    test("should not create memory leaks with frequent updates", () => {
      indicator = new SaveStatusIndicator(container, { enableToasts: true });

      // Create many status updates that would create toasts
      for (let i = 0; i < 100; i++) {
        indicator.showError(new Error(`Error ${i}`));
      }

      // Should limit DOM elements (toasts should be cleaned up)
      const toasts = document.querySelectorAll(".save-status-toast");
      expect(toasts.length).toBeLessThanOrEqual(5);
    });
  });
});

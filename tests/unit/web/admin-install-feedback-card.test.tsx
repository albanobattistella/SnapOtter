// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminInstallFeedbackCard } from "@/components/feedback/admin-install-feedback-card";

afterEach(() => {
  cleanup();
});

describe("AdminInstallFeedbackCard", () => {
  it("does not render when hidden", () => {
    render(
      <AdminInstallFeedbackCard
        visible={false}
        onShare={vi.fn()}
        onRemindLater={vi.fn()}
        onDismissForever={vi.fn()}
      />,
    );

    expect(screen.queryByText("How was setup?")).toBeNull();
  });

  it("renders quiet admin install feedback actions", () => {
    render(
      <AdminInstallFeedbackCard
        visible={true}
        onShare={vi.fn()}
        onRemindLater={vi.fn()}
        onDismissForever={vi.fn()}
      />,
    );

    expect(screen.getByText("How was setup?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Share feedback" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Remind me later" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Don't ask again" })).toBeDefined();
  });

  it("calls the supplied action callbacks", () => {
    const onShare = vi.fn();
    const onRemindLater = vi.fn();
    const onDismissForever = vi.fn();

    render(
      <AdminInstallFeedbackCard
        visible={true}
        onShare={onShare}
        onRemindLater={onRemindLater}
        onDismissForever={onDismissForever}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share feedback" }));
    fireEvent.click(screen.getByRole("button", { name: "Remind me later" }));
    fireEvent.click(screen.getByRole("button", { name: "Don't ask again" }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onRemindLater).toHaveBeenCalledTimes(1);
    expect(onDismissForever).toHaveBeenCalledTimes(1);
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button Component", () => {
  it("renders with correct text content", () => {
    render(<Button>Bespoke Commission</Button>);
    expect(screen.getByRole("button", { name: /bespoke commission/i })).toBeInTheDocument();
  });

  it("applies primary luxury bronze variant styles", () => {
    render(<Button variant="primary">Add to Bag</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-bronze");
  });

  it("renders disabled state when disabled prop is provided", () => {
    render(<Button disabled>Sold Out</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-50");
  });

  it("displays loading spinner and disables click when isLoading is true", () => {
    render(<Button isLoading>Processing</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });
});

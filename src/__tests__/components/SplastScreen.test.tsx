import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SplashScreen from "../../components/SplastScreen";

describe("SplashScreen", () => {
  it("renders the loading splash", () => {
    render(<SplashScreen />);
    expect(screen.getByText("WhatsApp Clone")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

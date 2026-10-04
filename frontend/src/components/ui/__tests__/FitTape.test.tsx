import { render, screen } from "@testing-library/react";
import { FitTape } from "../FitTape";

describe("FitTape", () => {
  it("announces the score and band to screen readers", () => {
    render(<FitTape score={91.6} animated={false} showLabel />);
    expect(screen.getByRole("img", { name: "Strong fit: 92 percent match" })).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("Strong fit")).toBeInTheDocument();
  });

  it("clamps out-of-range scores", () => {
    render(<FitTape score={140} animated={false} />);
    expect(screen.getByRole("img", { name: /100 percent/ })).toBeInTheDocument();
  });
});

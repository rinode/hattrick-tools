import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartPicker, type PickerOption } from "../src/index.js";

const OPTS: PickerOption[] = [
  { value: "e1a.png", label: "e1a", thumbUrl: "/eyes/e1a.png" },
  { value: "e2b.png", label: "e2b", thumbUrl: "/eyes/e2b.png" },
  { value: "e3c.png", label: "e3c", thumbUrl: "/eyes/e3c.png" },
];

describe("PartPicker", () => {
  it("shows the current selection and opens a grid of all options", async () => {
    const user = userEvent.setup();
    render(<PartPicker label="Eyes" value="e2b.png" options={OPTS} onChange={() => {}} />);

    // Current value is shown in the header.
    expect(screen.getByText("e2b")).toBeInTheDocument();
    // Grid is closed until the trigger is clicked.
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));

    const listbox = screen.getByRole("listbox", { name: "Eyes" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
    // The current value is marked selected.
    expect(within(listbox).getByRole("option", { selected: true })).toHaveAttribute(
      "title",
      "e2b",
    );
  });

  it("fires onChange with the picked value and closes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PartPicker label="Eyes" value="e1a.png" options={OPTS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByRole("option", { name: "e3c" }));

    expect(onChange).toHaveBeenCalledWith("e3c.png");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

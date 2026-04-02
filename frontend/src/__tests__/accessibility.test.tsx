/**
 * ADA/WCAG Accessibility Tests for UI Components
 * Tests for WCAG 2.1 AA compliance using jest-axe
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import StatsCard from "@/components/ui/StatsCard";
import Avatar from "@/components/ui/Avatar";

expect.extend(toHaveNoViolations);

describe("ADA Accessibility - StatsCard", () => {
  it("should have no accessibility violations", async () => {
    const { container } = render(
      <StatsCard title="Total Employees" value={42} icon="users" color="blue" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no violations with trend indicator", async () => {
    const { container } = render(
      <StatsCard
        title="On Leave Today"
        value={5}
        icon="calendar"
        color="yellow"
        subtitle="2 pending approval"
        trend={{ value: "12%", up: true }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should render title as readable text", () => {
    const { getByText } = render(
      <StatsCard title="Pending Approvals" value={8} icon="check" color="red" />
    );
    expect(getByText("Pending Approvals")).toBeInTheDocument();
    expect(getByText("8")).toBeInTheDocument();
  });
});

describe("ADA Accessibility - Avatar", () => {
  it("should have no accessibility violations with image", async () => {
    const { container } = render(
      <Avatar firstName="John" lastName="Doe" photoUrl="/uploads/photo.jpg" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations with initials", async () => {
    const { container } = render(
      <Avatar firstName="Jane" lastName="Smith" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should display correct alt text for images", () => {
    const { getByAltText } = render(
      <Avatar firstName="John" lastName="Doe" photoUrl="/uploads/photo.jpg" />
    );
    expect(getByAltText("John Doe")).toBeInTheDocument();
  });

  it("should display initials when no photo", () => {
    const { getByText } = render(
      <Avatar firstName="Alice" lastName="Brown" />
    );
    expect(getByText("AB")).toBeInTheDocument();
  });

  it("should handle empty names gracefully", () => {
    const { container } = render(
      <Avatar firstName="" lastName="" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("should render all size variants without violations", async () => {
    const sizes = ["sm", "md", "lg", "xl"] as const;
    for (const size of sizes) {
      const { container } = render(
        <Avatar firstName="Test" lastName="User" size={size} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });
});

describe("ADA Color Contrast - StatsCard", () => {
  const colors = ["blue", "green", "yellow", "red", "purple", "indigo"] as const;

  colors.forEach((color) => {
    it(`should have no violations for ${color} variant`, async () => {
      const { container } = render(
        <StatsCard title={`${color} card`} value={10} color={color} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe("ADA Semantic Structure", () => {
  it("StatsCard should use semantic text hierarchy", () => {
    const { container } = render(
      <StatsCard title="Test" value={100} subtitle="Details here" />
    );
    // Should have readable text elements, not empty divs
    const textElements = container.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6");
    expect(textElements.length).toBeGreaterThan(0);
  });

  it("Avatar image should have meaningful alt text", () => {
    const { getByRole } = render(
      <Avatar firstName="Sarah" lastName="Connor" photoUrl="/test.jpg" />
    );
    const img = getByRole("img");
    expect(img).toHaveAttribute("alt", "Sarah Connor");
  });
});

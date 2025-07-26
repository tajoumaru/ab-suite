import { useEffect } from "preact/hooks";
import abSuiteLogo from "@/assets/absuite.svg?raw";
import { log } from "@/lib/utils/logging";

export function LogoReplacement() {
  useEffect(() => {
    // Always replace the logo - no setting check needed
    const logoLink = document.querySelector("#logo a") as HTMLAnchorElement;
    if (!logoLink) {
      log("Logo link not found");
      return;
    }

    try {
      // Parse the SVG content
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(abSuiteLogo, "image/svg+xml");
      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

      // Apply proper dimensions
      // svgElement.setAttribute("width", "200");
      // svgElement.setAttribute("height", "23");
      svgElement.style.display = "block";

      // Apply colors to the paths based on their classes
      const leftPath = svgElement.querySelector(".absuite-logo-left") as SVGPathElement;
      const rightPath = svgElement.querySelector(".absuite-logo-right") as SVGPathElement;

      if (leftPath) {
        leftPath.style.fill = "#fff";
      }

      if (rightPath) {
        rightPath.style.fill = "#ed106a";
      }

      // Clear the link content and replace with SVG
      logoLink.innerHTML = "";
      logoLink.appendChild(svgElement);

      // Remove any background styling
      logoLink.style.background = "none";
      logoLink.style.textIndent = "0";

      // Add hover effect
      logoLink.addEventListener("mouseenter", () => {
        svgElement.style.opacity = "0.85";
      });

      logoLink.addEventListener("mouseleave", () => {
        svgElement.style.opacity = "1";
      });

      log("Logo replaced successfully");
    } catch (error) {
      log("Error replacing logo:", error);
    }
  }, []);

  return null;
}

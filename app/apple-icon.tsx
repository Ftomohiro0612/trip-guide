import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #38bdf8 0%, #22d3ee 50%, #34d399 100%)",
          fontSize: 110,
        }}
      >
        🎈
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const alt = "AI Graveyard pixel cemetery";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(180deg, #162552 0%, #20205a 46%, #62384d 72%, #143a25 100%)",
          color: "#fff7d6",
          fontFamily: "monospace",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                alignSelf: "flex-start",
                background: "#44d17a",
                border: "8px solid #2f2347",
                boxShadow: "10px 10px 0 #15142f",
                color: "#102719",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 0,
                padding: "12px 18px",
                textTransform: "uppercase",
              }}
            >
              Open-source remains
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "#fff7d6",
                fontSize: 108,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 0.9,
                textTransform: "uppercase",
                textShadow: "8px 0 #ff7f61, 0 8px #2f2347, 8px 8px #15142f",
              }}
            >
              <span>AI</span>
              <span>Graveyard</span>
            </div>
          </div>
          <div
            style={{
              width: 132,
              height: 132,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffcf4a",
              border: "8px solid #fff7d6",
              boxShadow: "14px 14px 0 #bd7f2d",
              color: "#6d4a1f",
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            GH
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "flex-end",
          }}
        >
          {["bi-le-ma", "persona-guide", "design-vibes", "ai-interview"].map(
            (name, index) => (
              <div
                key={name}
                style={{
                  width: index === 1 ? 170 : 150,
                  height: index === 1 ? 194 : 166,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  background:
                    "linear-gradient(180deg, #ded9c4 0%, #aaa392 56%, #6f6a72 100%)",
                  border: "8px solid #2f2347",
                  boxShadow: "10px 10px 0 #15142f",
                  color: "#251f21",
                  padding: "22px 12px",
                }}
              >
                <div
                  style={{
                    background: index === 1 ? "#44d17a" : "#a5e4ff",
                    border: "4px solid #2f2347",
                    fontSize: 16,
                    fontWeight: 900,
                    marginBottom: 18,
                    padding: "4px 12px",
                  }}
                >
                  RIP
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  {name}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}

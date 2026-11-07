import { config } from "@remotion/eslint-config-flat";

export default [
  {
    ignores: [
      "server.mjs",
      "render.mjs",
      "whisper-config.mjs",
      "scripts/**",
      "web/**",
      ".agents/**",
      "tools/**",
      "whisper.cpp/**",
      "public/**",
      "products/**",
      "out/**",
    ],
  },
  ...config,
];


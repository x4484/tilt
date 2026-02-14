import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [base],
    transports: {
      [base.id]: http(
        import.meta.env.VITE_ALCHEMY_RPC_URL ||
          "https://mainnet.base.org",
      ),
    },
    walletConnectProjectId:
      import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "TILT",
    appDescription:
      "Bonding curve game on Base. Choose Up Only or Down Only.",
    appUrl: "https://tiltgame.fun",
    appIcon: "https://tiltgame.fun/tilt.png",
  }),
);

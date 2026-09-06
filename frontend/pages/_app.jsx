import "../styles/globals.css";
import { RoleModeProvider } from "../lib/useRoleMode";

export default function App({ Component, pageProps }) {
  return (
    <RoleModeProvider>
      <Component {...pageProps} />
    </RoleModeProvider>
  );
}

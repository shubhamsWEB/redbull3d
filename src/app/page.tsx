import TheCan from "@/slices/TheCan";
import FiveWorlds from "@/slices/FiveWorlds";
import Landing, { Ticker } from "@/slices/Landing";

export default function Home() {
  return (
    <>
      <TheCan />
      <FiveWorlds />
      <Ticker />
      <Landing />
    </>
  );
}

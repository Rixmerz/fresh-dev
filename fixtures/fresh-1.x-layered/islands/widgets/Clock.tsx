import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

// Island in a subdirectory. 1.x name: sanitizeIslandName("widgets/Clock") →
// "Widgets_Clock"; id "widgets_clock_default".
export default function Clock({ tz }: { tz: string }) {
  const now = useSignal("");
  useEffect(() => {
    const tick = () => {
      now.value = new Date().toLocaleTimeString("en-US", { timeZone: tz });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tz]);
  return <span class="clock">{now}</span>;
}

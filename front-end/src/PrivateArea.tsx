import { CallProvider } from "@/call/CallProvider";
import AppLayout from "@/components/layout/AppLayout";
import { AppLock } from "@/components/layout/AppLock";
import { RequireRoom } from "@/components/layout/RequireRoom";
import { SpaceProvider } from "@/context/SpaceProvider";
import { MusicProvider } from "@/music/MusicProvider";

/**
 * The private part of the app: only reachable once this phone is in a room.
 * It's its own download, so the welcome page opens fast for visitors.
 */
const PrivateArea = () => (
  <RequireRoom>
    <SpaceProvider>
      <AppLock>
        <CallProvider>
          <MusicProvider>
            <AppLayout />
          </MusicProvider>
        </CallProvider>
      </AppLock>
    </SpaceProvider>
  </RequireRoom>
);

export default PrivateArea;

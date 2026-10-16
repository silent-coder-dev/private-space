import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRoom } from "@/context/room";

/** The rooms are private: no room on this device → go to the create / join page. */
export function RequireRoom({ children }: { children: ReactNode }) {
  const { session, problem, leaveRoom } = useRoom();
  if (!session) return <Navigate to="/start" replace />;

  return (
    <>
      {children}
      <AlertDialog open={!!problem}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This room can't be opened here any more</AlertDialogTitle>
            <AlertDialogDescription>
              {problem?.message} You can leave it on this device and create or join a room again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={leaveRoom} className="bg-destructive hover:bg-destructive/90">
              Leave and start again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

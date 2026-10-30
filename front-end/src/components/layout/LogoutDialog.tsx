import { Check, Copy, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRoom } from "@/context/room";
import { useSpace } from "@/context/space";

/**
 * Log out of this phone: this phone's copy is deleted and its seat is freed.
 * The room stays for your partner, and you can come back with the secret code (shown here to save first).
 */
export function LogoutDialog() {
  const { logoutOpen, setLogoutOpen, profile } = useSpace();
  const { session, leaveRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const code = session?.code ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the code.");
    }
  };

  return (
    <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" /> Log out of this phone?
          </AlertDialogTitle>
          <AlertDialogDescription>
            UsSpace is removed from this phone. {profile.partner} keeps everything, and your seat stays free for you. To come back, open UsSpace and join with your
            secret code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold text-muted-foreground">Save your secret code first</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg bg-background/60 px-3 py-2 font-mono text-sm tracking-widest">{code}</code>
            <button type="button" onClick={() => void copy()} aria-label="Copy code" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={leaveRoom} className="bg-destructive hover:bg-destructive/90">
            <LogOut className="h-4 w-4" /> Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

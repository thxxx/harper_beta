"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import AuthModal from "./AuthModal";

export default function LoginButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (email) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{email}</span>
        <button
          onClick={signOut}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-opp hover:bg-xmain"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-opp hover:bg-xmain"
      >
        Try for free
      </button>
      <AuthModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

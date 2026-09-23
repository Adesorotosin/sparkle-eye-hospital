"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId =
    searchParams.get("patientId") ?? searchParams.get("patientCode");

  useEffect(() => {
    if (patientId) {
      router.replace(`/billing?patientId=${encodeURIComponent(patientId)}`);
      return;
    }

    router.replace("/cashier");
  }, [patientId, router]);

  return (
    <div className="min-h-screen bg-[#F3F0F7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto border-2 border-[#5E35B1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Opening patient billing...
        </p>
      </div>
    </div>
  );
}

export default function CashierCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F0F7] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto border-2 border-[#5E35B1] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Opening patient billing...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutRedirect />
    </Suspense>
  );
}
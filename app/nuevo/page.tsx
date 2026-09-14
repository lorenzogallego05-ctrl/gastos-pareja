import { Suspense } from "react";
import NuevoForm from "./NuevoForm";

export default function NuevoPage() {
  return (
    <Suspense fallback={null}>
      <NuevoForm />
    </Suspense>
  );
}

import { Suspense } from "react";
import EditQuestDraftClient from "./EditQuestDraftClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-full px-8 py-6">
          <div className="h-full bg-white rounded-xl shadow-md px-8 py-6 flex items-center justify-center text-xs text-gray-500">
            クエスト案を読み込んでいます…
          </div>
        </div>
      }
    >
      <EditQuestDraftClient />
    </Suspense>
  );
}

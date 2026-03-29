import React from "react";
import { RefreshCw } from "lucide-react";

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <RefreshCw size={24} className="text-orange-400 animate-spin" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

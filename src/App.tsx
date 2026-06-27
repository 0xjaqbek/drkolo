import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Cennik from "./pages/Cennik.tsx";
import NotFound from "./pages/NotFound.tsx";
import { ChatWidget } from "./components/ChatWidget.tsx";
import { usePageView } from "./hooks/usePageView.ts";

// Lazy-loaded routes (admin + low-traffic pages)
const Rezerwacja = lazy(() => import("./pages/Rezerwacja.tsx"));
const CreateZlecenie = lazy(() => import("./pages/CreateZlecenie.tsx"));
const ZlecenieView = lazy(() => import("./pages/ZlecenieView.tsx"));
const KalendarzAdmin = lazy(() => import("./pages/KalendarzAdmin.tsx"));
const ChatAdmin = lazy(() => import("./pages/ChatAdmin.tsx"));
const Kwestionariusz = lazy(() => import("./pages/Kwestionariusz.tsx"));
const KwestionariuszOdp = lazy(() => import("./pages/KwestionariuszOdp.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const PolitykaPrywatnosci = lazy(() => import("./pages/PolitykaPrywatnosci.tsx"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  usePageView();
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/cennik" element={<Cennik />} />
        <Route path="/zlecenie" element={<CreateZlecenie />} />
        <Route path="/zlecenie/:hash" element={<ZlecenieView />} />
        <Route path="/rezerwacja" element={<Rezerwacja />} />
        <Route path="/kalendarz" element={<KalendarzAdmin />} />
        <Route path="/chat-admin" element={<ChatAdmin />} />
        <Route path="/kwestionariusz" element={<Kwestionariusz />} />
        <Route path="/kwestionariusz-odp" element={<KwestionariuszOdp />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
        <ChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
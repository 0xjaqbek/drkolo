import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Cennik from "./pages/Cennik.tsx";
import CreateZlecenie from "./pages/CreateZlecenie.tsx";
import ZlecenieView from "./pages/ZlecenieView.tsx";
import NotFound from "./pages/NotFound.tsx";
import Rezerwacja from "./pages/Rezerwacja.tsx";
import KalendarzAdmin from "./pages/KalendarzAdmin.tsx";
import ChatAdmin from "./pages/ChatAdmin.tsx";
import Kwestionariusz from "./pages/Kwestionariusz.tsx";
import KwestionariuszOdp from "./pages/KwestionariuszOdp.tsx";
import Analytics from "./pages/Analytics.tsx";
import { ChatWidget } from "./components/ChatWidget.tsx";
import { usePageView } from "./hooks/usePageView.ts";

const queryClient = new QueryClient();

const AppRoutes = () => {
  usePageView();
  return (
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
      <Route path="*" element={<NotFound />} />
    </Routes>
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
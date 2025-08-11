import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";

/** Base API fiable (prod + dev) */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000/api"
    : "https://pasteur-medicheck-backend.onrender.com/api");

/** Helper: récupère et garantit du JSON (messages d’erreur clairs) */
async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  // On lit toujours le texte d’abord pour diagnostiquer facilement
  const raw = await res.text();

  if (!res.ok) {
    try {
      const parsed = JSON.parse(raw);
      const msg = typeof parsed === "object" && parsed?.error ? parsed.error : raw;
      throw new Error(`API ${res.status}: ${String(msg).slice(0, 300)}`);
    } catch {
      throw new Error(`API ${res.status}: ${raw.slice(0, 300)}`);
    }
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Réponse non-JSON depuis l'API (${url}). Début reçu: ${raw.slice(0, 80)}`
    );
  }
}

const ToxicityAnalysis = () => {
  const navigate = useNavigate();
  const [drugName, setDrugName] = useState("");
  const [toxicity, setToxicity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkToxicity = async () => {
    if (!drugName.trim()) return;

    setIsLoading(true);
    setError(null);
    setToxicity(null);

    const url = `${API_BASE}/toxicite/`; // <- API absolue (barre finale incluse)

    try {
      const json = await postJSON(url, { name: drugName.trim() });
      setToxicity(json?.toxicite || "Non disponible");
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l’analyse.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") checkToxicity();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pasteur-bg/20 via-pasteur-bg/10 to-pasteur-mint/5">
      <Header />

      <main className="max-w-3xl mx-auto p-6">
        <div className="mb-8 animate-fade-in">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="group border-pasteur-neutral/20 hover:border-pasteur-mint/40 hover:bg-white/80 text-pasteur-text rounded-xl px-6 py-3 transition-all duration-300 hover:shadow-lg backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Retour à l'accueil
          </Button>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-pasteur-neutral/15 p-10 animate-slide-up space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-pasteur-text mb-2 bg-gradient-to-r from-pasteur-dark to-pasteur-text bg-clip-text text-transparent">
              Analyse de toxicité moléculaire
            </h1>
            <p className="text-pasteur-text/70 text-lg">
              Entrez un nom de médicament (DCI ou INN) pour évaluer sa toxicité
            </p>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Abacavir"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pasteur-mint/60 text-pasteur-text shadow-sm"
            />
            <Button
              onClick={checkToxicity}
              disabled={isLoading || !drugName.trim()}
              className="px-6 py-3 rounded-lg text-white bg-pasteur-mint hover:bg-pasteur-mint/90 text-base"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Analyser"}
            </Button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50/80 animate-fade-in">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {toxicity && (
            <Card className="p-6 bg-white shadow-lg rounded-xl text-center animate-fade-in">
              <p className="text-xl text-pasteur-text mb-2 font-semibold">Toxicité mesurée :</p>
              <p className="text-5xl font-bold text-pasteur-mint">{toxicity}</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ToxicityAnalysis;


import React, { useState } from "react";
import { Search, Loader2, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from "jspdf";

interface MedicamentData {
  [key: string]: string;
}

/** Base API fiable (prod + dev) */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000/api"
    : "https://pasteur-medicheck-backend.onrender.com/api");

/** Helper pour récupérer et garantir du JSON (messages d’erreur clairs) */
async function getJSON(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const raw = await res.text(); // on lit toujours le texte d’abord pour debugger facilement

  if (!res.ok) {
    // Erreur côté API avec éventuel message JSON lisible
    try {
      const parsed = JSON.parse(raw);
      const msg = typeof parsed === "object" && parsed?.error ? parsed.error : raw;
      throw new Error(`API ${res.status}: ${String(msg).slice(0, 300)}`);
    } catch {
      throw new Error(`API ${res.status}: ${raw.slice(0, 300)}`);
    }
  }

  // Parfois un HTML (index.html) peut revenir si mauvaise URL ⇒ protège le parse
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Réponse non-JSON depuis l'API (${url}). Début reçu: ${raw.slice(0, 80)}`
    );
  }
}

export const ReportGenerator = () => {
  const [drugName, setDrugName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<MedicamentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!drugName.trim()) return;

    setIsGenerating(true);
    setError(null);
    setData(null);

    const url = `${API_BASE}/medicaments/${encodeURIComponent(drugName)}/`; // <- barre finale requise

    try {
      const json = await getJSON(url);
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la récupération des données.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!data) return;

    const doc = new jsPDF();
    const title = `Notice du médicament : ${data.DCI || data.INN || drugName}`;
    const fileName = `notice-${(data.DCI || data.INN || drugName).toLowerCase()}.pdf`;

    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré automatiquement par Pasteur AI`, 20, y);
    y += 10;

    const entries = Object.entries(data).filter(
      ([key, value]) =>
        value &&
        value !== "" &&
        key.toLowerCase() !== "structureimagepath" &&
        key.toLowerCase() !== "structure_image_url"
    );

    let leftY = y;
    let rightY = y;
    const leftX = 20;
    const rightX = 110;

    doc.setFontSize(11);

    entries.forEach(([key, value], index) => {
      const label = key
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const text = `${label} : ${value}`;

      const lines = doc.splitTextToSize(text, 80);
      const isLeft = index % 2 === 0;
      const currentX = isLeft ? leftX : rightX;
      const currentY = isLeft ? leftY : rightY;

      doc.text(lines, currentX, currentY);

      if (isLeft) {
        leftY += lines.length * 5 + 5;
      } else {
        rightY += lines.length * 5 + 5;
      }
    });

    doc.save(fileName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") generateReport();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom du médicament (DCI ou INN)"
        />
        <Button onClick={generateReport} disabled={isGenerating || !drugName.trim()}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h4 className="text-xl font-bold">{data.DCI || data.INN}</h4>
              <p className="text-muted-foreground text-sm">Notice automatisée</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" /> Télécharger
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(data).map(([key, value]) =>
              key.toLowerCase() !== "structureimagepath" &&
              key.toLowerCase() !== "structure_image_url" &&
              value ? (
                <div key={key}>
                  <h5 className="font-semibold text-sm text-muted-foreground">
                    {key.replaceAll("_", " ")}
                  </h5>
                  <p className="text-sm text-pasteur-text/80 leading-relaxed whitespace-pre-line">
                    {value}
                  </p>
                </div>
              ) : null
            )}
          </div>
        </Card>
      )}
    </div>
  );
};


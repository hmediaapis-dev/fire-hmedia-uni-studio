import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function TestGetTenantInvoices() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔧 Replace with Dave Herndon's tenantId
  const tenantId = "SwV4EMnZR2fBrZ5ihdRr";

  // Example date range
  const startDate = "2024-01-01";
  const endDate = "2025-12-31";

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const functions = getFunctions();
      // If using emulator:
      // connectFunctionsEmulator(functions, "localhost", 5001);

      const getTenantInvoices = httpsCallable(
        functions,
        "getTenantInvoices"
      );

      const response = await getTenantInvoices({
        tenantId,
        startDate,
        endDate,
        limit: 10,
        lastDocId: null,
      });

      console.log("getTenantInvoices response:", response.data);
      setResult(response.data);

    } catch (err: any) {
      console.error("Callable error:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Test: getTenantInvoices</h2>
      <p><strong>Tenant:</strong> Dave Herndon</p>

      <button onClick={runTest} disabled={loading}>
        {loading ? "Loading…" : "Run Test"}
      </button>

      {error && (
        <pre style={{ color: "red", marginTop: 16 }}>
          {error}
        </pre>
      )}

      {result && (
        <pre style={{ marginTop: 16 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

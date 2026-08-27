function getApiBaseUrl() {
  return process.env.WNPM_API_URL || "https://wnpm-server-production.up.railway.app";
}

async function auditPackages(packages) {
  const url = `${getApiBaseUrl()}/api/audit/packages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packages }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (!res.ok) {
    throw new Error(json.message || `API ${res.status}: ${text}`);
  }
  return json.data;
}

module.exports = { auditPackages, getApiBaseUrl };

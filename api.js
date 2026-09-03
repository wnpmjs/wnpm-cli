function getApiBaseUrl() {
  return process.env.WNPM_API_URL || "https://wnpm-server-production.up.railway.app";
}

function getDashboardBaseUrl() {
  return process.env.WNPM_DASHBOARD_URL || "https://console.wnpmjs.com";
}

async function auditPackages(packages, accessToken) {
  const url = `${getApiBaseUrl()}/api/audit/packages`;
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
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

async function getUsage(accessToken) {
  const url = `${getApiBaseUrl()}/api/usage`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
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

module.exports = { auditPackages, getUsage, getApiBaseUrl, getDashboardBaseUrl };

interface HttpConfig {
  apiKey: string;
  host: string;
  baseURL: string;
}

function createHttpConfig(apiKey: string, host: string): HttpConfig {
  return {
    apiKey,
    host,
    baseURL: `https://${host}`,
  };
}

export async function httpGet<T>(
  config: HttpConfig,
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const queryString = params 
    ? new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString() 
    : '';
  const fullUrl = queryString ? `${config.baseURL}${url}?${queryString}` : `${config.baseURL}${url}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': config.apiKey,
      'x-rapidapi-host': config.host,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as T & { error?: string };
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function httpPost<T>(
  config: HttpConfig,
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const fullUrl = `${config.baseURL}${url}`;

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': config.apiKey,
      'x-rapidapi-host': config.host,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export { createHttpConfig };

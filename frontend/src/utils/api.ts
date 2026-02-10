/**
 * Utilitário centralizado para chamadas de API com autenticação
 */

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('agrofocus_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  }
  
  try {
    const res = await fetch(url, { ...options, headers })
    const data = await res.json()
    return data
  } catch (err) {
    console.error(`Erro na requisição ${url}:`, err)
    throw err
  }
}

export const apiGet = async (url: string): Promise<any> => {
  return apiFetch(url, { method: 'GET' })
}

export const apiPost = async (url: string, body: any): Promise<any> => {
  return apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export const apiPut = async (url: string, body: any): Promise<any> => {
  return apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

export const apiDelete = async (url: string): Promise<any> => {
  return apiFetch(url, { method: 'DELETE' })
}

/**
 * Garante que o dado é um array, mesmo se a API retornar erro ou objeto
 */
export const ensureArray = (data: any, key?: string): any[] => {
  if (Array.isArray(data)) return data
  if (key && data && Array.isArray(data[key])) return data[key]
  return []
}

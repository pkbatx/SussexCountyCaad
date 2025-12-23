import { useCallback, useRef } from "react";
import { DETAIL_CACHE_MS } from "../config";
import { getCallDetail, getIncidentDetail } from "../api";

export function useDetailCache() {
  const callCacheRef = useRef(new Map());
  const incidentCacheRef = useRef(new Map());

  const getCachedCall = useCallback(async (callId) => {
    const cached = callCacheRef.current.get(callId);
    if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_MS) {
      return cached.data;
    }
    const data = await getCallDetail(callId);
    callCacheRef.current.set(callId, { data, fetchedAt: Date.now() });
    return data;
  }, []);

  const getCachedIncident = useCallback(async (incidentId) => {
    const cached = incidentCacheRef.current.get(incidentId);
    if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_MS) {
      return cached.data;
    }
    const data = await getIncidentDetail(incidentId);
    incidentCacheRef.current.set(incidentId, { data, fetchedAt: Date.now() });
    return data;
  }, []);

  const invalidateCall = useCallback((callId) => {
    callCacheRef.current.delete(callId);
  }, []);

  const invalidateIncident = useCallback((incidentId) => {
    incidentCacheRef.current.delete(incidentId);
  }, []);

  const clearAll = useCallback(() => {
    callCacheRef.current.clear();
    incidentCacheRef.current.clear();
  }, []);

  return {
    getCachedCall,
    getCachedIncident,
    invalidateCall,
    invalidateIncident,
    clearAll
  };
}
